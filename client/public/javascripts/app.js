/* global docCookies */
'use strict';


// jQuery area
$(document).ready(function() {
    //alert('ready !');
    //$.material.init();
});

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

// create angular module
angular.module('main', [])

/*======================================================
  Control navbar.
======================================================*/
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
    
    $scope.clickLogout = function() {
        docCookies.setItem('token', undefined);
        docCookies.setItem('userID', undefined);
        docCookies.setItem('organizationID', undefined);
        window.location.href = '/';
    };
})

/*======================================================
  Control main page.
======================================================*/
.controller('mainController', function ($scope, $http) {
    
    // verify id
    var info = getInfoFromCookies(docCookies);
    var token = info.token;
    var organizationID = info.organizationID;
    var userID = info.userID;

    //$scope.activePage = 'mainView';

    // initialize all scope variables
    $scope.userID = userID;
    $scope.organizationID = organizationID;
    
    // todo: extract to common module

    /*******************************
     format: [ { party_id, create_date: Date, expired_date: Date }, ...]
    *******************************/
    $scope.todayParties = [];

    /*******************************
      orderSummaries: [
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
          },
          { ... }
      ]
    *******************************/
    $scope.orderSummaries = [];

    // 更新 orderSummaries
    $scope.updateOrderSummaries = function (orderSummaries, activeParty, productsList, token, organizationID) {
        orderSummaries.length = 0;
        if ($scope.activeParty) {
            // get orders list
            var partyID = activeParty.party_id;
            var req = {
                method: 'GET',
                url: 'api/v1/party/' + partyID + '/orders',
                params: {
                    token:          token,
                    userID:         userID,
                    organizationID: organizationID
                }
            };

            $http(req).success(function (response) {
                if (response.success) {
                    for (var i = 0; i < response.orders.length; i++) {
                        var curOrder = response.orders[i];
                        var curSummary = null;
                        for (var j = 0; j < orderSummaries.length; j++){
                            if (curOrder.product == orderSummaries[j].product) {
                                curSummary = orderSummaries[j];
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
                            orderSummaries.push(newSummary);
                        }
                    }

                    // todo: add products which no one orders.
                }
                // add rest products by productsList
                for (var i = 0; i < productsList.length; i++) {
                    var existsInSummaries = false;
                    for (var j = 0; j < orderSummaries.length; j++) {
                        if (productsList[i].product_name == orderSummaries[j].product) {
                            existsInSummaries = true;
                            break;
                        }
                    }
                    if (!existsInSummaries) {
                        orderSummaries.push({
                            product: productsList[i].product_name,
                            price: productsList[i].price,
                            users: []
                        });
                    }
                }
            });
        } // end of if (activeParty)
    };

    // 判斷此 user 是否在此 party 的訂單列表中
    $scope.userInOrderSummaries = function() {
        for (var i = 0; i < $scope.orderSummaries.length; i++) {
                for (var j = 0; j < $scope.orderSummaries[i].users.length; j++) {
                        if ($scope.orderSummaries[i].users[j].id == userID) {
                        return true;
                    }
                }

        }
        return false;
    };

    /*
        productsList: [
            {
                product_id: integer,
                product_name: string,
                store_id: integer,
                price: float
            },
            { ... },
            ...
        ]
    */
    $scope.productsList = [];
    $scope.updateProductsListAndOrderSummaries = function (productsList, storeID, token, organizationID) {
        productsList = [];
        
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
                    productsList.push(response.products[i]);
                }

                $scope.updateOrderSummaries($scope.orderSummaries, $scope.activeParty, productsList, token, organizationID);
            }
        });
    };

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
    //$scope.updateSelectOrderSummary = function () {
    //};

    /*******************************
    format: [
        {
            comment_id: integer,
            product_id: integer,
            product_name: string,
            user_id: integer,
            user_name: string,
            text: string, // markdown
            date: string,
            stars: integer
        },
        ...
    ]
    *******************************/
    $scope.selectProductComments = null;

    /*******************************
    selectProductComments: {
        productName: string,
        price: integer,
        note: string,
        submitOrder: function
    }
    *******************************/
    $scope.inputOrder = {
        productName: '',
        price: 0,
        note: '',
        submitOrder: function () {

            var req = {
                method: 'POST',
                url: '/api/v1/order',
                data: {
                    user_id:  userID,
                    party_id: $scope.activeParty.party_id,
                    store_id: $scope.activeParty.store_id,
                    product:  this.productName,
                    price:    parseInt(this.price),
                    note:     this.note
                },
                params: {
                    token:          token,
                    userID:         userID,
                    organizationID: organizationID
                }
            };

            $http(req).success(function (response) {
                if (response.success) {
                    // todo: update order list
                    alert(response.order_id);
                    $scope.updateProductsListAndOrderSummaries($scope.productsList, $scope.activeParty.store_id, token, organizationID);
                }
            });

            /*
            $http.post('/api/v1/order', {
                    token: token,
                    organizationID: organizationID,
                    user_id: userID,
                    party_id: $scope.activeParty.party_id,
                    store_id: $scope.activeParty.store_id,
                    product:  this.productName,
                    price:    this.price,
                    note:     this.note
                }).then(function (response) {
                    if (response.success) {
                        alert(response.order_id);
                }
                });
            */
        }
    };

    // string
    $scope.storeName = '幸福主';

    $scope.clickOrder = function (orderSummary) {
        if ($scope.selectOrderSummary === orderSummary) {
            $scope.selectOrderSummary = null;
            return;
        }
        $scope.selectOrderSummary = orderSummary;

        // todo: GET products list
        //$scope.updateProductsList($scope.activeParty.store_id, $scope.productsList, token, organizationID);

        var req = {
            method: 'GET',
            url: '/api/v1/store/' + $scope.activeParty.store_id + '/products',
            params: {
                token:          token,
                userID:         userID,
                organizationID: organizationID
            }
        };
        $http(req).success(function (response) {
            if (response.success) {

                //format: { product_id, product_name, store_id, price }
                var selProductInStore = null;
                for (var i = 0; i < response.products.length; i++) {
                    if (response.products[i].product_name == $scope.selectOrderSummary.product) {
                        selProductInStore = response.products[i];
                        break;
                        //alert($scope.selectOrderSummary.product);
                        // todo: get product list
                        // todo: show product info and comments.
                    }
                }

                $scope.selectProductComments = null;
                if (selProductInStore) {
                    var req = {
                        method: 'GET',
                        url: '/api/v1/product/' + selProductInStore.product_id + '/comments',
                        params: {
                            token: token,
                            userID:         userID,
                            organizationID: organizationID
                        }
                    };
                    $http(req).success(function (response) {
                        if (response.success) {
                            $scope.selectProductComments = response.comments;
                            //alert(JSON.stringify(response.comments));
                        }
                    });
                }
            }
        });
    };


    // display today
    // 0 ~ 6
    var today = new Date('2015-7-13 10:00:00'); // for test
    var baseDate = new Date();
    baseDate.setDate(today.getDate() - today.getDay());
    //alert(baseDate);

    // fill weekbar
    $scope.todayDay = today.getDay();
    $scope.daysInWeek = [];
    for (var i = 0; i <= 6; i++) {
        var curDate = new Date();

        curDate.setDate(baseDate.getDate() + i);
        //$('.day-' + i + ' p').text(curDate);
        $scope.daysInWeek.push(curDate);
    }

    // build party main frame
    var curYear = '2015';
    var curMonth = '7';
    var reqUrl = '/api/v1/parties/' + curYear + '/' + curMonth;
    var req = {
        method: 'GET',
        url: reqUrl,
        params: {
            token:          token,
            userID:         userID,
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
            $scope.updateProductsListAndOrderSummaries($scope.productsList, $scope.activeParty.store_id, token, organizationID);

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
})

