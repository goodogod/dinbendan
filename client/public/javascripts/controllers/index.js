/* global getDateTimeString */
/* global DateStandardFormat */
'use strict';

function Party(name, party_id, creator_id, store_id, creator, store, 
    create_date, expired_date, ready, orders_count) {
    this.name = name;
    this.party_id = party_id;
    this.creator_id = creator_id;
    this.store_id = store_id;
    this.store = store;
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
        /*
          Available condition:
          * party not ready. 
        */
        return (!this.ready && this.createDate.getTime() <= today.getTime() && today.getTime() <= this.expiredDate.getTime());
        //return (!this.ready);
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

app.directive('commentCreation', function () {
    var scripts = document.getElementsByTagName("script")
    var currentScriptPath = scripts[scripts.length-1].src;
    currentScriptPath = currentScriptPath.replace('index.js', '');
    //alert(currentScriptPath);
    return {
        restrict: 'EA',
        templateUrl: currentScriptPath + '../directives/comment-creation.html'
    };
});

app

.controller('mainController', function ($scope, $http, $interval, userInfoService) {
    
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
    
    userInfoService.update(userID, organizationID, token);
    $scope.userInfo = userInfoService;

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
    
    // update 'today' object every second.
    $interval(function () { 
        $scope.today = new Date();
    }, 1000);
    
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
              comments,
              newProduct,
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
    $scope.updateOrderSummaries = function (orderSummaries, activeParty, productsList, token, organizationID, after) {
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
                            var comments = 0;
                            var productExists = false;
                            productsList.forEach(function (product) {
                                if (product.product_name === curOrder.product) {
                                    comments = product.comments;
                                    productExists = true;
                                }
                            })
                            
                            var newSummary = {
                                product: curOrder.product,
                                price: curOrder.price,
                                comments: comments,
                                newProduct: !productExists,
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
                            comments: productsList[i].comments,
                            newProduct: false,
                            users: []
                        });
                    }
                }
                
                if (after) {
                    after();
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
                price: float,
                comments: integer
            },
            { ... },
            ...
        ]
    */
    $scope.productsList = [];
    $scope.updateProductsListAndOrderSummaries = function (productsList, storeID, token, organizationID, after) {
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

                $scope.updateOrderSummaries($scope.orderSummaries, $scope.activeParty, productsList, token, organizationID, after);
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
        /* { product, price, users, note } */
        orderResults: [],
        
        onShow: function() {
            if (!$scope.activeParty) {
                return;
            }
            var thisPartyResult = this;
            $scope.updateProductsListAndOrderSummaries(
                $scope.productsList, 
                $scope.activeParty.store_id, 
                token, organizationID,
                function () {
                    // It must update result after orders are updated.
                    thisPartyResult.updateOrderResults(thisPartyResult.orderResults);
                    // Use js to show modal manually.
                    $('#party-result-modal').modal();
                });
            
            
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
                        window.location.reload();
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
        },
        
        getTotalCount: function () {
            var total = 0;
            this.orderResults.forEach(function (summary) {
                total = total + summary.users.length;
            });
            return total;
        }
    };

    $scope.onDeleteParty = function (party) {
        if (confirm('真的要刪除便當團: 『' + party.name + '』 ？')) {
            var req = {
                method: 'PUT',
                url: '/api/v1/party/' + party.party_id + '/delete',
                data: {
                    deleted: 'TRUE'
                },
                params: {
                    token:          token,
                    userID:         userID,
                    organizationID: organizationID
                }
            };

            $http(req).then(function (response) {
                window.location.reload();
            });
        }
    };

    /*******************************
    format: {
          product_id, // < 0 if product is new.
          product,
          price,
          comments,
          newProduct,
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
            stars: integer,
            
            createDate: Date
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
            var validPrice = 0.0;
            try {
                validPrice = parseFloat(this.price);
                if (validPrice <= 0.0) {
                    alert('金額不能小於 0 元！');
                    return;
                } else if (validPrice > 10000) {
                    alert('金額不能超過 10000 元！');
                    return;
                } else if (isNaN(validPrice)) {
                    alert('輸入的金額有誤！');
                    return;
                }
            } catch (error) {
                alert('輸入的金額有誤！');
                return;
            }
            if (confirm('確定訂購 ' + this.productName + '(金額: ' + validPrice + ' 元) ?')) {
                var req = {
                    method: 'POST',
                    url: '/api/v1/order',
                    data: {
                        user_id:  userID,
                        party_id: $scope.activeParty.party_id,
                        store_id: $scope.activeParty.store_id,
                        product:  this.productName,
                        price:    validPrice,
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
                        } else if (response.exception === 'priceIncorrect') {
                            alert('商品金額與資料不符！');
                        } else {
                            alert(response.message);
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
        $scope.selectOrderSummary.product_id = -1;
        $scope.selectOrderSummary.addProduct = function () {
            // POST new product to current store.
            var newProduct = $scope.selectOrderSummary.product;
            var newProductPrice = $scope.selectOrderSummary.price;
            var storeName = $scope.activeParty.store;
            var storeID = $scope.activeParty.store_id;
            if (confirm('新增 {0} (售價：{1}) 到 {2} ？'.format(newProduct, newProductPrice, storeName))) {
                $http({
                    url: '/api/v1/product',
                    method: 'POST',
                    data: {
                        store_id: storeID,
                        name: newProduct,
                        price: newProductPrice,
                        token: token
                    }
                })
                .success(function (res) {
                    if (res.success) {
                        window.location.reload();
                    }
                    else {
                        console.log(res.message);
                        alert('新增商品出錯！');
                    }
                })
                .error(function (res) {
                    console.log('POST product failed.');
                    console.log(JSON.stringify(res));
                    alert('新增商品出錯 ...');
                });
            }
        }

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

                $scope.selectProductComments.length = 0;
                
                
                $scope.selectProductComments.length = 0;
                if (selProductInStore) {
                    getCommentsList($http, token, selProductInStore.product_id, $scope.selectProductComments);
                    
                    $scope.newComment.productID = selProductInStore.product_id;
                    
                    // 保留給新建商品
                    $scope.selectOrderSummary.product_id = selProductInStore.product_id;
                    
                    // Fill 
                    $scope.inputOrder.productName = selProductInStore.product_name;
                    $scope.inputOrder.price = selProductInStore.price;
                    $scope.inputOrder.note = '';
                }
                else {
                    // probably new product
                    // 保留給新建商品
                    $scope.selectOrderSummary.product_id = -1;
                    $scope.newComment.productID = -1;
                    
                    $scope.inputOrder.productName = $scope.selectOrderSummary.product;
                    $scope.inputOrder.price = $scope.selectOrderSummary.price;
                    //$scope.inputOrder.initialize();
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
            
            // add createDate, expiredDate to all parties
            response.parties.forEach(function (party) {
                // response time format: yyyy-mm-dd hh:mm:ss
                party.createDate = new Date(DateStandardFormat(party.create_date));
                party.expiredDate = new Date(DateStandardFormat(party.expired_date));
            });
            
            // Create $scope.todayParties
            $scope.todayParties.length = 0;
            response.parties.forEach(function (party) {
                /* 
                  目的: 顯示有關今天的 party.
                  ex: 
                    party.createDate = '2016-3-1 09:10:10'
                    party.expiredDate = '2016-3-3 11:00:00'
                    paramDate = 2016-3-2
                    則判斷依據為:
                    '2016-3-1 00:00:00' <= paramDate <= '2016-3-4 00:00:00'
                    注意 expiredDate 刻意 date + 1.
                */
                var partyCreateDate = new Date(party.createDate);
                partyCreateDate.setHours(0);
                partyCreateDate.setMinutes(0);
                partyCreateDate.setSeconds(0);
                var partyExpiredDate = new Date(party.expiredDate);
                partyExpiredDate.setHours(0);
                partyExpiredDate.setMinutes(0);
                partyExpiredDate.setSeconds(0);
                partyExpiredDate.setDate(partyExpiredDate.getDate() + 1);
                
                if (partyCreateDate <= $scope.paramDate
                 && $scope.paramDate <= partyExpiredDate) {
                    $scope.todayParties.push(party);
                }
            });
            
            // active last party
            if ($scope.todayParties.length > 0) {
                //var selParty = $scope.todayParties[$scope.todayParties.length - 1];
                var selParty = null;
                if (queryPartyID !== "") {
                    $scope.todayParties.forEach(function (party, index) {
                        if (party.party_id == queryPartyID) {
                            selParty = party;
                        }
                    });
                }
                
                /* 
                Find appropriate active party:
                    if not ready:
                        if expired at today:
                            if on time:
                                choose last one
                            else:
                                choose last one
                        else:
                            if find other parties not ready:
                                choose last one
                            else:
                                choose last one
                    else:
                        choose last one
                */
                
                if (selParty == null) {
                    var candidateParties = $scope.todayParties
                        .filter(function partyNotReady(party, index) {
                        if (party.ready == false) {
                            return true;
                        } else {
                            return false;
                        }
                    })
                    .filter(function expiredAtToday(party, index) {
                        if (party.expiredDate.getFullYear() == $scope.paramDate.getFullYear() &&
                            party.expiredDate.getMonth() == $scope.paramDate.getMonth() &&
                            party.expiredDate.getDate() == $scope.paramDate.getDate() ) {
                            return true;
                        } else {
                            return false;
                        } 
                    })
                    /*
                    .filter(function partyOnTime(party, index) {
                        if (getDateTimeString(party.createDate) <= getDateTimeString($scope.today) &&
                            getDateTimeString($scope.today) <= getDateTimeString(party.expiredDate)) {
                              return true;
                          } else {
                              return false;
                          }
                    })
                    */
                    ;
                    
                    if (candidateParties.length > 0) {
                        selParty = candidateParties[candidateParties.length - 1];
                    } else {
                        // search not ready
                        var notReadyParties = $scope.todayParties.filter(function partyNotReady(party, index) {
                            if (party.ready == false) {
                                return true;
                            } else {
                                return false;
                            }
                        });
                        if (notReadyParties.length > 0) {
                            selParty = notReadyParties[notReadyParties.length - 1];
                        } else {
                            selParty = $scope.todayParties[$scope.todayParties.length - 1];
                        }
                    }
                }
                
                //$scope.activeParty = selParty;
                $scope.activeParty = new Party(selParty.name, selParty.party_id,
                    selParty.creator_id, selParty.store_id, selParty.creator,
                    selParty.store, selParty.create_date, selParty.expired_date,
                    selParty.ready, selParty.orders_count);
            } else {
                $scope.activeParty = null;
            }
            

            // initialize orderSummaries
            if ($scope.activeParty) {
                $scope.activeStore.initialize($http, token, $scope.activeParty.store_id);
                $scope.updateProductsListAndOrderSummaries($scope.productsList, $scope.activeParty.store_id, token, organizationID);
            }

        } // end of if (response.success)
    });
    
    initializeCommentObjects($scope, $http, token);
    // 更新 comment 後, 執行 onAfterSubmitComment post hook, 更新 order summaries.
    $scope.newComment.onAfterSubmitComment = function () {
        $scope.updateProductsListAndOrderSummaries(
            $scope.productsList, $scope.activeParty.store_id, token, organizationID,
            function () {
                $scope.selectOrderSummary = null;
            }
        );
    };
    
    $scope.orderResultFilterValue = '';
    
    $scope.range = function(n) {
        return new Array(n);
    };
    
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

.filter('availableResultFilter', function () {
    return function (items) {
        var filtered = [];
        angular.forEach(items, function (item) {
            if (item.users.length > 0) {
                filtered.push(item);
            }
        });
        
        return filtered;
    }
})

.filter('weekDayFilter', function () {
    return function (day) {
        var weekStr = '';
        switch (day.getDay()) {
            case 0:
                weekStr = '週日';
                break;
            case 1:
                weekStr = '週一';
                break;
            case 2:
                weekStr = '週二';
                break;
            case 3:
                weekStr = '週三';
                break;
            case 4:
                weekStr = '週四';
                break;
            case 5:
                weekStr = '週五';
                break;
            case 6:
                weekStr = '週六';
                break;
            default:
                console.log('Weekday code error: ' + day.getDay());
        }
        var mon = day.getMonth() + 1;
        return mon + '/' + day.getDate() + ' ' + weekStr;
    }
})



;