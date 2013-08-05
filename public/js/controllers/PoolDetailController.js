angular.module('crowsnest').controller('PoolDetailController', function ($scope, $routeParams, dataStream) {
  var pshp = $routeParams.pshp;
  $scope.ps = dataStream.getPoolServer.apply(dataStream, pshp.split(':'));
  console.log($scope.ps)

  dataStream.on('pools-changed', function (row) {
    console.log('changed')
    $scope.ps = dataStream.getPoolServer.apply(dataStream, pshp.split(':'));
    console.log($scope.ps);
    $scope.$apply();
  });
});