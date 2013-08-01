angular.module('crowsnest').controller('PoolsController', function ($scope, dataStream) {
  $scope.poolServers = dataStream.getPoolServers();

  dataStream.on('pools-changed', function (row) {
    $scope.poolServers = dataStream.getPoolServers();
    $scope.$apply();
  });

  setTimeout(function() { $scope.$apply(); }, 1000);

  $scope.getBackendHealthyCount = function (serverId, backendId) {
    var statuses =  dataStream.getPoolStatus(serverId);
    var backendStatId = 'stat/' + backendId;
    return 0;
    // return Object.keys(statuses).filter(function (k) { console.log(k, backendStatId); return k === backendStatId; }).reduce(function (key, t) { 
    //   console.log(statuses[key]);
    //   return (statuses[key].status.indexOf('UP') === 0) ? 1+t : t;
    // });
  }

});