var assert = require('assert')
  , f = require('util').format
  , Thalassa = require('thalassa')
  , pkg = require('../package.json')
  , shoe = require('shoe')
  , crdt = require('crdt')
  , MuxDemux = require('mux-demux')
  , split = require('split')
  , EventEmitter  = require('events').EventEmitter
  , util = require('util')
  ;

global.WebSocket = require('ws');
var websocket = require('websocket-stream')

var ThalassaAgent = module.exports = function ThalassaAgent (opts) {
  var self = this;
  if (typeof opts !== 'object') opts = {};

  assert(opts.host, 'opts.host must be passed!');
  assert(opts.port, 'opts.port must be passed!');
  assert(opts.apiport,  'opts.apiport must be passed!');
  this.log = (typeof opts.log === 'function') ? opts.log : function (){};

  var client = this.client = new Thalassa.Client(opts);
  this.log('debug', f('connecting to Thalassa server %s:%s', opts.host, opts.port));
  client.start();

  client.on('online', this.handleThalassaOnline.bind(this));
  client.on('offline', this.handleThalassaOffline.bind(this));
  client.subscribe();

  client.getRegistrations(function (err, regs) {
    if (err) {
      self.log('error', 'Thalassa.getRegistrations', err);
    }
    else {
      regs.forEach(self.handleThalassaOnline.bind(self));
    }
  });

  this.aqueductDocs = {};
  this.serviceDoc = new crdt.Doc();
  this.servicesSet = this.serviceDoc.createSet('type', 'service');
  this._streams = {};
  this._clientMuxes = [];
};

util.inherits(ThalassaAgent, EventEmitter);


ThalassaAgent.prototype.handleThalassaOnline = function (service) {
  var self = this;

  self.log('debug', 'ONLINE', service.id);

  //
  // Prevent deplicate activity from getting recorded. If Thalassa starts and stops it will publish
  // all known online instances currently. So if we already know it's online, don't add deplicate activity
  //
  if (!self.servicesSet.has(service.id)) {
    self.serviceDoc.add({ type: 'activity',  time: Date.now(), verb: 'online', object: service.id });
  }

  self.serviceDoc.add({ id: service.id, type: 'service', service: service});

  if (service.id.indexOf('/thalassa-aqueduct/') === 0) {
    self.log('debug', 'aqueduct server ONLINE', service);
    self._connectToAqueduct(service);
  }
};

ThalassaAgent.prototype._connectToAqueduct = function(service) {
  var self = this;

  // in case the service registration has gone offline
  if (!self.servicesSet.has(service.id)) return;

  var stream = self._streams[service.id] = new websocket(util.format('ws://%s:%s/readstream', service.host, service.port));

  stream.on('end', function () {
    mx.destroy();
    // if the reference to the stream still exists, try to reconnect
    // otherwise it was removed because the service was unregistered
    if (self._streams[service.id]) self._connectToAqueduct(service);
  });
  stream.on('error', function () {
    mx.destroy()
  });

  var doc = new crdt.Doc();
  // just hack on doc.service for now
  doc.service = service;
  self.aqueductDocs[service.id] = doc;

  var mx = new MuxDemux(function (s) {
    if (s.meta.type === 'config') {
      s.pipe(doc.createStream()).pipe(s);
      //s.on('data', console.log.bind(console))
      s.on('error', function () { s.destroy(); });
    }
    else if(s.meta.type === 'stat') {
      s.pipe(split())
      .on('data', function (line) {
        try {
          var stat = JSON.parse(line);
          // tack on the aqueduct host Id because we'll use it to filter
          stat.hostId = service.id;
          self.emit('stat', stat);
        } catch(err) {
          self.log('error', 'error parsing stat from stream ' + line, String(err))
        };
      })
      .on('error', function () { s.destroy(); });
    }
    else {
      self.log('error', 'ignored aqueduct stream ', s.meta);
    }
  });

  stream.pipe(mx).pipe(stream);
  mx.on('error', function () {
    stream.destroy();
  })

  for (id in this._clientMuxes) {
    var s = doc.createStream();
    var cx = this._clientMuxes[id];
    s.pipe(cx.createStream({ type: 'aqueduct', id: doc.id, service: doc.service })).pipe(s); 
  };

  stream.once('end', function () {
    mx.destroy();
    delete self._streams[service.id];
  });

  stream.on('error', function (err) {
    self.log('error', 'error from aqueduct connection ' + service.id + ': ' + err.message);
    if (self._streams[service.id]) self._streams[service.id].destroy();
    mx.destroy();

    // try to reconnect
    setTimeout(function () {
      self._connectToAqueduct(service);
    }, 2000);
  });

  stream.on('connect', function () { self.log('debug', service.id + ' connected!!!'); });
};

ThalassaAgent.prototype.handleThalassaOffline = function (id) {
  var self = this;

  self.serviceDoc.rm(id);
  self.serviceDoc.add({ type: 'activity', time: Date.now(), verb: 'offline', object: id });

  self.log('debug', 'OFFLINE', id);
  if (id.indexOf('/thalassa-aqueduct/') === 0) {
    self.log('debug', 'aqueduct server OFFLINE', id);
    var doc = self.aqueductDocs[id];
    if (doc) {
      doc.dispose();
      doc.removeAllListeners();
      delete self.aqueductDocs[id];
    }
    var stream = self._streams[id];
    if (stream) {
      // delete the referenc to the stream first so we'll know it was explicitely disconnected
      delete self._streams[id];
      stream.destroy();
    }
  }

};

ThalassaAgent.prototype.createReadableMuxStream = function() {
  var self = this;
  var mx = new MuxDemux();
  var id = Date.now() + String(Math.ceil(Math.random()*9999999));

  self._clientMuxes[id] = mx;
  Object.keys(self.aqueductDocs).forEach(function (id) {
    var doc = self.aqueductDocs[id];
    var mxs = mx.createStream({ id: doc.id, type: 'aqueduct', service: doc.service });
    var stream = doc.createStream();
    mxs.pipe(stream).pipe(mxs);
  });

  mx.on('close', function () {
    delete self._clientMuxes[id];
  })

  // services crdt
  var serviceStream = self.serviceDoc.createStream({writable: false, sendClock: true});
  var mxs = mx.createStream({ type: 'thalassa' });
  serviceStream.pipe(mxs).pipe(serviceStream);

  return mx;
};

