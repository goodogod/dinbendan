'use strict';

/*
 *  Return: { token: string, organizationID: string, userID: string }
 */
function getInfoFromCookies (cookies) {
    var token = cookies.getItem('token');
    var organizationID = cookies.getItem('organizationID');
    var userID = cookies.getItem('userID');
    
    return { token: token, organizationID: organizationID, userID: userID };
}

/*
 * Get stores.
 * Return: [ { id, name }, { ... }, ... ]
 */
function getStoresList($http, token, outStoresList) {
    var req = {
        method: 'GET',
        url: '/api/v1/stores',
        params: {
            token:  token
        }
    }

    $http(req).success(function (response) {
        if (response.success) {
            for (var i = 0; i < response.stores.length; i++) {
                outStoresList.push(response.stores[i]);
            }
        }
    });
}

/*
 * Get products list by storeID.
 * Return: [ { product_id, product_name, store_id, price }, { ... }, ... ]
 */
function getProductsList($http, token, storeID, outProductsList) {
    
    var req = {
        method: 'GET',
        url: '/api/v1/store/' + storeID + '/products',
        params: {
            token: token
        }
    };
    $http(req).success(function (response) {
        if (response.success) {
            for (var i = 0; i < response.products.length; i++) {
                outProductsList.push(response.products[i]);
            }
        }
    });
}

/*
 * Get comments list.
 */
function getCommentsList($http, token, productID, outCommentsList) {
    var req = {
        method: 'GET',
        url: '/api/v1/product/' + productID + '/comments',
        params: {
            token: token
        }
    };
    $http(req).success(function (response) {
        if (response.success) {
            for (var i = 0; i < response.comments.length; i++) {
                outCommentsList.push(response.comments[i]);
            }
        }
    });
}

function getUsersList($http, token, outUsersList, doneEvent) {
    // todo: /api/v1/users
    
    outUsersList.length = 0;
    
    var req = {
        method: 'GET',
        url: 'api/v1/users',
        params: {
            token: token
        }
    };
    
    $http(req).success(function (response) {
        if (response.success) {
            response.users.forEach(function (user, index) {
                outUsersList.push({
                    id:             parseInt(user.user_id),
                    name:           user.user_name,
                    organizationID: parseInt(user.organization_id),
                    organization:   user.organization,
                    createDate:     new Date(user.create_date),
                    role:           user.role,
                    money:          parseFloat(user.money)
                });
                
                if (doneEvent) {
                    doneEvent(outUsersList);
                }
            });
        }
    });
}