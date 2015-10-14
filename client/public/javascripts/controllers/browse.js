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
    
    $scope.submitStoreImage = function () {
        alert($scope.storeImage);
    }
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
}]);