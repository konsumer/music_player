'use strict';

angular.module('musicPlayerApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'audioPlayer-directive'
])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
