angular.module('crowsnest').controller('DashboardController', function ($scope, $location, dataStream, userDataService) {

  function refreshFavorites () {
    $scope.favorites = _.toArray(dataStream.getPoolServers())
                        .filter(function (ps) { return $scope.isFavorite(ps)});
  }

  dataStream.on('pools-changed', function (row) {
    refreshFavorites();
    $scope.$apply();
  });

  $scope.navigateToDetail = function (ps) {
    $location.path('/pools/' + encodeURIComponent(ps.id));
  }

  $scope.isFavorite = function (ps) {
    if (ps) return _.contains(userDataService.getFavorites(), ps.id);
  }

  $scope.toggleFavorite = function (ps) {
    if ($scope.isFavorite(ps)) userDataService.removeFavorite(ps.id);
    else userDataService.addFavorite(ps.id);
    refreshFavorites();
  }

  refreshFavorites();
});