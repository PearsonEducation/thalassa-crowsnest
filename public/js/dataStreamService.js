angular.module('crowsnest').factory('dataStream', function (browserify, $rootScope, _) {

  var crdt = browserify.crdt
    , shoe = browserify.shoe
    , MuxDemux = browserify.MuxDemux
    , events = browserify.events
    , reconnect = browserify.reconnect
    ;

  var thalassaClientDoc  = new crdt.Doc();
  var thalassaServicesSet = thalassaClientDoc.createSet('type', 'service');

  var services = [];

  var data = new events.EventEmitter();
  data.getServices = function getServices () { return services; };
  data.getPoolServers = function getPoolServers () { return aqueductServers; };
  data.connection = null;

  // TODO add debounce
  thalassaServicesSet.on('add', function (row) {
    var service = row.toJSON();
    service.sortKey = service.role+'~'+service.version+'~'+service.host+'~'+service.port;
    services.push(service)
    services = services.sort(function (a,b) { return (a.sortKey > b.sortKey) ? 1 : -1 });
    data.emit('services-changed');
  })

  thalassaServicesSet.on('changes', function (Row, changed) {
  });

  thalassaServicesSet.on('remove', function (row) {
    var service = row.toJSON();
    services = services.filter(function (s) { return s.id !== service.id; });
    console.log('FREE', service)
    data.emit('services-changed');
  })

  var aqueductServers = {};

  function AqueductServer(meta) {
    var id = meta.service.id;
    if (!(this instanceof AqueductServer)) {
      return aqueductServers[id] || new AqueductServer(meta);
    }

    var self = this;
    this.id = id;
    this.meta = meta;
    this.doc = new crdt.Doc();

    this.frontendsSet = this.doc.createSet('_type', 'frontend');
    this.backendsSet  = this.doc.createSet('_type', 'backend');
    this.statsSet     = this.doc.createSet('_type', 'stat');

    var frontends = {}, backends = {}, stats = {};

    this.getFrontends = function getFrontends() { return frontends; };
    this.getBackends = function getBackends() { return backends; };
    this.getStats = function getStats() { return stats; };

    this.getFrontendStatus = function getFrontendStatus(frontendName) {
      var statId = 'stat/frontend/' + frontendName;
      //console.log(statId, stats[statId]);
      return stats[statId] || {};
    };

    this.getBackendStatus = function getBackendStatus(backendName) {
      var statId = 'stat/backend/' + backendName;
      return stats[statId] || {};
    };

    this.getBackendMemberStatus = function getBackendMemberStatus(backendName, host, port) {
      var statId = 'stat/backend/' + backendName + '/' + backendName + '_' + host + ':' + port;
      return stats[statId] || {};
    };

    this.getBackendMemberHealthCount = function getBackendMemberHealthCount(backendName) {
      var statIdPrefix = 'stat/backend/' + backendName +'/';
      var count = Object.keys(stats)
          .filter(function (key) { return key.indexOf(statIdPrefix) === 0;})
          .reduce(function (total, key) {
            var state = stats[key];
            return ((state.status.indexOf('UP') === 0) ? 1 : 0) + total;
          } , 0);
      return count;
    };

    this.frontendsSet.on('add', function (row) {
      frontends[row.id] = row.toJSON();
    });
    this.frontendsSet.on('remove', function (row) {
      delete frontends[row.id];
    });
    this.frontendsSet.on('changes', function (row, changes) {
      Object.keys(changes).forEach(function (key) {
        frontends[row.id][key] = changes[key];
      });
    });

    this.backendsSet.on('add', function (row) {
      backends[row.id] = row.toJSON();
    });
    this.backendsSet.on('remove', function (row) {
      delete backends[row.id];
    });
    this.backendsSet.on('changes', function (row, changes) {
      Object.keys(changes).forEach(function (key) {
        backends[row.id][key] = changes[key];
      });
    });

    this.statsSet.on('add', function (row) {
      stats[row.id] = row.toJSON();
      //console.log(stats);
    });
    this.statsSet.on('remove', function (row) {
      delete stats[row.id];
    });
    this.statsSet.on('changes', function (row, changes) {
      Object.keys(changes).forEach(function (key) {
        stats[row.id][key] = changes[key];
      });
    });

    var handleServiceRemove = function handleServiceRemove (row) {
      var service = row.toJSON();
      if (service.id === self.id) {
        self.destroy();
      }
    };

    this.destroy = function destroy() {
      this.frontendsSet.removeAllListeners();
      this.backendsSet.removeAllListeners();
      this.statsSet.removeAllListeners();
      this.doc.dispose();
      this.doc.removeAllListeners();
      thalassaServicesSet.removeListener('remove', handleServiceRemove);
      delete aqueductServers[id];
      data.emit('pools-changed');
    };

    thalassaServicesSet.on('remove', handleServiceRemove);
    thalassaServicesSet.on('changes', function (a,b,c) {
      console.log('CHANGES',a,b,c)
    });
    aqueductServers[id] = this;
  }

  data.connection = reconnect(function (stream) {
    console.log('in reconnect')

    var mx = new MuxDemux(function (s) {
      if (s.meta.type === 'aqueduct') {
        console.log("NEW s1", s)
        var server = AqueductServer(s.meta);

        server.doc.on('row_update', function (row) {
          data.emit('pools-changed');
        });

        var docStream = server.doc.createStream({ sendClock: true });
        s.pipe(docStream).pipe(s);
        s.once('close', docStream.destroy.bind(docStream));
        stream.once('close', docStream.destroy.bind(docStream));
      }
      else if (s.meta.type === 'thalassa') {
        console.log("NEW s2", s)
        var clientDocStream = thalassaClientDoc.createStream();
        s.pipe(clientDocStream).pipe(s);
        s.once('close', clientDocStream.destroy.bind(clientDocStream));
        stream.once('close', clientDocStream.destroy.bind(clientDocStream));
      }
    })

    stream.pipe(mx).pipe(stream);
    stream.once('close', function () {
      console.log('stream closed');
      mx.destroy();
    })
  }).connect('/aqueductStreams');

  data.connection.on('connect', function () { console.log('connect'); });
  data.connection.on('disconnect', function () { console.log('disconnect'); });
  data.connection.on('backoff', function (a, d) { console.log('backoff', a, d); });
  data.connection.on('reconnect', function (a,d) { console.log('reconnect', a, d); });
  //document.body.appendChild(r.widget())
//  var stream = shoe('/aqueductStreams');
  //stream.on('data', console.log.bind(console))

  //var rtStream = routeTable.createStream();
  


  return data;
});