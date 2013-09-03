#!/usr/bin/env node
var Crowsnest = require('..')
  , Hapi = require('hapi')
  , shoe = require('shoe')
  , util = require('util')
  ;

var optimist = require('optimist')
            .options({
              host: {
                default : '0.0.0.0',
                describe: 'host to bind to'
              },
              port: {
                default : 8080,
                describe: 'port to bind to'
              },
              thalassaHost: {
                default : '127.0.0.1',
                describe: 'host of the Thalassa server'
              },
              thalassaPort: {
                default : 5001,
                describe: 'port of the Thalassa server'
              },
              thalassaApiPort: {
                default : 9000,
                describe: 'port of the Thalassa server'
              },
              debug: {
                boolean: true,
                describe: 'enabled debug logging'
              },
              showhelp: {
                alias: 'h'
              }
            });

var argv = optimist.argv;
if (argv.h) {
  optimist.showHelp();
  process.exit(0);
}

var log = argv.log = require('../lib/defaultLogger')( (argv.debug == true) ? 'debug' : 'error' );
var crowsnest = new Crowsnest(argv);
var server = Hapi.createServer(argv.host, argv.port);

// anything at the top level goes to index.html
server.route({ method: 'GET', path: '/{p}', handler: { file: { path: __dirname+'/../public/index.html' }}});
server.route({ method: 'GET', path: '/pools/{p}', handler: { file: { path: __dirname+'/../public/index.html' }}});

server.route({
    method: 'GET',
    path: '/{path*}',
    handler: {
        directory: { path: __dirname+'/../public', listing: false, index: true }
    }
});

var sock = shoe();
sock.install(server.listener, '/aqueductStreams');
sock.on('connection', function (stream) {
  var s = crowsnest.createReadableMuxStream();
  stream.pipe(s).pipe(stream);

  stream.on('end', function () {
    s.destroy();
  })

});

sock.on('log', function (severity, msg) {
  log(severity, msg);
})


server.start(function () {
  log('info', util.format("Thalassa Crowsnest listening on %s:%s", argv.host, argv.port));
});