var express = require('express');
var router = express.Router();
var path = require('path');
var pg = require('pg');
var fs = require('fs');
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var connectionString = require(path.join(__dirname, '../../', 'config'));

var secretString = 'haha';

// First, checks if it isn't implemented yet.
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
/* ex: "{0} is dead, but {1} is alive! {0} {2}".format("ASP", "ASP.NET") */

var index_path = path.join(__dirname, '..', '..', 'client', 'views', 'index.html');
var login_path = path.join(__dirname, '..', '..', 'client', 'views', 'login.html');

// page navigation
router.get('/', function(req, res, next) {
	console.log(req.query);
	//res.send('haha!');
	//console.log('GET root');
    console.log('router.get(/): ready to get token: ');

    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    if (token) {
        console.log('router.get(/): get token, ready to verify:');
        // verifies secret and checks exp
        jwt.verify(token, secretString, function(err, decoded) {
            if (err) {
                res.redirect('/login');
            }
            else {
                res.sendFile(index_path);
            }
        })
    }
    else {
        console.log('router.get(/): No token. response login page');
        res.redirect('/login');
        //res.sendFile(login_path);
    }
});

/*
router.post('/', function (req, res) {
    console.log('router.post(/): req.body: ' + req.body.token);
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (token) {
        console.log('router.get(/): get token, ready to verify:');
        // verifies secret and checks exp
        jwt.verify(token, secretString, function(err, decoded) {
            if (err) {
                res.redirect('/login');
            }
            else {
                res.sendFile(index_path);
            }
        })
    }
    else {
        console.log('router.get(/): No token. response login page');
        res.redirect('/login');
        //res.sendFile(login_path);
    }
});
*/

router.get('/login', function (req, res, next) {
    res.sendFile(login_path);
});

/* -------------------------------------------------------------------------- */
// API area

// get auth token
router.post('/api/v1/auth', function(req, res) {
    var user_input_name = req.body.name;
    var user_input_pass = req.body.password;
    console.log('router.post(/api/v1/auth): post auth ~');
    console.log('router.post(/api/v1/auth): ' + user_input_name);
    console.log('router.post(/api/v1/auth): ' + user_input_pass);
    var name_pass_list = [];

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        if (err) {
            return res.json({
                success: false,
                message: 'DB connection failed.'
            });
        }

        console.log('router.post(/api/v1/auth): connection success, ready to query ...');

        // SQL Query > Select Data
        var query = client.query('SELECT name, password FROM users;');

        // Stream name_pass_list back one row at a time
        query.on('row', function(row) {
            name_pass_list.push(row);
        });

        // After all data is returned, close connection and return name_pass_list
        query.on('end', function() {
            client.end();
            //console.log(name_pass_list);
            var name_pass_match = false;
            for (var i = 0; i < name_pass_list.length; i++) {
                if (name_pass_list[i].name == user_input_name && name_pass_list[i].password == user_input_pass) {
                    name_pass_match = true;
                    break;
                }

            }
            if (name_pass_match) {
                // return a valid token
                var token = jwt.sign(user_input_name, secretString, {
                    expiresInMinutes: 1440 // expires in 24 hours
                });

                return res.json({
                    success: true,
                    message: 'Enjoy your token !',
                    token: token
                });
            }
            else {
                // tell user he/she is wrong.
                return res.json({
                    succes: false,
                    message: 'Authentication failed.'
                });
            }
            //return res.json(name_pass_list);
        });

        // Handle Errors
        if(err) {
          console.log(err);
        }
    });
});


