var express = require('express');
var routes = require('./server/routes/index');
var user = require('./server/routes/user');
var http = require('http');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
var busboy = require('connect-busboy'); //middleware for form/file upload

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);

// views engine
app.set('views', path.join(__dirname, 'client', 'views'));
app.set('view engine', 'jade');

//console.log(app.get('superSecret'));

//app.use(express.favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(busboy());
//app.use(express.methodOverride());
//app.use(app.router);
app.use(express.static(path.join(__dirname, 'client', 'public')));

app.use('/', routes);

// development only
if ('development' == app.get('env')) {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.sendFile(path.join(__dirname, 'client', 'views', 'error'), {
            message: err.message,
            error: err
        });
    });
}

/*
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
*/

//app.get('/', routes.index);
//app.get('/users', user.list);


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

