angular.module('crowsnest').controller('ConnectionController', function ($scope, dataStream) {
  var r = dataStream.connection;
  var interval = null;

  $scope.count = ' ';
  $scope.status = 'connecting';

  $scope.toggle = function () {
    setTimeout(function() {
      r.connected ? r.disconnect() : r.connect();
    }, 1);
  };

  r.on('reconnect', function (n, d) {
    var delay = Math.round(d / 1000) + 1;
    clearInterval(interval)
    $scope.count = delay;
    $scope.status = 'disconnected';
    $scope.$apply();
    interval = setInterval(function () {
      $scope.count = (delay > 0 ? --delay : 0);
      $scope.status = (delay ? 'disconnected' :'connecting');
      $scope.$apply();
    }, 1e3)
  });

  r.on('connect',   function () {
    $scope.count = ' ';
    $scope.status = 'connected';
    clearInterval(interval)
    $scope.$apply();
  })
  r.on('disconnect', function () {
    $scope.status = 'disconnected';
    $scope.$apply();
  })
});