/* global app */
/* global docCookies */
/* global getInfoFromCookies */

/* Update store from server. */
function UpdateStore($http, token, storeID, field, value, successCallback) {
    var data = {};
    data[field] = value;
    data['token'] = token;
    
    return $http.put('/api/v1/store/' + storeID, data)
    .success(function (res) {
        successCallback();
        if (res.success) {
            return true;
        } else {
            return res.message;
        }
    })
    .error(function (res) {
        return 'server connection failed.';
    });
}

function UpdateProduct($http, token, productID, field, value, successCallback) {
    var data = {};
    data[field] = value;
    data['token'] = token;
    
    return $http.put('/api/v1/product/' + productID, data)
    .then(function (res) {
        successCallback();
        if (res.status == 201) {
            return true;
        } else {
            return res.data.message;
        }
    }, function (res) {
        return res.data.message;
    });
    
}

/* text validation, xeditable compatible */
function validateText(inputText, orginText, fieldCaption, updateCallback, args) {
    if (inputText === orginText) {
        return false;
    } else if (inputText === '') {
        return fieldCaption + '不能為空！';
    } else if (confirm('確定修改' + fieldCaption + '為 ' + inputText + '？')) {
        return updateCallback.apply(this, args);
    } else {
        return false;
    }
}

/* Initialize controllers */
app

// share data between controllers.
.factory('selectStoreService', function () {
    return { data: null };
});

app.run(function(editableOptions) {
    editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});

app.directive('commentCreation', function () {
    var scripts = document.getElementsByTagName("script")
    var currentScriptPath = scripts[scripts.length-1].src;
    currentScriptPath = currentScriptPath.replace('browse.js', '');
    //alert(currentScriptPath);
    return {
        restrict: 'EA',
        templateUrl: currentScriptPath + '../directives/comment-creation.html'
    };
});

