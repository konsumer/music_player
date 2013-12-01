'use strict';

describe('Controller: MainCtrl', function () {

  // load the controller's module
  beforeEach(module('musicPlayerApp'));

  var MainCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    MainCtrl = $controller('MainCtrl', {
      $scope: scope
    });
  }));

  it('should have currentTrack set to 0', function () {
    expect(scope.currentTrack).toBe(0);
  });
});
