
app.factory('userInfoService', function ($http) {
    var userInfoService = {
        userName: undefined,
        userID: undefined,
        organizationID: undefined,
        money: NaN,
        create_date: undefined,
        role: undefined,
        image: undefined,
        update: function (userID, organizationID, token) {
            userInfoService.userID = userID;
            userInfoService.organizationID = organizationID;

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
                        if (userFromRes.user_id == userInfoService.userID) {
                            userInfoService.userName = userFromRes.user_name;
                            userInfoService.organizationID = userFromRes.organization_id;
                            userInfoService.money = parseInt(userFromRes.money);
                            userInfoService.create_date = userFromRes.create_date;
                            userInfoService.role = parseInt(userFromRes.role);
                            break;
                        }
                    }
                }
            });
        }
    };
    return userInfoService;
});