/*
 * Return date time format: yyyy-MM-dd hh:mm:ss
 */
function getDateString(date) {
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
}

/*
 * Return date time format: yyyy-MM-dd hh:mm:ss
 */
function getDateTimeString(date) {
    return getDateString(date) + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds(); 
}

angular.module('main')

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
    $scope.selectStore = null;
    /*
     * productsList: Array
     * products: [ { product_id, product_name, store_id, price }, { ... }, ... ]
     */
    $scope.productsList = [];
    $scope.selectProduct = null;
    
    /* clear all stores data */
    function clearStores() {
        $scope.selectStore = null;
        $scope.selectProduct = null;
        $scope.storesList.length = 0;
        $scope.productsList.length = 0;
        $scope.selectProductComments.length = 0;
    }
    /* update stores list and selected store. */
    function updateStoresList() {
        clearStores();
        getStoresList($http, token, $scope.storesList);
        //clearProducts();
        //getProductsList($http, token, $scope.selectStore.id, $scope.productsList);
    }
    function updateProductsList() {
        clearProducts();
        getProductsList($http, token, $scope.selectStore.id, $scope.productsList);
    }
    /* Event: click store component. */
    $scope.clickStore = function (storeIndex) {
        //alert('Enter clickStore');
        if ($scope.selectStore 
        && $scope.selectStore.id == $scope.storesList[storeIndex].id) {
            //clearStores();
            $scope.selectStore = null;
            $scope.selectProduct = null;
            $scope.productsList.length = 0;
        }
        else {
            //updateStoresList();
            $scope.selectStore = $scope.storesList[storeIndex];
            updateProductsList();
        }
    };
    
    getStoresList($http, token, $scope.storesList);
    
    /*
     *  Create store fields.
     */
    $scope.onUploadStoreImageDone = function () {
        var orgSelStoreID = $scope.selectStore.id;
        updateProductsList();
    };
    
    // todo: check privilege
    $scope.storeCreationVisible = true;
    
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
        min_spending: 0
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
        
        var postData = angular.copy(newStore);
        postData.token = token;
        $http({
            url: '/api/v1/store',
            method: 'POST',
            data: postData
            
        })
        .success(function (res) {
            $scope.storesList.length = 0;
            getStoresList($http, token, $scope.storesList);
        })
        .error(function (res) {
            alert(JSON.stringify(res));
        });
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
            // Default party name: yyyy-MM-dd store name
            $scope.newParty.name = getDateString(now) + ' ' + $scope.selectStore.name;
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
        $scope.newParty.store_id = $scope.selectStore.id;
        $http({
            url: '/api/v1/party',
            method: 'POST',
            data: {
                name: $scope.newParty.name,
                organization_id: $scope.newParty.organization_id,
                creator_id:      $scope.newParty.creator_id,
                store_id:        $scope.newParty.store_id,
                create_date:     getDateTimeString($scope.newParty.create_date),
                expired_date:    getDateTimeString($scope.newParty.expired_date),
                token:           token
            }
        })
        .success(function (res) {
            //$scope.partyAlertVisible = true;
            //alert(JSON.stringify(res));
        })
        .error(function (res) {
            alert(JSON.stringify(res));
        });
        //alert(JSON.stringify(newParty));
    };
    
    
    function clearProducts() {
        $scope.selectProduct = null;
        $scope.productsList.length = 0;
        $scope.selectProductComments.length = 0;
    }
    $scope.clickProduct = function (productIndex) {
        if ($scope.selectProduct
            && $scope.productsList[productIndex].product_id == $scope.selectProduct.product_id) {
            $scope.selectProduct = null;
            $scope.selectProductComments.length = 0;
            //clearProducts();
        }
        else {
            $scope.selectProduct = $scope.productsList[productIndex];
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
            //alert('Clcik submit !');
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
                    alert('新增店家出錯！');
                }
            })
            .error(function (res) {
                console.log('POST product failed.');
                console.log(JSON.stringify(res));
                alert('新增店家出錯 ...');
            });
        },
        onCancel: function () {
            this.formVisible = false;
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
    function updateCommentsList() {
        $scope.selectProductComments.length = 0;
        getCommentsList($http, token, $scope.selectProduct.product_id, $scope.selectProductComments);
    }
    
    /* Comment creation structure */
    $scope.newComment = {
        enable: true,
        formVisible: false,
        text: '',
        stars: 3,
        image: '',
        onClickFormVisible: function () {
            this.formVisible = true;
        },
        onClickSubmit: function () {
            $http({
                url: '/api/v1/product/comment',
                method: 'POST',
                data: {
                    product_id: $scope.selectProduct.product_id,
                    comment_user_id: userID,
                    text: this.text,
                    stars: this.stars,
                    image: '',
                    token: token
                }
            })
            .success(function (res) {
                updateCommentsList();
            })
            .error(function (res) {
                alert(JSON.stringify(res));
            });
        },
        onClickCancel: function () {
            this.formVisible = false;
        }
    };
})


.controller('fileUploader', ['$scope', 'FileUploader', function($scope, FileUploader) {
    var info = getInfoFromCookies(docCookies);
    var token = info.token;
    var organizationID = info.organizationID;
    var userID = info.userID;
    
    var uploader = $scope.uploader = new FileUploader({
        url: '/api/v1/store/1'  /* + $scope.selectStore.id */,
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
    };

    console.info('uploader', uploader);
}])

.controller('dateTimeController', function(datetime) {
    var parser = datetime("yyyy-MM-dd hh:mm:ss");
    parser.setDate(new Date);
    parser.getText();
});