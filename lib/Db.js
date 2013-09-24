var level = require('level')
  , assert = require('assert')
  , util = require('util')
  , path = require('path')
  , debounce = require('debounce')
  , mkdirp = require('mkdirp')
  ;

//
// opts:
//    - dbPath
//    - secondsToRetainStats
//
var Db = module.exports = function Db (opts) {
  var self = this;
  if (typeof opts !== 'object') opts = {};
  this.log = (typeof opts.log === 'function') ? opts.log : function (){};

  assert(opts.dbPath, 'Db.js: opts.dbPath, dbPath to leveldb database, must be passed!');

  var dbPath = self.DBPATH = opts.dbPath;
  self.SECONDS_TO_RETAIN_STATS = opts.secondsToRetainStats || 300;
  self.debouncedTrimStats = debounce(self.trimStats.bind(self), 2000, true);

  mkdirp(dbPath, function (err) {
    if (err) {
      self.log('error', 'mkdirp ' + dbPath, String(err));
      throw err;
    }

    var statsDbPath = path.join(dbPath, 'statsDb');
    self.statsDb = level(statsDbPath, { valueEncoding : 'json' });
    self.log('debug', 'statsDbPath=' + statsDbPath);

    var activityDbPath = path.join(dbPath, 'activityDb');
    self.activityDb = level(activityDbPath, { valueEncoding : 'json' });
    self.log('debug', 'activityDbPath=' + activityDbPath);
  });

};

Db.prototype.writeStat = function(statObj) {
  var key = [statObj.hostId, statObj.id, statObj.time].join('~');
  this.statsDb.put(key, statObj);
  this.debouncedTrimStats();
};

Db.prototype.trimStats = function () {
  var self = this;
  var timeToExpire = Date.now() - (this.SECONDS_TO_RETAIN_STATS * 1000);
  var ws = self.statsDb.createWriteStream();
  var numKeysDeleted = 0;

  var rs = self.statsDb.createKeyStream()
    .on('data', function (key) {
      var parts = key.split('~');
      var epoch = parseInt(parts[2], 10) || 0;  // if the key doesn't contain the time, aggressively delete it
      if (epoch < timeToExpire) {
        //self.log('debug', 'trimStats deleting (' + (epoch - timeToExpire) + ') ' + key);
        ws.write({ type: 'del', key: key });
        numKeysDeleted++;
      }
    })
    .on('end', function () {
      ws.end();
      //self.log('debug', 'trimStats trimmed ' + numKeysDeleted + ' stats from statsDb');
    })
    .on('error', function (err) {
      self.log('error', 'trimStats reading keystream from statsDb', String(err));
      ws.end();
    });

  ws.on('error', function (err) {
    self.log('error', 'trimStats write stream to statsDb', String(err));
    rs.destroy();
  });
};

Db.prototype.statsValueStream = function(hostId) {
  var opts = (hostId) ? { start: hostId + '~', end: hostId + '~~' } : undefined;
  return this.statsDb.createValueStream(opts);
};

