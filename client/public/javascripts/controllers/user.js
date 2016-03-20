/* global docCookies */
'use strict';

$(document).ready(function() {
    $('.container').show();
});

var app = angular.module('main', ['angular-loading-bar']);

app
.controller('userController', function ($scope, $http, userInfoService) {
    
    var info = getInfoFromCookies(docCookies);
    var token = info.token;
    var organizationID = info.organizationID;
    var userID = info.userID;
    
    userInfoService.update(userID, organizationID, token);
    $scope.userInfo = userInfoService;
});