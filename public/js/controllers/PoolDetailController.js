angular.module('crowsnest').controller('PoolDetailController', function ($scope, $routeParams, dataStream, userDataService) {
  var id = decodeURIComponent($routeParams.id);
  $scope.ps = dataStream.getPoolServer(id);

  $scope.frontends = {};
  $scope.backends = {};
  $scope.connStats = {};
  $scope.statuses = {};
  $scope.healthCounts = {};
  $scope.versionMap = {};

  function refreshData() {
    var ps = $scope.ps = dataStream.getPoolServer(id);
    $scope.frontends = ps.getFrontends();
    $scope.backends = ps.getBackends();
    $scope.connStats = {};
    $scope.statuses = {};
    $scope.versionMap = {};
    for (k in $scope.frontends) {
      var fe = $scope.frontends[k];
      $scope.connStats[fe.id] = ps.getFrontendConnectionStats(fe.key);
      $scope.statuses[fe.id] = ps.getFrontendStatus(fe.key);
    };
    for (k in $scope.backends) {
      var be = $scope.backends[k];
      $scope.connStats[be.id] = ps.getBackendConnectionStats(be.key);
      $scope.statuses[be.id] = ps.getBackendStatus(be.key);
      $scope.healthCounts[be.id] = ps.getBackendMemberHealthCount(be.key);
      var beVersionMap = dataStream.getServices()
        .filter(function (s) { return (s.name === be.name)})
        .reduce(function (p, c) { p[c.version] = (p[c.version] || 0) + 1; return p; }, {});
        $scope.versionMap[be.id] = Object.keys(beVersionMap).map(function (k) { return { version: k, count: beVersionMap[k] }; });
      be.members.forEach(function (member) {
        $scope.statuses[member.id] = ps.getBackendMemberStatus(be.key, member.host, member.port);
        //console.log(dataStream.getServices());
        //$scope.connStats[member.id] = ps.getBackendMemberConnectionStats(be.key, member.host, member.port);
      });
    };
  }

  dataStream.on('pools-changed', function (row) {
    refreshData()
    $scope.$apply();
  });

  dataStream.on('stats-changed', function (row) {
    refreshData()
    $scope.$apply();
  });

  dataStream.subscribeToStats(id);

  $scope.isFavorite = function (ps) {
    if (ps) return _.contains(userDataService.getFavorites(), ps.id);
  }

  $scope.toggleFavorite = function (ps) {
    if ($scope.isFavorite(ps)) userDataService.removeFavorite(ps.id);
    else userDataService.addFavorite(ps.id);
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

  $scope.changeVersion = function (be, version) {
    console.log('change version of ', be.id, version);
    $scope.ps.setBackendVersion(be.key, version);
  }

});