// protect APIs, 位置很重要, 必須在 auth 之後, 其他 API 之前, 才起到保護作用
router.use(function(req, res, next) {
    console.log('enter api middleware');
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    // decode token
    if (token) {
        console.log('enter token');
        // verifies secret and checks exp
        jwt.verify(token, secretString, function(err, decoded) {
            if (err) {
                return res.json({
                    success : false,
                    message : 'Failed to authenticate token.'
                });
            }
            else {
                // if everything is good,  save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        })
    }
    else {
        console.log('no token');
        // if there is no token
        return res.status(403).send({
            success : false,
            message : 'No token provided.'
        });
    }
});

/*
  path: /api/v1/users
  method: GET
  response: [
              { user_id: intger,
              name: string,
              organization: string,
              createDate: string,
              role: string,
              money: string },
              { ... }, ...
            ]
*/
router.get('/api/v1/users', function(req, res) {
    var results = [];

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {

        // SQL Query > Select Data
        var query = client.query('SELECT users.name As user, organizations.name As organization, users.create_date AS create_date, users.role AS role, users.money AS money FROM user_organization, users, organizations WHERE (user_organization.user_id = users.user_id AND user_organization.organization_id = organizations.organization_id) ORDER BY user ASC;');

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            return res.json(results);
        });

        // Handle Errors
        if(err) {
          console.log(err);
        }
    });
});

/*
  purpose: 建立 party
  path: /api/v1/party
  method: POST
  req.body: {
    name: string,
    organizationID: integer,
    creatorID: integer,
    storeID: integer,
    createDate: string,
    expiredDate: string
  }

  res: {
    success: boolean
    partyID: integer
  }
*/

router.post('/api/v1/party', function(req, res) {
    var uiName = req.body.name;
    var uiOrgID = req.body.organizationID;
    var uiCreatorID = req.body.creatorID;
    var uiStoreID = req.body.storeID;
    // format: yyyy-mm-dd hh:mm:ss
    var uiCreateDate = req.body.createDate;
    var uiExpiredDate = req.body.expiredDate;

    // todo: verify input validate
    pg.connect(connectionString, function(err, client, done) {
        var queryString =
        'BEGIN; '+
        'INSERT INTO parties (organization_id, creator_id, store_id, name, create_date, expired_date, ready) VALUES ({0}, {1}, {2}, \'{3}\', \'{4}\', \'{5}\', {6});'+
        'SELECT party_id FROM parties ORDER BY party_id DESC LIMIT 1;'+
        'COMMIT;';

        queryString = queryString.format(uiOrgID, uiCreatorID, uiStoreID, uiName, uiCreateDate, uiExpiredDate, 'false');

        // output query
        //console.log(queryString);

        var query = client.query(queryString, function (err, results) {
            if (err) {
                return res.json({
                    success: false,
                    message: err
                });
            }

            client.end();

            // response
            return res.json({
                success: true,
                partyID: results.rows[0].party_id
            });
        });
    }); // end of pg.connect
});

/**************************************
  purpose: 回傳指定時間的 parties.
  path: /api/v1/parties/:year/:month
  method: GET
  res.body: [
      {
          name: string,
          partyID: integer,
          creatorID: integer,
          storeID: integer,
          creator: string,
          store: string,
          createDate: string,
          expiredDate: string,
          ready: boolean,
          ordersCount: integer
      },
      ...
  ]
**************************************/
router.get('/api/v1/parties/:year/:month', function(req, res) {
    var uiYear = req.params.year;
    var uiMonth = req.params.month;

    console.log('enter parties !');
    // todo: get from user info
    //var organization = ;
    pg.connect(connectionString, function(err, client, done) {
        var queryString =
            'SELECT'+
            ' parties.name AS name,'+
            ' parties.party_id AS partyID,'+
            ' parties.creator_id AS creatorID,'+
            ' parties.store_id AS storeID,'+
            ' users.name AS creator,'+
            ' stores.name AS store,'+
            ' TO_CHAR(parties.create_date, \'yyyy-mm-dd hh:mm:ss\') AS createDate,'+
            ' TO_CHAR(parties.expired_date, \'yyyy-mm-dd hh:mm:ss\') AS expiredDate,'+
            ' parties.ready AS ready,'+
            ' (SELECT COUNT(*) FROM orders WHERE parties.party_id = orders.party_id) AS orderCount'+
            ' FROM parties, users, stores, orders'+
            ' WHERE'+
            ' (parties.organization_id = {0}'+
            ' AND parties.creator_id = users.user_id'+
            ' AND parties.store_id = stores.store_id'+
            ' AND \'{1} 00:00:00\' <= parties.create_date'+
            ' AND parties.expired_date <= \'{2} 24:00:00\')'+
            ' GROUP BY'+
            ' parties.name, parties.party_id, parties.creator_id, parties.store_id, users.name, stores.name, parties.create_date, parties.expired_date, parties.ready'+
            ' ORDER BY parties.party_id ASC;';

        queryString = queryString.format(1, '{0}-{1}-01'.format(uiYear, uiMonth), '{0}-{1}-31'.format(uiYear, uiMonth));
        console.log(queryString);
        var query = client.query(queryString, function (err, results) {
            if (err) {
                return res.json({
                    success: false,
                    message: err
                });
            }

            client.end();

            // response
            return res.json({
                success: true,
                results: results.rows
            });
        }); // end of client.query
    }); // end of pg.connect
}); // end of rout.get

