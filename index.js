var assert = require('assert')
  , ThalassaAgent = require('./lib/ThalassaAgent')
  , MuxDemux = require('mux-demux')
  , pkg = require('./package.json')
  ;


var Crowsnest = module.exports = function Crowsnest (opts) {

  this.thalassa = new ThalassaAgent({
    host: opts.thalassaHost,
    port: opts.thalassaPort,
    log: opts.log 
  });
  this.thalassa.client.register(pkg.name, pkg.version, opts.port);


  this.createReadableMuxStream = this.thalassa.createReadableMuxStream.bind(this.thalassa);
}


