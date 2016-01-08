'use strict';

function Party(name, party_id, creator_id, store_id, creator, store, 
    create_date, expired_date, ready, orders_count) {
    this.name = name;
    this.party_id = party_id;
    this.creator_id = creator_id;
    this.store_id = store_id;
    this.creator = creator;
    this.create_date = create_date;
    this.expired_date = expired_date;
    this.ready = ready;
    this.orders_count = orders_count;
    
    this.createDate = new Date(DateStandardFormat(this.create_date));
    this.expiredDate = new Date(DateStandardFormat(this.expired_date));
}
Party.prototype = {
    constructor: Party,
    available: function (today) {
        return (this.createDate.getTime() <= today.getTime() && today.getTime() <= this.expiredDate.getTime());
    }
};

/*
 * Store definiition
 */
function Store() {
    this.name = '';
    this.phoneNumber = '';
    this.image = '';
    this.minSpending = 0;
}
Store.prototype = {
    constructor: Store,
    initialize: function ($http, token, storeID) {
        var curStore = this;
        $http({
            url: '/api/v1/store/' + storeID,
            method: 'GET',
            params: {
                token: token
            }
        })
        .success(function (response) {
            if (response.success) {
                curStore.name = response.store.name;
                curStore.phoneNumber = response.store.phone_number;
                curStore.image = response.store.image;
                curStore.minSpending = parseInt(response.store.min_spending);
            } 
            else {
                // todo: error handling
            }
        });
    }
};

/*======================================================
  Control main page.
======================================================*/
angular.module('main')

