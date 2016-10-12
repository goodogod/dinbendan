/* global docCookies */
'use strict';


app.config(['$routeProvider', function ($routeProvider) {
    var route = $routeProvider;
    //指定URL为“/” 控制器：“indexController”，模板：“route.html”
    route.when('/info', { controller: 'infoController', templateUrl: 'routes/user-info.html' });
    //注意“/view/:id” 中的 “：id” 用于捕获参数ID
    //route.when('/view/:id', { controller: 'viewController', templateUrl: '.html' });
    //跳转
    route.otherwise({ redirectTo: '/info' });
}]);


app
.controller('userController', function ($scope, $http, userInfoService) {
    
    var info = getInfoFromCookies(docCookies);
    var token = info.token;
    var organizationID = info.organizationID;
    var userID = info.userID;
    
    userInfoService.update(userID, organizationID, token);
    $scope.userInfo = userInfoService;

    let queryUser = getParameterByName('name');
    console.log('queryUser: ' + queryUser);
});