angular.module('crowsnest').factory('dataStream', function (browserify, $rootScope, _) {

  var crdt = browserify.crdt, shoe = browserify.shoe, MuxDemux = browserify.MuxDemux, events = browserify.events;

  var thalassaClientDoc  = new crdt.Doc();
  var thalassaServicesSet = thalassaClientDoc.createSet('type', 'service');
  var poolsCrdts = {};

  var services = [];

  var data = new events.EventEmitter();
  data.getServices = function getServices () { return services; };
  data.getPoolServers = function getPoolServers () { return aqueductServers; };

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
    data.emit('services-changed');
  })

  var aqueductServers = {};

  function AqueductServer(id, doc, meta) {
    var self = this;
    this.id = id;
    this.meta = meta;
    this.doc = doc;

    this.frontendsSet = doc.createSet('_type', 'frontend');
    this.backendsSet  = doc.createSet('_type', 'backend');
    this.statsSet     = doc.createSet('_type', 'stat');

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

    this.destroy = function destroy() {
      this.frontendsSet.removeAllListeners();
      this.backendsSet.removeAllListeners();
      this.statsSet.removeAllListeners();
    };
  }


  var mx = new MuxDemux(function (s) {
    console.log(s);
    if (s.meta.type === 'aqueduct') {
      var id = s.meta.id;
      var doc = poolsCrdts[id] = new crdt.Doc();
      var server = aqueductServers[id] = new AqueductServer(id, doc, s.meta);

      doc.on('row_update', function (row) {
        data.emit('pools-changed');
      });

      var docStream = doc.createStream();
      s.pipe(docStream).pipe(s);
      s.on('close', function () {
        docStream.destroy();
        poolsCrdts[id].dispose();
        poolsCrdts[id].removeAllListeners();
        delete poolsCrdts[id];

        delete aqueductServers[id];

        data.emit('pools-changed');
      });
    }
    else if (s.meta.type === 'thalassa') {
      s.pipe(thalassaClientDoc.createStream()).pipe(s);
      //console.log(thalassaServices.toJSON());
    }
  })
  var stream = shoe('/aqueductStreams');
  //stream.on('data', console.log.bind(console))

  //var rtStream = routeTable.createStream();
  stream.pipe(mx).pipe(stream);



  return data;
});