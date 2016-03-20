'use strict';

/*
 * Resource stirngs.
 */

var PARTY = '便當團';
var STORE = '店家';
var PRODUCT = '商品';

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
function getStoresList($http, token, outStoresList, successCallback) {
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
            if (successCallback) {
                successCallback();
            }
        }
    });
}

/*
 * Get products list by storeID.
 * @Param after: function (list)
 * Return: [ { product_id, product_name, store_id, price }, { ... }, ... ]
 */
function getProductsList($http, token, storeID, outProductsList, after) {
    
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
            
            if (after) {
                after(outProductsList);
            }
        }
    });
}

/*
 * Get comments list.
 * comment: {
 *   ...,
 *   createDate: Date
 * }
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
                outCommentsList[outCommentsList.length - 1].createDate = new Date(response.comments[i].date);
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

function initializeCommentObjects($scope, $http, token) {
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
    function updateCommentsList(productID) {
        $scope.selectProductComments.length = 0;
        getCommentsList($http, token, productID, $scope.selectProductComments);
    }
    
    /* Comment creation structure */
    $scope.newComment = {
        productID: -1,
        enable: true,
        formVisible: false,
        text: '',
        stars: 3,
        image: '',
        onClickFormVisible: function () {
            this.formVisible = true;
        },
        onClickSubmit: function (userID) {
            var curObject = this;
            var curProductID = this.productID;
            if (confirm('確定發表評論？')) {
                var curNewComment = $scope.newComment;
                $http({
                    url: '/api/v1/product/comment',
                    method: 'POST',
                    data: {
                        product_id: curProductID,
                        comment_user_id: userID,
                        text: this.text,
                        stars: this.stars,
                        image: '',
                        token: token
                    }
                })
                .success(function (res) {
                    updateCommentsList(curProductID);
                })
                .error(function (res) {
                    alert(JSON.stringify(res));
                })
                .finally(function () {
                    curNewComment.text = '';
                    curNewComment.stars = 3;
                    curObject.formVisible = false;
                    if (curObject.onAfterSubmitComment) {
                        curObject.onAfterSubmitComment();
                    }
                });
            }
        },
        onClickCancel: function () {
            this.formVisible = false;
        },
        onAfterSubmitComment: null
    };
}

/* 
 * Get query string value.
 */
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/*
 * Return date time format: yyyy-MM-dd
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

/*
 * Convert yyyy-MM-dd hh:mm:ss to yyyy/MM/dd hh:mm:ss 
 */
function DateStandardFormat(dateString) {
    var newDate = dateString.replace(new RegExp('-', 'g'), '/'); 
    return newDate;
}

if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}