var assert = require('assert')
  , ThalassaAgent = require('./lib/ThalassaAgent')
  , Db = require('./lib/Db')
  , aqueductClient = require('./lib/aqueductClient')
  , MuxDemux = require('mux-demux')
  , through = require('through')
  , pkg = require('./package.json')
  , split = require('split')
  ;


var Crowsnest = module.exports = function Crowsnest (opts) {
  var self = this;
  if (typeof opts !== 'object') opts = {};
  this.log = (typeof opts.log === 'function') ? opts.log : function (){};

  this.thalassa = new ThalassaAgent({
    host: opts.thalassaHost,
    port: opts.thalassaPort,
    apiport: opts.thalassaApiPort,
    log: opts.log
  });

  this.thalassa.client.register(pkg.name, pkg.version, opts.port);
  // TODO make client.register return the registration instead of this hack that blows encapsulation
  self.me = this.thalassa.client.intents[0];

  //
  // Stream stats into a leveldb
  // TODO add optional statsd emitter
  //
  this.db = new Db(opts, function () {
    self.db.writeActivity({ type: 'activity',  time: Date.now(), verb: 'started', object: self.me.id })
  });;
  this.thalassa.on('stat', this.db.writeStat.bind(this.db));
  this.thalassa.on('activity', this.db.writeActivity.bind(this.db));

  //
  // Create a new MuxDemux stream for each browser client.
  //
  this.createMuxStream = function () {
    var mx = this.thalassa.createReadableMuxStream();

    //
    // Used to keep track of this clients stats subscriptions
    //
    var statSubscriptions = {};

    //
    // wire up a control stream to receive messages from the client
    //
    var controlStream = mx.createStream({ type: 'control' });
    controlStream.pipe(split()).on('data', function (line) {
      try {
        var msg = JSON.parse(line);
        if (msg[0] === 'statSubscribe') {
          statSubscriptions[msg[1]] = true;
          sendStatsForHostId(msg[1]);
        }
        else if (msg[0] === 'statUnsubscribe') {
          delete statSubscriptions[msg[1]];
        }
        else if (msg[0] === 'updateAqueductBackendVersion') {
          console.log(msg);
          var p = msg[1].split('/');
          var host = p[3], port = p[4], key = msg[2], version = msg[3];
          aqueductClient.setVersion(host, port, key, version, function (err) {
            if (err)  self.log('error', 'setting aqueduct version ' + msg, String(err));
          });
        }
      } catch(err) {
        self.log('error', 'error parsing controlStream message ' + line, String(err));
      }
    });

    //
    // wire up a stats stream to send realtime aqueduct stats to the client
    //
    var statStream = mx.createWriteStream({ type: 'stat' });
    var statWriteListener = function (stat) {
      if (statSubscriptions[stat.hostId]) {
        statStream.write(stat);
      }
    };
    this.thalassa.on('stat', statWriteListener);

    function sendStatsForHostId(hostId) {
      self.db.statsValueStream(hostId).pipe(through(writeStatStream));
    }

    function writeStatStream (data) {
      if (!statStream.destroyed) statStream.write(data);
    }

    //
    // wire up an activity stream 
    //
    var activityStream = mx.createWriteStream({ type: 'activity' });
    var activityWriteListenery = function (activityObj) {
      activityStream.write(activityObj);
    }
    this.thalassa.on('activity', activityWriteListenery);
    self.db.activityValueStream().pipe(through(function write(data) { activityStream.write(data); }));

    mx.on('end', function () {
      self.thalassa.removeListener('stat', statWriteListener);
      self.thalassa.removeListener('activity', activityWriteListenery);
      statStream.destroy();
      controlStream.destroy();
    });

    return mx;
  };
};


