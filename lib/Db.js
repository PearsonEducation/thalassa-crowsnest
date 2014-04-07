var level = require('level')
  , assert = require('assert')
  , util = require('util')
  , path = require('path')
  , mkdirp = require('mkdirp')
  , TCA = require('tailable-capped-array');
  ;

//
// opts:
//    - dbPath
//    - totalStatsToRetain
//
var Db = module.exports = function Db (opts, cb) {
  var self = this;
  if (typeof opts !== 'object') opts = {};
  this.log = (typeof opts.log === 'function') ? opts.log : function (){};

  assert(opts.dbPath, 'Db.js: opts.dbPath, dbPath to leveldb database, must be passed!');

  var dbPath = self.DBPATH = opts.dbPath;
  self.TOTAL_STATS_TO_RETAIN = opts.totalStatsToRetain || 20000;

  this.statsCache = new TCA(self.TOTAL_STATS_TO_RETAIN);

  mkdirp(dbPath, function (err) {
    if (err) {
      self.log('error', 'mkdirp ' + dbPath, String(err));
      throw err;
    }

    var activityDbPath = path.join(dbPath, 'activityDb');
    self.activityDb = level(activityDbPath, { valueEncoding : 'json' });
    self.log('debug', 'activityDbPath=' + activityDbPath);
    if (typeof cb === 'function') cb();

  });
};

Db.prototype.writeStat = function(statObj) {
  this.statsCache.push(statObj);
};

Db.prototype.writeActivity = function(activityObj) {
  this.log('debug', "activity", activityObj);
  var key = [activityObj.time, activityObj.object].join('~');
  this.activityDb.put(key, activityObj);
};

Db.prototype.statsValueStream = function() {
  return this.statsCache.createReadStream();
};

Db.prototype.activityValueStream = function(opts) {
  if (!opts) opts = {};
  if (!opts.start) opts.start = Date.now();
  if (!opts.limit) opts.limit = 50;
  opts.reverse = true;
  return this.activityDb.createValueStream(opts);
};
