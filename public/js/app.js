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
  .directive('connectionStatus', function () {
    return {
      restrict: 'E',
      controller: 'ConnectionController',
      templateUrl: 'templates/connection.html'
    }
  })
