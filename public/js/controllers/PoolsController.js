angular.module('crowsnest').controller('PoolsController', function ($scope, $location, dataStream, userDataService, _) {
  $scope.poolServers = dataStream.getPoolServers();

  dataStream.on('pools-changed', function (row) {
    $scope.poolServers = dataStream.getPoolServers();
    $scope.$apply();
  });

  $scope.navigateToDetail = function (ps) {
    $location.path('/pools/' + encodeURIComponent(ps.id));
  }

  $scope.isFavorite = function (ps) {
    return _.contains(userDataService.getFavorites(), ps.id);
  }

  $scope.toggleFavorite = function (ps) {
    if ($scope.isFavorite(ps)) userDataService.removeFavorite(ps.id);
    else userDataService.addFavorite(ps.id);
  }
});