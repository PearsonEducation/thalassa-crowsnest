var request = require('request')
  , util = require('util')
  ;

module.exports = {
  setVersion: function setVersion (host, port, key, version, cb) {

    request({
      method: 'POST',
      uri: util.format('http://%s:%s/backends/%s', host, port, key),
      json: {
        version: version
      }
    }, function (err, response, body) {
      if (err) return cb (err);
      else if (response.statusCode !== 200) {
        return cb (new Error('Unsuccessful response ' + response.statusCode + ' ' + body));
      }
      else return cb(null);
    })
  }
}