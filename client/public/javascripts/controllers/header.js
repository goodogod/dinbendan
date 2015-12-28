/* global docCookies */
'use strict';

/*======================================================
  Control navbar.
======================================================*/
angular.module('main')

.controller('headerController', function ($scope, $http) {
    
    var info = getInfoFromCookies(docCookies);
    var token = info.token;
    var organizationID = info.organizationID;
    var userID = info.userID;
    
    // todo: extract to common module
    $scope.userInfo = {
        userName: undefined,
        userID: undefined,
        organizationID: undefined,
        money: NaN,
        create_date: undefined,
        role: undefined,
        image: undefined,
        updateUserInfo: function (userID) {
            $scope.userInfo.userID = userID;
            $scope.userInfo.organizationID = organizationID;

            var req = {
                method: 'GET',
                url: '/api/v1/users',
                params: {
                    token:          token,
                    userID:         userID,
                    organizationID: organizationID
                }
            };

            $http(req).success(function (response) {
                if (response.success) {
                    for (var i = 0; i < response.users.length; i++) {
                        var userFromRes = response.users[i];
                        if (userFromRes.user_id == $scope.userInfo.userID) {
                            $scope.userInfo.userName = userFromRes.user_name;
                            $scope.userInfo.organizationID = userFromRes.organization_id;
                            $scope.userInfo.money = parseInt(userFromRes.money);
                            $scope.userInfo.create_date = userFromRes.create_date;
                            $scope.userInfo.role = userFromRes.role;
                            break;
                        }
                    }
                }
            });
        }
    };
    $scope.userInfo.updateUserInfo(userID);
    
    // Title redirection
    $scope.clickMainTitle = function () {
        window.location.href = '/';
    }

    // Party redirection
    $scope.clickBrowse = function () {
        window.location.href = '/browse';
        //alert('Create party !');
        //$('#createPartyModal').on('shown.bs.modal', function () {
        //    $('#myInput').focus()
        //});
    };
    
    $scope.clickRecharge = function () {
        window.location.href = '/recharge';
    }
    
    $scope.clickLogout = function() {
        docCookies.setItem('token', undefined);
        docCookies.setItem('userID', undefined);
        docCookies.setItem('organizationID', undefined);
        window.location.href = '/';
    };
});