angular.module('main')

.controller('rechargeController', function ($scope, $http) {
    
    var info = getInfoFromCookies(docCookies);
    var token = info.token;
    var organizationID = info.organizationID;
    var userID = info.userID;
    
    // User name filter.
    $scope.userFilterValue = '';
    
    /*
     *  user: {
     *      id: integer,
     *      name: string,
     *      organizationID: integer,
     *      oragnization: string,
     *      createDate: Date,
     *      role: string,
     *      money: float,
     *      inputAmount: float,
     *      
     *      recharge: function ()
     *  }
     */
    $scope.usersList = [];
    getUsersList($http, token, $scope.usersList, function (list) {
        // attach other fields
        list.forEach(function (value, index) {
            list[index].inputAmount = 0.0;
            list[index].recharge = function () {
                if (confirm('確定幫 ' + this.name + ' 儲值 ' + this.inputAmount + '元 ?')) {
                    // todo: recharge request
                    
                    // todo: initialize inputAmount
                }
            };
        });
    });
})

.filter('userFilter', function () {
    return function (items, wildcard) {
      var filtered = [];
      angular.forEach(items, function (item) {
          if (item.name.match(wildcard)) {
              filtered.push(item);
          }
      });
      
      return filtered;
    };
});
