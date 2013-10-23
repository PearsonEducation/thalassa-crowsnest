angular.module('crowsnest').controller('DashboardController', function ($scope, $location, dataStream, userDataService) {

  $scope.favorites = [];
  $scope.frontends = {};
  $scope.backends = {};
  $scope.connStats = {};
  $scope.statuses = {};
  $scope.healthCounts = {};

  function refreshFavorites () {
    $scope.favorites = _.toArray(dataStream.getPoolServers())
                        .filter(function (ps) { return $scope.isFavorite(ps)});
    $scope.favorites.forEach(function (f) {
      dataStream.subscribeToStats(f.id);
    });
  }

  // TODO severly optimize this mess
  function refreshData() {
    $scope.favorites.forEach(function (ps) {
      $scope.frontends[ps.id] = ps.getFrontends();
      $scope.backends[ps.id] = ps.getBackends();
      $scope.connStats[ps.id] = {};
      $scope.statuses[ps.id] = {};
      $scope.healthCounts[ps.id] = {};
      for (k in $scope.frontends[ps.id]) {
        var fe = $scope.frontends[ps.id][k];
        $scope.connStats[ps.id][fe.id] = ps.getFrontendConnectionStats(fe.key);
        $scope.statuses[ps.id][fe.id] = ps.getFrontendStatus(fe.key);
      };
      for (k in $scope.backends[ps.id]) {
        var be = $scope.backends[ps.id][k];
        $scope.connStats[ps.id][be.id] = ps.getBackendConnectionStats(be.key);
        $scope.statuses[ps.id][be.id] = ps.getBackendStatus(be.key);
        $scope.healthCounts[ps.id][be.id] = ps.getBackendMemberHealthCount(be.key);
      };
    });
  }

  dataStream.on('pools-changed', function (row) {
    $scope.$apply(function () {
      refreshFavorites();
      refreshData();
    });
  });

  dataStream.on('stats-changed', function (row) {
    $scope.$apply(function () {
      refreshData();
    });
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

  $scope.statusLabelClass = function (status) {
    if (!status) return '';
    status = status.toLowerCase();
    if (status.indexOf ('open') === 0) return 'success';
    if (status.indexOf ('down') === 0) return 'danger';
    if (status.indexOf ('up')   === 0) return 'success';
    if (status.indexOf ('full') === 0) return 'danger';
    return 'warning';
  }

  $scope.changeVersion = function (ps, be, version) {
    console.log('change version of ', be.id, version);
    ps.setBackendVersion(be.key, version);
  }

  refreshFavorites();
});