app
.controller('browseController', function ($scope, $http, userInfoService, selectStoreService) {
    
    var info = getInfoFromCookies(docCookies);
    var token = info.token;
    var organizationID = info.organizationID;
    var userID = info.userID;
    
    // get role
    userInfoService.update(userID, organizationID, token);
    $scope.userInfo = userInfoService;
    
    /*
     * storesList: Array
     * store: { 
     *   id, 
     *   name, 
     *   phone_number, 
     *   create_date, 
     *   min_spending, 
     *   image,
     * 
     *   newName,
     *   newPhoneNumber,
     *   newMinSpending
     *  }
     */
    $scope.storesList = [];
    $scope.storeFilterValue = '';
    function setSelectStore(value) {
        $scope.selectStore = value;
        // for controller comunication
        selectStoreService.data = value;
    }
    setSelectStore(null);
    
    
    
    $scope.onUpdateStoreName = function (data) {
        return UpdateStore($http, token, $scope.selectStore.id, 'name', data);
    };
    
    $scope.onUpdateStoreName = function (data) {
        var args = [];
        args.push($http);
        args.push(token);
        args.push($scope.selectStore.id);
        args.push('name');
        args.push(data);
        args.push(updateStoresList);
        var updateFunc = UpdateStore;
        return validateText(
            data.trim(), 
            $scope.selectStore.name.trim(), 
            '商品',
            updateFunc,
            args);
    };
    
    $scope.onUpdateStorePhoneNumber = function (data) {
        var args = [];
        args.push($http);
        args.push(token);
        args.push($scope.selectStore.id);
        args.push('phone_number');
        args.push(data);
        args.push(updateStoresList);
        var updateFunc = UpdateStore;
        return validateText(
            data.trim(), 
            $scope.selectStore.phone_number.trim(), 
            '電話',
            updateFunc,
            args);
    };
    
    $scope.onUpdateStoreMinSpending = function (data) {
        var args = [];
        args.push($http);
        args.push(token);
        args.push($scope.selectStore.id);
        args.push('min_spending');
        args.push(data);
        args.push(updateStoresList);
        var updateFunc = UpdateStore;
        return validateText(
            data.trim(), 
            $scope.selectStore.min_spending.trim(), 
            '滿多少外送',
            updateFunc,
            args);
    };
    
    $scope.onUpdateProductPrice = function (data, product) {
        var args = [];
        args.push($http);
        args.push(token);
        args.push(product.product_id);
        args.push('price');
        args.push(data);
        args.push(updateProductsList);
        var updateFunc = UpdateProduct;
        return validateText(
            data.trim(), 
            product.price.trim(), 
            '售價',
            updateFunc,
            args);
    };
    
    /*
     * productsList: Array
     * products: [ { product_id, product_name, store_id, price }, { ... }, ... ]
     */
    $scope.productFilterValue = '';
    $scope.productsList = [];
    $scope.selectProduct = null;
    
    /* clear all stores data */
    function clearStores() {
        setSelectStore(null);
        //$scope.selectStore = null;
        $scope.selectProduct = null;
        $scope.storesList.length = 0;
        $scope.productsList.length = 0;
        $scope.selectProductComments.length = 0;
    }
    /* update stores list and selected store. */
    function updateStoresList() {
        var orgSelStoreID = -1;
        if ($scope.selectStore) {
            orgSelStoreID = $scope.selectStore.id;
        }
        setSelectStore(null);
        clearStores();
        getStoresList($http, token, $scope.storesList, function () {
            
            $scope.storesList.forEach(function (store, index, list) {
                // add edit field
                store.newName = store.name;
                store.newPhoneNumber = store.phone_number;
                store.newMinSpending = store.min_spending;
                if (store.id == orgSelStoreID) {
                    setSelectStore(store);
                }
            })
            
        });
        //clearProducts();
        //getProductsList($http, token, $scope.selectStore.id, $scope.productsList);
    }
    function updateProductsList() {
        clearProducts();
        getProductsList($http, token, $scope.selectStore.id, $scope.productsList, function (products) {
            // Initialize new fields.
            products.forEach(function (product, index) {
                product.newName = product.product_name;
                product.newPrice = product.price;
            });
        });
    }
    /* Event: click store component. */
    $scope.clickStore = function (store) {
        //alert('Enter clickStore');
        if ($scope.selectStore 
        && $scope.selectStore.id == store.id) {
            //clearStores();
            setSelectStore(null);
            //$scope.selectStore = null;
            $scope.selectProduct = null;
            $scope.productsList.length = 0;
        }
        else {
            //updateStoresList();
            setSelectStore(store);
            //$scope.selectStore = $scope.storesList[storeIndex];
            updateProductsList();
        }
    };
    
    //getStoresList($http, token, $scope.storesList);
    //updateStoresList();
    
    /*
     *  Create store fields.
     */
    $scope.onUploadStoreImageDone = function () {
        //var orgSelStoreID = $scope.selectStore.id;
        //updateProductsList();
        window.location.href = '/browse';
    };
    
    
    $scope.storeCreationFormVisible = false;
    $scope.onClickStoreCreationButton = function () {
        $scope.storeCreationFormVisible = !$scope.storeCreationFormVisible;
    };
    
    /*
     req.body: {
        name: string,
        phone_number: string,
        min_spending
    }
    res: {
        success: boolean,
        store_id: integer
    }
     */
    $scope.newStore = {
        name: '',
        phone_number: '',
        min_spending: 0,
        initialize: function () {
            this.name = '';
            this.phone_number = '';
            this.min_spending = 0;
        }
    };
    $scope.onSubmitNewStore = function(newStore) {
        if (newStore.name == '') {
            alert('店家名稱不可空白！');
            return;
        }
        
        if (newStore.phone_number == '') {
            alert('電話不可空白！');
            return;
        }
        
        if (newStore.min_spending < 0) {
            alert('最小外送金額不可小於 0 ！');
            return;
        }
        
        if (confirm('確定新增店家：' + newStore.name + '？')) {
            var postData = angular.copy(newStore);
            postData.token = token;
            $http({
                url: '/api/v1/store',
                method: 'POST',
                data: postData
                
            })
            .success(function (res) {
                $scope.storesList.length = 0;
                updateStoresList();
            })
            .error(function (res) {
                alert(JSON.stringify(res));
            })
            .finally(function() {
                $scope.newStore.initialize()
                angular.element('.new-store-name').trigger('focus');
            });
        }
    }
    $scope.onClickNewStoreCancel = function () {
        $scope.storeCreationFormVisible = false;
    }
    
    /*
    purpose: 建立 party
    path: /api/v1/party
    method: POST
    req.body: {
        name: string,
        organization_id: integer,
        creator_id: integer,
        store_id: integer,
        create_date: string,
        expired_date: string
    }
    
    res: {
        success: boolean
        party_id: integer
    }
    */
    // todo: get local time
    var now = new Date();
    var expiredDate = new Date();
    expiredDate.setHours(now.getHours() + 1);
    expiredDate.setMinutes(0);
    expiredDate.setSeconds(0);
    $scope.newParty = {
        name: '',
        organization_id: organizationID,
        creator_id:      userID,
        store_id:        undefined,
        create_date:     now,
        expired_date:    expiredDate
    }
    // todo: check privilege
    
    
    $scope.partyCreationVisible = true;
    $scope.partyCreationFormVisible = false;
    $scope.onClickPartyCreationButton = function () {
        if (!$scope.selectStore) {
            alert('未選取店家！');
            return;
        }
        
        $scope.partyCreationFormVisible = true;
        
        // todo: generate default party name; create_date; expired_date
        if ($scope.partyCreationFormVisible) {
            // Default party name: store name
            $scope.newParty.name = $scope.selectStore.name;
        }
    }
    $scope.onClickPartyCreationCancel = function () {
        $scope.partyCreationFormVisible = false;
    }
    
    $scope.onSubmitNewParty = function (newParty) {
        if (!$scope.selectStore) {
            alert('未選取店家！');
            return;
        }
        if (confirm('確定新增' + PARTY + ': ' + $scope.newParty.name + ' ?')) {
            $scope.newParty.store_id = $scope.selectStore.id;
            $http({
                url: '/api/v1/party',
                method: 'POST',
                data: {
                    name:            $scope.newParty.name,
                    organization_id: $scope.newParty.organization_id,
                    creator_id:      $scope.newParty.creator_id,
                    store_id:        $scope.newParty.store_id,
                    create_date:     getDateTimeString($scope.newParty.create_date),
                    expired_date:    getDateTimeString($scope.newParty.expired_date),
                    token:           token
                }
            })
            .then(function (res) {
                $scope.partyCreationFormVisible = false;
            });
            //alert(JSON.stringify(newParty));
        }
    };
    
    
    function clearProducts() {
        $scope.selectProduct = null;
        $scope.productsList.length = 0;
        $scope.selectProductComments.length = 0;
    }
    $scope.clickProduct = function (product) {
        if ($scope.selectProduct
            && product.product_id == $scope.selectProduct.product_id) {
            $scope.selectProduct = null;
            $scope.newComment.productID = -1;
            $scope.selectProductComments.length = 0;
            //clearProducts();
        }
        else {
            $scope.selectProduct = product;
            $scope.newComment.productID = product.product_id;
            $scope.selectProductComments.length = 0;
            getCommentsList($http, token, $scope.selectProduct.product_id, $scope.selectProductComments);
        }
    };
    
    $scope.newProduct = {
        enable: true, // todo: check privilege
        formVisible: false,
        data: {
            name: '',
            price: 0.0
        },
        initialize: function () {
            this.data.name = '';
            this.data.price = 0.0;
        },
        onClickFormVisible: function () {
            this.formVisible = true;
        },
        onSubmit: function (newProduct) {
            if (!$scope.selectStore) {
                alert('請選擇店家！');
                return;
            }
            
            if (confirm('添加商品 ' + this.data.name + '，售價 ' + this.data.price + ' 元？')) {
                $http({
                    url: '/api/v1/product',
                    method: 'POST',
                    data: {
                        store_id: $scope.selectStore.id,
                        name: this.data.name,
                        price: this.data.price,
                        token: token
                    }
                })
                .success(function (res) {
                    if (res.success) {
                        updateProductsList();
                        $scope.newProduct.initialize();
                        //updateStoresList();
                    }
                    else {
                        console.log(res.message);
                        alert('新增商品出錯！');
                    }
                    angular.element('.new-product-name').trigger('focus');
                })
                .error(function (res) {
                    console.log('POST product failed.');
                    console.log(JSON.stringify(res));
                    alert('新增商品出錯 ...');
                });
            }
        },
        onCancel: function () {
            this.formVisible = false;
        }
    };
    
    // Initialize $scope.newComment, $scope.selectProductComments
    initializeCommentObjects($scope, $http, token);
    $scope.newComment.onAfterSubmitComment = updateProductsList;
    
    updateStoresList();
})


