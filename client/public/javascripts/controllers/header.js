/* global docCookies */
'use strict';

/*======================================================
  Control navbar.
======================================================*/
angular.module('main')

.controller('headerController', function ($scope, $http, userInfoService) {
    
    var info = getInfoFromCookies(docCookies);
    var token = info.token;
    var organizationID = info.organizationID;
    var userID = info.userID;
    
    $scope.userInfo = userInfoService;
    $scope.userInfo.update(userID, organizationID, token);
    
    $scope.clickLogout = function() {
        docCookies.setItem('token', undefined);
        docCookies.setItem('userID', undefined);
        docCookies.setItem('organizationID', undefined);
        window.location.href = '/';
    };
});