/*
  purpose: 回傳 stores
  path: /api/v1/stores
  method: GET
*/
// todo


/*
  purpose: 查看某個 party 資訊
  path: /api/v1/party/:id
  method: GET
  req.body: {
    name: string,
    organizationID: integer,
    creatorID: integer,
    storeID: integer,
    createDate: string,
    expiredDate: string,
    ready: boolean
  }
*/
// todo

/*
  purpose: party 成立 (結算金額)
  path: /api/v1/party/:id/ready
  method: PUT
*/

/*
  purpose: 訂購 (遞出 order)
  path: /api/v1/order
  method: POST
  req.body: {
    userID: integer,
    partyID: integer,
    product: string,
    price,
    createDate
  }
  res.body: {
    success: boolean,
    orderID: integer
  }
*/

/*
  purpose: 查看某 party orders
  path: /api/v1/party/:partyID/orders
  method: GET
*/

/*
  purpose:
  path:
  method:
*/

/*
  purpose: 查看 stores list
  path: /api/v1/stores
  method: GET
*/

/*
  purpose: 查看 store info
  path: /api/v1/store/:id
  method: GET
*/

/*
  purpose: 新增 store
  path: /api/v1/store
  method: POST
  req.body: {
    name: string,
    phoneNumber: string,
    image: string,
    createDate,
    minSpending
  }
  res: {
    success: boolean,
    storeID: integer
  }
*/
// todo

/*
  purpose: 查看 store products list
  path: /api/v1/store/:id/products
  method: GET
*/

/*
  purpose: 查看某個 product
  path: /api/v1/product/:id
  method: GET
  res.body: {
    productID: integer,
    storeID: integer,
    name: string,
    price: float
  }
*/
// todo

/*
  purpose: 留下 product comment
  path: /api/v1/product/:id/comment
  method: POST
  req.body: {
    productID: integer,
    commentUserID: integer,
    text: string, // markdown
    date: string,
    stars: integer
  }
  res.body: {
    succes: boolean,
    commentID: integer
  }
*/

/*
  purpose: 查看 comment list
  path: /api/v1/product/:productID/comments
  method: GET
  res.body:
  [
      {
          commentID: integer,
          productID: integer,
          commentUserID: integer,
          text: string, // markdown
          date: string,
          stars: integer
      },
      ...
  ]
*/


// template, remove in future
router.put('/api/v1/todos/:todo_id', function(req, res) {

    var results = [];

    // Grab data from the URL parameters
    var id = req.params.todo_id;

    // Grab data from http request
    var data = {text: req.body.text, complete: req.body.complete};

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {

        // SQL Query > Update Data
        client.query("UPDATE items SET text=($1), complete=($2) WHERE id=($3)", [data.text, data.complete, id]);

        // SQL Query > Select Data
        var query = client.query("SELECT * FROM items ORDER BY id ASC");

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            return res.json(results);
        });

        // Handle Errors
        if(err) {
          console.log(err);
        }

    });
});

// template, remove in future
router.delete('/api/v1/todos/:todo_id', function(req, res) {

    var results = [];

    // Grab data from the URL parameters
    var id = req.params.todo_id;


    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {

        // SQL Query > Delete Data
        client.query("DELETE FROM items WHERE id=($1)", [id]);

        // SQL Query > Select Data
        var query = client.query("SELECT * FROM items ORDER BY id ASC");

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            return res.json(results);
        });

        // Handle Errors
        if(err) {
          console.log(err);
        }

    });

});

module.exports = router;