.controller('fileUploader', ['$scope', 'FileUploader', 'selectStoreService', function($scope, FileUploader, selectStoreService) {
    var info = getInfoFromCookies(docCookies);
    var token = info.token;
    var organizationID = info.organizationID;
    var userID = info.userID;
    
    $scope.selectStoreService = selectStoreService;
    
    // default value
    var reqUrl = 'api/v1/store/';
    var uploader = $scope.uploader = new FileUploader({
        url: reqUrl,
        method: 'PUT'
    });
    uploader.headers['x-access-token'] = token;

    // FILTERS

    uploader.filters.push({
        name: 'customFilter',
        fn: function(item /*{File|FileLikeObject}*/, options) {
            return this.queue.length < 10;
        }
    });
    

    // CALLBACKS

    uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/, filter, options) {
        console.info('onWhenAddingFileFailed', item, filter, options);
    };
    uploader.onAfterAddingFile = function(fileItem) {
        //console.log(JSON.stringify($scope.selectStoreService));
        var reqUrl = '/api/v1/store/'  + $scope.selectStoreService.data.id;
        console.log(reqUrl);
        //$scope.uploader.url = reqUrl;
        fileItem.url = reqUrl;
        console.info('onAfterAddingFile', fileItem);
    };
    uploader.onAfterAddingAll = function(addedFileItems) {
        console.info('onAfterAddingAll', addedFileItems);
    };
    uploader.onBeforeUploadItem = function(item) {
        console.info('onBeforeUploadItem', item);
    };
    uploader.onProgressItem = function(fileItem, progress) {
        console.info('onProgressItem', fileItem, progress);
    };
    uploader.onProgressAll = function(progress) {
        console.info('onProgressAll', progress);
    };
    uploader.onSuccessItem = function(fileItem, response, status, headers) {
        console.info('onSuccessItem', fileItem, response, status, headers);
    };
    uploader.onErrorItem = function(fileItem, response, status, headers) {
        console.info('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCancelItem = function(fileItem, response, status, headers) {
        console.info('onCancelItem', fileItem, response, status, headers);
    };
    uploader.onCompleteItem = function(fileItem, response, status, headers) {
        console.info('onCompleteItem', fileItem, response, status, headers);
    };
    uploader.onCompleteAll = function() {
        console.info('onCompleteAll');
        alert('上傳成功！');
    };

    console.info('uploader', uploader);
}])

.controller('dateTimeController', function(datetime) {
    var parser = datetime("yyyy-MM-dd hh:mm:ss");
    parser.setDate(new Date);
    parser.getText();
})

.filter('productFilter', function () {
    return function (items, wildcard) {
      var filtered = [];
      angular.forEach(items, function (item) {
          if (item.product_name.match(wildcard)) {
              filtered.push(item);
          }
      });
      
      return filtered;
    };
})

.filter('storeFilter', function () {
    return function (items, wildcard) {
      var filtered = [];
      angular.forEach(items, function (item) {
          if (item.name.match(wildcard)) {
              filtered.push(item);
          }
      });
      
      return filtered;
    };
})
;