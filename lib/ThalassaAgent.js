var assert = require('assert')
  , Thalassa = require('thalassa')
  , pkg = require('../package.json')
  , shoe = require('shoe')
  , crdt = require('crdt')
  , MuxDemux = require('mux-demux')
  , EventEmitter  = require('events').EventEmitter
  , util = require('util')
  ;

global.WebSocket = require('ws');
var websocket = require('websocket-stream')

var ThalassaAgent = module.exports = function ThalassaAgent (opts) {
  if (typeof opts !== 'object') opts = {};

  assert(opts.host, 'opts.host must be passed!');
  assert(opts.port, 'opts.port must be passed!');
  this.log = (typeof opts.log === 'function') ? opts.log : function (){};

  var client = this.client = new Thalassa.Client(opts);
  client.connect();

  client.on('register', this.handleThalassaRegister.bind(this));
  client.on('free', this.handleThalassaFree.bind(this));

  this.docs = {};
  this._streams = {};
  this._muxes = [];
};

util.inherits(ThalassaAgent, EventEmitter);


ThalassaAgent.prototype.handleThalassaRegister = function (service) {
  var self = this;
  var role = service.role, version = service.version, name = service.host + ':' + service.port;

  if (role === 'thalassa-aqueduct') {
    self.log('debug', 'aqueduct server REGISTERED', service);

    var stream = self._streams[name] = new websocket('ws://'+name+'/readstream');
    var doc = new crdt.Doc();
    // just hack on doc.service for now
    doc.service = service;
    self.docs[name] = doc;
    stream.pipe(doc.createStream()).pipe(stream);

    this._muxes.forEach(function (mx) {
      var s = doc.createStream();
      s.pipe(mx.createStream({ type: 'aqueduct', id: doc.id, service: doc.service })).pipe(s); 
    });

    stream.once('end', function () {
      delete self._streams[name];
    });

    stream.on('error', function (err) { 
      self.log('error', 'error from aqueduct connection ' + name + ': ' + err.message);
      self._streams[name].destroy();
    });

    stream.on('connect', function () { self.log('debug', 'connected!!!'); });
  }
};

ThalassaAgent.prototype.handleThalassaFree = function (service) {
  var self = this;
  var role = service.role, version = service.version, name = service.host + ':' + service.port;

  if (role === 'thalassa-aqueduct') {
    self.log('debug', 'aqueduct server FREED', service);
    var doc = self.docs[name];
    if (doc) {
      doc.dispose();
      doc.removeAllListeners();
      delete self.docs[name];
    }
  }

};

ThalassaAgent.prototype.createReadableMuxStream = function() {
  var self = this;
  var mx = new MuxDemux();
  self._muxes.push(mx);
  Object.keys(self.docs).forEach(function (name) {
    var doc = self.docs[name];
    var mxs = mx.createStream({ id: doc.id, type: 'aqueduct', service: doc.service });
    var stream = doc.createStream();
    mxs.pipe(stream).pipe(mxs);
  });

  // seaport crdt
  var seaportStream = self.client.seaport.doc.createStream();
  var mxs = mx.createStream({ type: 'thalassa' });
  mxs.pipe(seaportStream).pipe(mxs);

  return mx;
};