.controller('browseController', function ($scope, $http) {
    
    var info = getInfoFromCookies(docCookies);
    var token = info.token;
    var organizationID = info.organizationID;
    var userID = info.userID;
    
    // todo: handle browse request
    
    /*
     * storesList: Array
     * store: { id, name, phone_number, create_date, min_spending, image }
     */
    $scope.storesList = [];
    getStoresList($http, token, $scope.storesList);
    
    $scope.selectStore = null;
    
    $scope.clickStore = function (storeIndex) {
        //alert('Enter clickStore');
        if ($scope.selectStore) {
            $scope.selectStore = null;
            $scope.selectProduct = null;
            $scope.productsList.length = 0;
            $scope.selectProductComments.length = 0;
        }
        else {
            $scope.selectStore = $scope.storesList[storeIndex];
            $scope.productsList.length = 0;
            getProductsList($http, token, $scope.selectStore.id, $scope.productsList);
        }
    };
    
    /*
     * productsList: Array
     * products: [ { product_id, product_name, store_id, price }, { ... }, ... ]
     */
    $scope.productsList = [];
    $scope.selectProduct = null;
    
    $scope.clickProduct = function (productIndex) {
        if ($scope.selectProduct) {
            $scope.selectProduct = null;
            $scope.selectProductComments.length = 0;
        }
        else {
            $scope.selectProduct = $scope.productsList[productIndex];
            $scope.selectProductComments.length = 0;
            getCommentsList($http, token, $scope.selectProduct.product_id, $scope.selectProductComments);
        }
    };
    
    /*
     * comments: [
            {
                comment_id: integer,
                product_id: integer,
                product_name: string,
                user_id: integer,
                user_name: string,
                text: string, // markdown
                date: string,
                stars: integer
            },
            ...
        ]
     */
    $scope.selectProductComments = [];
});

