//var angular = require('angular');


// jQuery area
$(document).ready(function() {
    //alert('ready !');
    $.material.init();

    $('.logout').click(function () {
        //alert('logout click !');
        // log out
        docCookies.setItem('token', undefined);
        docCookies.setItem('userID', undefined);
        docCookies.setItem('organizationID', undefined);
        window.location.href = '/';
    });

    //$('#calendar').fullCalendar({
        //weekends: false // will hide Saturdays and Sundays
        // put your options and callbacks here
        //$.get('/api/v1/parties');
    //});
});

// create angular module
angular.module('main', [])
.controller('mainController', function ($scope, $http) {

    // verify id
    var token = docCookies.getItem('token');
    var organizationID = docCookies.getItem('organizationID');

    // initialize all scope variables
    /*******************************
     format: [
       { party_id, create_date: Date, expired_date: Date }, ...]
    *******************************/
    $scope.todayParties = [];

    /*******************************
      format: [
          {
              product,
              price,
              users: [
                  {
                      id,
                      name
                  },
                  ...
              ]
          }
      ]
    *******************************/
    $scope.orderSummaries = [];

    /*******************************
    format: {
        name: string,
        party_id: integer,
        creator_id: integer,
        store_id: integer,
        creator: string,
        store: string,
        create_date: string,
        expired_date: string,
        ready: boolean,
        orders_count: integer
    }
    *******************************/
    $scope.activeParty = null;

    /*******************************
    format: {
          product,
          price,
          users: [
              {
                  id,
                  name
              },
              ...
          ]
      }
    *******************************/
    $scope.selectOrderSummary = null;

    // string
    $scope.storeName = '幸福主';

    $scope.clickOrder = function (orderSummary) {
        $scope.selectOrderSummary = orderSummary;

        // todo: GET products list
        var req = {
            method: 'GET',
            url: '/api/v1/store/' + $scope.activeParty.store_id + 'products',
            params: {
                token:          token,
                organizationID: organizationID
            }
        };
        $http(req).success(function (response) {
            if (response.success) {
                for (var i = 0; i < response.products.length; i++) {
                    if (response.products[i].product_name == $scope.selectOrderSummary.product) {
                        // todo:
                    }
                }
            }
        }

        // todo: GET product info by name

        // todo: GET product comments
    };

    // display today
    // 0 ~ 6
    var today = new Date('2015-7-13 10:00:00'); // for test
    var baseDate = new Date();
    baseDate.setDate(today.getDate() - today.getDay());
    //alert(baseDate);

    // fill weekbar
    for (var i = 0; i <= 6; i++) {
        var curDate = new Date();
        curDate.setDate(baseDate.getDate() + i);
        $('.day-' + i + ' p').text(curDate);
    }

    // build party main frame
    var curYear = '2015';
    var curMonth = '7';
    var reqUrl = '/api/v1/parties/' + curYear + '/' + curMonth;
    var req = {
        method: 'GET',
        url: reqUrl,
        params: {
            token: token,
            organizationID: organizationID
        }
    }

    $http(req).success(function (response) {
        if (response.success) {
            for (var i = 0; i < response.parties.length; i++) {
                // response time foramt: yyyy-mm-dd hh:mm:ss
                var start_date = new Date(response.parties[i].create_date);
                var end_date = new Date(response.parties[i].expired_date);
                if (start_date.getTime() <= today.getTime()
                    && today.getTime() <= end_date.getTime()) {
                    $scope.todayParties.push(response.parties[i]);

                    // active first party
                    var lastParty = $scope.todayParties[$scope.todayParties.length-1];
                    lastParty.active = false;
                    if ($scope.todayParties.length == 1) {
                        $scope.activeParty = lastParty;
                        lastParty.active = true;
                    }
                }
                //alert(start_date);
                //response[i]
            }

            // initialize orderSummaries
            if ($scope.activeParty) {

                // get orders list
                var partyID = $scope.activeParty.party_id;
                var req = {
                    method: 'GET',
                    url: 'api/v1/party/' + partyID + '/orders',
                    params: {
                        token:          token,
                        organizationID: organizationID
                    }
                }

                $http(req).success(function (response) {
                    if (response.success) {
                        for (var i = 0; i < response.orders.length; i++) {
                            var curOrder = response.orders[i];
                            var curSummary = null;
                            for (var j = 0; j < $scope.orderSummaries.length; j++){
                                if (curOrder.product == $scope.orderSummaries[j].product) {
                                    curSummary = $scope.orderSummaries[j];
                                    curSummary.users.push({
                                        id:   curOrder.user_id,
                                        name: curOrder.user_name
                                    });
                                    break;
                                }
                            }

                            if (!curSummary) {
                                var newSummary = {
                                    product: curOrder.product,
                                    price: curOrder.price,
                                    users: []
                                };
                                newSummary.users.push({
                                    id:   curOrder.user_id,
                                    name: curOrder.user_name
                                });
                                $scope.orderSummaries.push(newSummary);
                            }
                        }

                        //alert(JSON.stringify($scope.orderSummaries));
                    }
                });
            } // end of if (activeParty)
        } // end of if (response.success)
    });

    //$scope

    $scope.layoutDone = function() {
        //alert('done !');
        $.material.init();

        // todo: assign to HTML tab list, open on first
        if ($scope.todayParties.length > 0) {
            $("li.today-party").first().addClass('active');
        }
    }
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
