'use strict';

angular.module('musicPlayerApp')
	.filter('startFrom', function() {
		return function(input, start) {
			start = +start; //parse to int
			return input.slice(start);
		};
	})
	
	.controller('MainCtrl', function ($scope, $http, $rootScope) {
		$scope.currentTrack = 0;
		$scope.pageSize = 5;
		$scope.data=[];

		var updateTrack = function(){
			$rootScope.$broadcast('audio.set', 'mp3/' + $scope.data[$scope.currentTrack].file, $scope.data[$scope.currentTrack], $scope.currentTrack, $scope.data.length);
		};

		$rootScope.$on('audio.next', function(){
			$scope.currentTrack++;
			if ($scope.currentTrack < $scope.data.length){
				updateTrack();
			}else{
				$scope.currentTrack=$scope.data.length-1;
			}
		});

		$rootScope.$on('audio.prev', function(){
			$scope.currentTrack--;
			if ($scope.currentTrack >= 0){
				updateTrack();
			}else{
				$scope.currentTrack = 0;
			}
		});

		$http.get('data/music.json')
			.success(function(response){
				$scope.data = response;
				updateTrack();
			});
	});