.controller('mainController', function ($scope, $http, userInfoService) {
    
    /*
     * query string: d=yyyymmdd,p=id
     * d && p:  show the party on the date.
     * d:       show first party on the date.
     * p:       show today first party.
     * nothing: show today first party. 
     */
    
    // verify id
    var info = getInfoFromCookies(docCookies);
    var token = info.token;
    var organizationID = info.organizationID;
    var userID = info.userID;

    // display today
    // 0 ~ 6
    //var today = new Date('2015-7-13 10:00:00'); // for test
    //var queryDate = $location.search().d;
    var today;
    if (getParameterByName('d')) {
        today = new Date();
        var paramDate = new Date(DateStandardFormat(getParameterByName('d')));
        if (isNaN(paramDate.getTime())) { // Date is invalid
            //today = new Date();
        } else {
            //today = new Date();
            today.setFullYear(paramDate.getFullYear());
            today.setMonth(paramDate.getMonth());
            today.setDate(paramDate.getDate());
        } 
    } else {
        today = new Date();
    }
    $scope.paramDate = today;
    $scope.today = new Date();
    
    var queryPartyID = getParameterByName('p');
    
    
    
    // initialize all scope variables
    $scope.userID = userID;
    $scope.organizationID = organizationID;
    
    $scope.activeStore = new Store();
    $scope.clickStoreImage = function (store) {
        
    };

    /*******************************
     format: [ { party_id, create_date: Date, expired_date: Date }, ...]
    *******************************/
    $scope.todayParties = [];
    $scope.clickParty = function (party) {
        window.location.href = '/?d=' + getDateString($scope.paramDate) + '&p=' + party.party_id;
    };
    
    $scope.productFilterValue = '';

    /*******************************
      orderSummaries: [
          {
              product,
              price,
              users: [
                  {
                      id,
                      name,
                      note,
                      orderID
                  },
                  ...
              ]
          },
          { ... }
      ]
    *******************************/
    $scope.orderSummaries = [];
    $scope.orderSummaries.onDeleteOrder = function (user) {
        if (confirm('確定要取消訂單?')) {
            $http({
                url: '/api/v1/order/' + user.orderID,
                method: 'DELETE',
                params: {
                    token: token
                }
            })
            .success(function (res) {
                if (res.success) {
                    $scope.updateProductsListAndOrderSummaries(
                        $scope.productsList, 
                        $scope.activeParty.store_id, 
                        token, 
                        organizationID);
                }
                else {
                    console.log(res.message);
                    console.log(res.exception);
                    if (res.exception == 'partyWasReady') {
                        alert('Party 已經結束！');
                    }
                    else if (res.exception == 'connectionFailed') {
                        alert('連線異常，請稍候再試！');
                    }
                }
            })
            .error(function (res) {
                // todo: alert error
                console.log(JSON.stringify(res));
            });
            
        }
    };

    // 更新 orderSummaries
    $scope.updateOrderSummaries = function (orderSummaries, activeParty, productsList, token, organizationID) {
        orderSummaries.length = 0;
        if ($scope.activeParty) {
            // get orders list
            var partyID = $scope.activeParty.party_id;
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
                                    id:      curOrder.user_id,
                                    name:    curOrder.user_name,
                                    note:    curOrder.note,
                                    orderID: curOrder.order_id
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
                                name: curOrder.user_name,
                                note: curOrder.note,
                                orderID: curOrder.order_id
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

    
    // Class: Party
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
        
        createDate: Date,
        expiredDate: Date
    }
    *******************************/
    $scope.activeParty = null;
    
    
    $scope.activePartyResult = {
        visible: true, // todo: 根據權限顯示
        modalVisible: false,
        /* { product, price, users, note } */
        orderResults: [],
        
        onShow: function() {
            if (!$scope.activeParty) {
                return;
            }
            $scope.updateProductsListAndOrderSummaries($scope.productsList, $scope.activeParty.store_id, token, organizationID);
            this.updateOrderResults(this.orderResults);
            this.modalVisible = true;
        },
        
        updateOrderResults: function (orderResults) {
            orderResults.length = 0;
            $scope.orderSummaries.forEach(function (summary, index, ar) {
                // write main entry
                var newOrderResult = angular.copy(summary);
                orderResults.push(newOrderResult);
                //orderResults[orderResults.length-1].note = '';
                /*
                summary.users.forEach(function (user, index, er) {
                    if (user.note !== '') {
                        orderResults.push({
                            product: '',
                            price: '',
                            users: [],
                            note: user.note
                        });
                    }
                });
                */
                // write note entries
            });
        },
        
        onMakePartyReady: function () {
            if (confirm('扣款後將無法繼續點餐！是否繼續？')) {
                $http({
                    url: '/api/v1/party/' + $scope.activeParty.party_id + '/ready',
                    method: 'PUT',
                    params: {
                        token: token
                    }
                })
                .success(function (res) {
                    if (res.success) {
                        alert('扣款成功！');
                        window.location = '/';
                    } else {
                        console.log(res.message);
                        alert('扣款出現錯誤！');
                    }
                })
                .error(function (res) {
                    console.log(res.message);
                    alert('連線錯誤！');
                });
            }
        },
        
        getTotalPrice: function () {
            var total = 0;
            this.orderResults.forEach(function (summary) {
                total = total + summary.price * summary.users.length;
            });
            return total;
        }
    };

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
    inputOrder: {
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
            if (confirm('確定訂購 ' + this.productName + '(金額: ' + this.price + ' 元) ?')) {
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
                        console.log(response.order_id);
                        $scope.updateProductsListAndOrderSummaries($scope.productsList, $scope.activeParty.store_id, token, organizationID);
                    } else {
                        console.log(response.message);
                        console.log(response.exception);
                        if (response.exception === 'connectionFailed') {
                            alert('連線錯誤！');
                        } else if (response.exception === 'partyNotExist') {
                            alert('請求的 Party 不存在！');
                        } else if (response.exception === 'partyWasReady') {
                            alert('Party 已結束！');
                        }
                    }
                });
            }
        },
        initialize: function () {
            this.productName = '';
            this.price = 0;
            this.note = '';
        }
    };

    $scope.clickOrder = function (orderSummary) {
        if ($scope.selectOrderSummary === orderSummary) {
            $scope.selectOrderSummary = null;
            $scope.inputOrder.initialize();
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
                    
                    // Fill 
                    $scope.inputOrder.productName = selProductInStore.product_name;
                    $scope.inputOrder.price = selProductInStore.price;
                    $scope.inputOrder.note = '';
                }
                else {
                    $scope.inputOrder.initialize();
                }
            }
        });
    };
    
    var baseDate = new Date($scope.paramDate);
    baseDate.setDate($scope.paramDate.getDate() - $scope.paramDate.getDay());
    //alert(baseDate);

    // fill weekbar
    $scope.todayDay = $scope.paramDate.getDay();
    $scope.daysInWeek = [];
    $scope.clickDate = function (date) {
        var dayString = getDateString(date);
        window.location.href = '/?d=' + dayString;
    };
    for (var i = 0; i <= 6; i++) {
        var curDate = new Date(baseDate);

        curDate.setDate(baseDate.getDate() + i);
        //$('.day-' + i + ' p').text(curDate);
        $scope.daysInWeek.push(curDate);
    }

    // build party main frame
    var curYear = $scope.paramDate.getFullYear();
    var curMonth = $scope.paramDate.getMonth() + 1; // because return value is between 0~11
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
            //alert(JSON.stringify(response.parties));
            //console.log('today: ' + today.getTime());
            for (var i = 0; i < response.parties.length; i++) {
                // response time format: yyyy-mm-dd hh:mm:ss
                
                var start_date = new Date(DateStandardFormat(response.parties[i].create_date));
                var end_date = new Date(DateStandardFormat(response.parties[i].expired_date));
                //console.log('name: ' + response.parties[i].name);
                //console.log('today: ' + today.getTime());
                //console.log('start_date: ' + start_date.getTime());
                //console.log('end_date: ' + end_date.getTime());
                //if (start_date.getTime() <= today.getTime()
                //    && today.getTime() <= end_date.getTime()) {
                if (start_date.getDate() <= $scope.paramDate.getDate() 
                 && $scope.paramDate.getDate() <= end_date.getDate()) {
                    $scope.todayParties.push(response.parties[i]);

                    // active first party
                    if ($scope.todayParties.length > 0) {
                        var selParty = $scope.todayParties[0];
                        if (queryPartyID !== "") {
                            $scope.todayParties.forEach(function (party, index) {
                                if (party.party_id == queryPartyID) {
                                    selParty = party;
                                }
                            });
                        }
                        $scope.activeParty = selParty;
                        $scope.activeParty = new Party(selParty.name, selParty.party_id,
                            selParty.creator_id, selParty.store_id, selParty.creator,
                            selParty.store, selParty.create_date, selParty.expired_date,
                            selParty.ready, selParty.orders_count);
                        console.log($scope.activeParty.createDate.getTime());
                        console.log($scope.activeParty.expiredDate.getTime());
                        console.log($scope.today.getTime());
                        console.log($scope.today);
                    } else {
                        $scope.activeParty = null;
                    }
                }
                //alert(start_date);
                //response[i]
                
            }

            // initialize orderSummaries
            if ($scope.activeParty) {
                $scope.activeStore.initialize($http, token, $scope.activeParty.store_id);
                $scope.updateProductsListAndOrderSummaries($scope.productsList, $scope.activeParty.store_id, token, organizationID);
            }

        } // end of if (response.success)
    });


    $scope.layoutDone = function() {
        //alert('done !');
        $.material.init();

        
        
    }
    
    console.log('可以到 https://github.com/goodogod/dinbendan 看 source code 哦 ^.<');
})

.filter('emptyCountFilter', function () {
    return function (str) {
        if (str == '') {
            return '';
        } else {
            return str;
        };
    }
})

.filter('noteFilter', function () {
    return function (str) {
        if (str == '') {
            return '';
        } else {
            return '1 個：' + str;
        };
    }
})


.filter('productFilter', function () {
    return function (items, wildcard) {
      var filtered = [];
      angular.forEach(items, function (item) {
          if (item.product.match(wildcard)) {
              filtered.push(item);
          }
      });
      
      return filtered;
    };
})

;