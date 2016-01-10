/* global docCookies */
'use strict';

$(document).ready(function() {
    $('.container').show();
});

var app = angular.module('main', ['angularFileUpload', 'datetime', 'xeditable', 'angular-loading-bar']);
