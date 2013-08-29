angular.module('crowsnest').controller('PoolDetailController', function ($scope, $routeParams, dataStream, userDataService) {
  var id = decodeURIComponent($routeParams.id);
  $scope.ps = dataStream.getPoolServer(id);

  dataStream.on('pools-changed', function (row) {
    $scope.ps = dataStream.getPoolServer(id);
    $scope.$apply();
  });

  $scope.isFavorite = function (ps) {
    if (ps) return _.contains(userDataService.getFavorites(), ps.id);
  }

  $scope.toggleFavorite = function (ps) {
    if ($scope.isFavorite(ps)) userDataService.removeFavorite(ps.id);
    else userDataService.addFavorite(ps.id);
  }

});