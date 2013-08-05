angular.module('crowsnest').controller('ServicesController', function ($scope, $location, dataStream) {
  $scope.services = dataStream.getServices();

  // TODO better way to handle this data binding, need to reset the array because the
  // reference changes.
  dataStream.on('services-changed', function (s) {
    $scope.services = dataStream.getServices();
    $scope.$apply();
  });

});