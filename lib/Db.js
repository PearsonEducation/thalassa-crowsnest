var level = require('level')
  , assert = require('assert')
  ;

var Db = module.exports = function Db (opts) {
  assert(opts.dbPath, 'Db.js: opts.dbPath, dbPath to leveldb database, must be passed!');

  this.db = level(opts.dbPath, { valueEncoding : 'json' });
};

Db.prototype.writeStat = function(statObj) {
  var key = statObj.id + '~' + statObj.time;
  this.db.put(key, statObj);
};

Db.prototype.createValueStream = function() {
  return this.db.createValueStream();
};