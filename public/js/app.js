angular.module('crowsnest', [])
  .config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.
        when('/', {templateUrl: 'templates/dashboardView.html',   controller: 'DashboardController', active: 'dashboard'}).
        when('/pools', {templateUrl: 'templates/poolsView.html', controller: 'PoolsController', active: 'pools'}).
        when('/services', {templateUrl: 'templates/servicesView.html', controller: 'ServicesController', active: 'services'}).
        when('/activity', {templateUrl: 'templates/activityView.html', controller: 'ActivityController', active: 'activity'}).
        otherwise({redirectTo: '/'});

    $locationProvider.html5Mode(true)
  }])
  .directive('servicelist', function () {
    return {
      restrict: 'E',
      controller: 'ServicesListController',
      templateUrl: 'templates/servicesList.html'
    }
  })

// var shoe        = require('shoe')
//   , crdt        = require('crdt')
//   , MuxDemux = require('mux-demux')
//   , thalassaClientDoc  = new crdt.Doc()
//   , thalassaServices = thalassaClientDoc.createSet('type', 'service')
//   , crdts = {}
//   ;

// // routeTable.on('row_update', function (row) { 
// //   console.log(row.toJSON()) 
// // });

// var mx = new MuxDemux(function (s) {
//   console.log(s);
//   if (s.meta.type === 'aqueduct') {
//     var doc = crdts[s.meta.id] = new crdt.Doc();
//     var docStream = doc.createStream();
//     s.pipe(docStream).pipe(s);
//     console.log(crdts);
//     s.on('close', function () {
//       console.log('close ', s.meta.id)
//       docStream.destroy();
//       crdts[s.meta.id].dispose();
//       crdts[s.meta.id].removeAllListeners();
//       delete crdts[s.meta.id];
//       console.log(crdts);
//     });
//   }
//   else if (s.meta.type === 'thalassa') {
//     s.pipe(thalassaClientDoc.createStream()).pipe(s);
//     //console.log(thalassaServices.toJSON());
//   }
// })
// var stream = shoe('/aqueductStreams');
// //stream.on('data', console.log.bind(console))

// //var rtStream = routeTable.createStream();
// stream.pipe(mx).pipe(stream);
// //rtStream.pipe(stream);

// var app = angular.module('aqueduct', []).controller('Status', function ($scope) {
//   $scope.frontendsMap = {};
//   $scope.backendsMap = {};
//   $scope.status = {};

//   routeTable.on('row_update', function (row) {
//     var row = row.toJSON();
//     if (row._type === 'frontend') {
//       $scope.frontendsMap[row.id] = row;
//     }
//     else if (row._type === 'backend') {
//       $scope.backendsMap[row.id] = row;
//     }
//     else if (row._type === 'stat') {
//       $scope.status[row.id] = row.status;
//     }
//     setTimeout(function () { $scope.$apply(); }, 10);
//   });

// });