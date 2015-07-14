//var angular = require('angular');

// create angular module
angular.module('nodeParties', [])
.controller('mainController', function ($scope, $http) {
    //
});

// jQuery area
$(document).ready(function() {
    //alert('ready !');
    $.material.init();

    $('#calendar').fullCalendar({
        // put your options and callbacks here
    });
});

// deprecate
angular.module('nodeTodo', [])
// create controller
.controller('mainController', function($scope, $http) {
	$scope.formData = {};
	$scope.todoData = {};


	// Get all todos
	$http.get('/api/v1/todos')
	    .success(function(data) {
	    	$scope.todoData = data;
	    	console.log(data);
	    })
	    .error(function(error) {
	    	console.log('Error: ' + error);
	    });

	// Create a new todo
	$scope.createTodo = function(todoID) {
		console.info('enter createTodo');
        $http.post('/api/v1/todos', $scope.formData)
	    .success(function(data) {
	        $scope.formData = {};
	        $scope.todoData = data;
	        console.log(data);
	    })
	    .error(function(error) {
	        console.log('Error: ' + error);
	    });
	};

    // Delete a todo
    $scope.deleteTodo = function (todoID) {
    	console.info('enter deleteTodo');
	    $http.delete('/api/v1/todos/' + todoID)
	    .success(function(data) {
	        $scope.todoData = data;
	        console.log(data);
	    })
	    .error(function(data) {
	        console.log('Error: ' + data);
	    });
	};

	$scope.layoutDone = function() {
		//alert('done !');
		$.material.init();
	}
})
// 特殊的方法, 可正確抓到 ng-repeat 的結束時機
.directive('repeatDone', function() {
	return function(scope, element, attrs) {
    		if (scope.$last) { // all are rendered
                scope.$eval(attrs.repeatDone);
            }
        };
});
