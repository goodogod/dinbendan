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
    function submitRecharge() {
        var curUser = this;
        if (confirm('確定幫 ' + curUser.name + ' 儲值 ' + curUser.inputAmount + ' 元 ?')) {
            // recharge request
            $http({
                url: 'api/v1/user/recharge',
                method: 'PUT',
                data: {
                    user_id: curUser.id,
                    amount: curUser.inputAmount,
                    token: token
                }
            })
            .success(function (res) {
                if (res.success) {
                    getUsersList($http, token, $scope.usersList, initializeUsers);
                    //curUser.money = res.money;
                    //curUser.inputAmount = 0.0;
                }
            });
        }
    };
    
    function initializeUsers(list) {
        // attach other fields
        list.forEach(function (value, index) {
            list[index].inputAmount = 0.0;
            list[index].recharge = submitRecharge;
        });
    }
    
    getUsersList($http, token, $scope.usersList, initializeUsers);
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
