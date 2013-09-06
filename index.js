var assert = require('assert')
  , ThalassaAgent = require('./lib/ThalassaAgent')
  , Db = require('./lib/Db')
  , MuxDemux = require('mux-demux')
  , pkg = require('./package.json')
  , split = require('split')
  ;


var Crowsnest = module.exports = function Crowsnest (opts) {
  var self = this;
  this.thalassa = new ThalassaAgent({
    host: opts.thalassaHost,
    port: opts.thalassaPort,
    apiport: opts.thalassaApiPort,
    log: opts.log
  });

  this.thalassa.client.register(pkg.name, pkg.version, opts.port);

  this.db = new Db(opts);
  this.thalassa.on('stat', this.db.writeStat.bind(this.db));


  // wire up
  this.createReadableMuxStream = function () {
    var mx = this.thalassa.createReadableMuxStream();
    var statSubscriptions = {};

    var controlStream = mx.createStream({ type: 'control' });
    controlStream.pipe(split()).on('data', function (line) {
      try {
        var msg = JSON.parse(line);
        if (msg[0] === 'statSubscribe') {
          console.log(msg[0], msg[1])
          statSubscriptions[msg[1]] = true;
        }
        else if (msg[0] === 'statUnsubscribe') {
          delete statSubscriptions[msg[1]];
        }
      } catch(ex) { /* gulp */ };
    });

    var statStream = mx.createWriteStream({ type: 'stat' });
    var writeListener = function (stat) {
      if (statSubscriptions[stat.hostId]) {
        statStream.write(stat);
      }
    };
    this.thalassa.on('stat', writeListener);

    mx.on('end', function () {
      console.log('mx end')
      self.thalassa.removeListener('stat', writeListener);
      statStream.destroy();
      controlStream.destroy();
    });

    return mx;
  }
}


