var express = require('express');
var router = express.Router();
var path = require('path');
var pg = require('pg');
var fs = require('fs');
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var queryPackage = require('../../models/query.js');
//var session = require('express-session');
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
var party_path = path.join(__dirname, '..', '..', 'client', 'views', 'party.html');

/*
function initializePage(routPath) {
    if (routPath = '/') {
      routPath = 'index';
    }
    var realPath = path.join(__dirname, '..', '..', 'client', 'views', routPath + '.html');
    console.log(realPath);
    // page navigation
    router.get(path, function(req, res, next) {
        //console.log(req.query);
        //res.send('haha!');
        //console.log('GET root');
        //console.log('router.get(/): ready to get token: ');

        //var token = req.body.token || req.query.token || req.headers['x-access-token'];
        //var token = req.session.token;
        var token = req.cookies ? req.cookies.token : undefined;

        if (token) {
            console.log('router.get(' + routPath + '): get token, ready to verify:');
            // verifies secret and checks exp
            jwt.verify(token, secretString, function(err, decoded) {
                if (err) {
                    res.redirect('/login');
                }
                else {
                    res.sendFile(realPath);
                }
            })
        }
        else {
            //console.log('router.get(/): No token. response login page');
            res.redirect('/login');
            //res.sendFile(login_path);
        }
    });
}

initializePage('/');
initializePage('/party');
*/

// page navigation
router.get('/', function(req, res, next) {
    //console.log(req.query);
    //res.send('haha!');
    //console.log('GET root');
    //console.log('router.get(/): ready to get token: ');

    //var token = req.body.token || req.query.token || req.headers['x-access-token'];
    //var token = req.session.token;
    var token = req.cookies ? req.cookies.token : undefined;

    if (token) {
        //console.log('router.get(/): get token, ready to verify:');
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
        //console.log('router.get(/): No token. response login page');
        res.redirect('/login');
        //res.sendFile(login_path);
    }
});

router.get('/party', function(req, res, next) {
    var token = req.cookies ? req.cookies.token : undefined;
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, secretString, function(err, decoded) {
            if (err) {
                res.redirect('/login');
            }
            else {
                res.sendFile(party_path);
            }
        })
    }
    else {
        res.redirect('/login');
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
    //console.log('router.post(/api/v1/auth): post auth ~');
    //console.log('router.post(/api/v1/auth): ' + user_input_name);
    //console.log('router.post(/api/v1/auth): ' + user_input_pass);
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
        //var query = client.query('SELECT name, password FROM users;');
        var query = client.query('SELECT users.user_id AS userID, users.name AS name, users.password AS password, (SELECT user_organization.organization_id FROM user_organization WHERE (users.user_id = user_organization.user_id)) AS organizationID, users.role AS role FROM users;');
        /*
        row:
        userID, name, password, organizationID, role
        */

        // Stream name_pass_list back one row at a time
        query.on('row', function(row) {
            name_pass_list.push(row);
        });

        // After all data is returned, close connection and return name_pass_list
        query.on('end', function() {
            client.end();
            //console.log(name_pass_list);
            var userInfo = undefined;
            for (var i = 0; i < name_pass_list.length; i++) {
                if (name_pass_list[i].name == user_input_name && name_pass_list[i].password == user_input_pass) {
                    userInfo = name_pass_list[i];
                    break;
                }

            }
            if (userInfo) {
                // return a valid token
                var token = jwt.sign(userInfo.name, secretString, {
                    expiresInMinutes: 1440 // expires in 24 hours
                });

                return res.json({
                    success: true,
                    message: 'Enjoy your token !',
                    token: token,
                    userID: userInfo.userid,
                    organizationID: userInfo.organizationid
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
router.use('/api', function(req, res, next) {
    //console.log('enter api middleware');
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
              user_name: string,
              organization_id: integer,
              organization: string,
              create_date: string,
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
        var query = client.query('SELECT users.user_id AS user_id, users.name As user_name, user_organization.organization_id AS organization_id, organizations.name As organization, users.create_date AS create_date, users.role AS role, users.money AS money FROM user_organization, users, organizations WHERE (user_organization.user_id = users.user_id AND user_organization.organization_id = organizations.organization_id) ORDER BY user ASC;');

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            return res.json({
                success: true,
                message: 'OK',
                users: results
            });
        });

        // Handle Errors
        if(err) {
          console.log(err);
          return res.json({
              success: false,
              message: 'Query error: ' + err
          });
        }
    });
});

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

router.post('/api/v1/party', function (req, res) {
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
  query string: token, organizationID
  method: GET
  response:
  {
      success: true,
      message: string,
      parties: [
          {
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
          },
          ...
      ]
  }
**************************************/
router.get('/api/v1/parties/:year/:month', function(req, res) {
    var uiYear = req.params.year;   // from URL
    var uiMonth = req.params.month; // from URL
    var queryOrganization = req.query.organizationID; // from Query string

    //console.log('enter parties !');
    //console.log('uiYear: ' + uiYear);
    //console.log('uiMonth: ' + uiMonth);
    //console.log('queryOrganization: ' + queryOrganization);

    var results = [];
    // todo: get from user info
    //var organization = ;
    pg.connect(connectionString, function(err, client, done) {
        var queryString =
            'SELECT'+
            ' parties.name AS name,'+
            ' parties.party_id AS party_id,'+
            ' parties.creator_id AS creator_id,'+
            ' parties.store_id AS store_id,'+
            ' users.name AS creator,'+
            ' stores.name AS store,'+
            ' TO_CHAR(parties.create_date, \'yyyy-mm-dd hh:mm:ss\') AS create_date,'+
            ' TO_CHAR(parties.expired_date, \'yyyy-mm-dd hh:mm:ss\') AS expired_date,'+
            ' parties.ready AS ready,'+
            ' (SELECT COUNT(*) FROM orders WHERE parties.party_id = orders.party_id) AS order_count'+
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

        queryString = queryString.format(queryOrganization, '{0}-{1}-01'.format(uiYear, uiMonth), '{0}-{1}-31'.format(uiYear, uiMonth));
        //console.log(queryString);
        var query = client.query(queryString);

        if (err) {
            return res.json({
                success: false,
                message: err
            });
        }

        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            //console.log(results);
            return res.json({
                success: true,
                parties: results
            });
        });

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
  query: token
  req.body: {
    user_id: integer,
    party_id: integer,
    store_id: integer, // for query products list
    product: string,
    price: integer,
    note: string
  }
  res.body: {
    success: boolean,
    message: string,
    order_id: integer
  }

  Pseudo code:
    用 product name 及 price 查找 product list:
    if 完全匹配:
      success = true
      新建一筆 order
    elif Name 匹配但 price 不匹配:
      success = false
      message = "金額錯誤"
    else:
      success = true
      新建一筆 order
      新建一筆 product
*/
router.post('/api/v1/order', function (req, res) {
    //console.log('enter POST order');
    //console.log(JSON.stringify(req.body));
    var uiUserID = req.body.user_id;
    var uiPartyID = req.body.party_id;
    var uiStoreID = req.body.store_id;
    var uiProduct = req.body.product;
    var uiPrice = req.body.price;
    var uiNote = req.body.note;

    //console.log(uiStoreID);

    // todo: check price validation

    // [ { id: integer, name: string, price: integer }, ... ]
    var productsInStore = [];
    pg.connect(connectionString, function(err, client, done) {
        //console.log('connect OK');
        var queryString = queryPackage.queryProductsListByStoreID_F1.format(uiStoreID);
        //console.log(queryString);
        var query = client.query(queryString);

        if (err) {
            return res.json({
                success: false,
                message: err
            });
        }

        query.on('row', function(row) {
            //console.log('ROW: ' + JSON.stringify(row));
            productsInStore.push({
                id: parseInt(row.id),
                name: row.name,
                price: parseInt(row.price)
            });
        });

        query.on('end', function() {
            //console.log('enter OK');
            client.end();

            // exist/new/incorrect
            var orderStatus = '';
            for (var i = 0; i < productsInStore.length; i ++) {
                var product = productsInStore[i];
                if (product.name == uiProduct) {
                    if (product.price == uiPrice) {
                        orderStatus = 'exist';
                        break;
                    }
                    else {
                        orderStatus = 'incorrect';
                        break;
                    }
                }
            }
            if (orderStatus == '') {
                orderStatus = 'new';
            }

            // treat order with orderStatus
            var newOrderID = NaN;
            console.log('orderStatus: ' + orderStatus);
            if (orderStatus == 'exist') {
                var queryString = queryPackage.insertOrder_F4.format(uiUserID, uiPartyID, uiProduct, uiPrice);

                pg.connect(connectionString, function(err, client, done) {
                    var query = client.query(queryString);

                    query.on('row', function (row) {
                        newOrderID = row.order_id;
                    });

                    query.on('end', function() {
                        client.end();

                        return res.json({
                            success: true,
                            message: 'Create order OK !',
                            order_id: newOrderID
                        });
                    });
                });

            }
            else if (orderStatus == 'new') {

            }
            else if (orderStatus == 'incorrect') {
                return res.json({
                    success: false,
                    message: 'Prodcut price is incorrect !'
                });
            }
            else {
                return res.json({
                    success: false,
                    message: 'Something wrong during insert order !'
                });
            }
        });
    });

});

/*
  purpose: 查看某 party orders
  path: /api/v1/party/:party_id/orders
  query string: token, organizationID
  method: GET
  req.body: {
    success: boolean,
    message: string,
    orders: [
      {
        order_id: integer,
        user_id: integer,
        user_name: string,
        product: string,
        price: float,
        create_date: string
      }
    ]
  }
*/
router.get('/api/v1/party/:party_id/orders', function (req, res) {
    var partyID = req.params.party_id;
    var organizationID = req.query.organizationID;

    if (!partyID) {
      return res.json({
          success: false,
          message: 'partyID is not defined !'
      })
    }

    if (!organizationID) {
        return res.json({
            success: false,
            message: 'organizationID is not defined !'
        })
    }

    var results = [];
    pg.connect(connectionString, function(err, client, done) {
        // todo: SQL statement
        var queryString = 'SELECT order_id, users.user_id AS user_id, users.name AS user_name, product, price, TO_CHAR(orders.create_date, \'yyyy-mm-dd hh:mm:ss\') AS create_date FROM orders, users WHERE (users.user_id = orders.user_id);';

        var query = client.query(queryString);

        if (err) {
            return res.json({
                success: false,
                message: err
            });
        }

        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            //console.log(results);
            return res.json({
                success: true,
                message: '',
                orders: results
            });
        });
    });
});





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
  res.body: {
    success: boolean,
    message: string,
    products: [
      {
        product_id: integer,
        product_name: string,
        store_id: integer,
        price: integer
      },
      ...
    ]
  }
*/
router.get('/api/v1/store/:store_id/products', function (req, res) {
    var storeID = req.params.store_id;
    var organizationID = req.query.organizationID;

    if (!storeID) {
      return res.json({
          success: false,
          message: 'storeID is not defined !'
      })
    }

    if (!organizationID) {
        return res.json({
            success: false,
            message: 'organizationID is not defined !'
        })
    }

    var results = [];
    pg.connect(connectionString, function(err, client, done) {
        // todo: SQL statement
        var queryString = 'SELECT product_id, name AS product_name, store_id, price FROM products WHERE (store_id = {0});';

        queryString = queryString.format(storeID);
        //console.log(queryString);
        var query = client.query(queryString);

        if (err) {
            return res.json({
                success: false,
                message: err
            });
        }

        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            //console.log(results);
            return res.json({
                success: true,
                message: '',
                products: results
            });
        });
    });
});

// todo

/*
  purpose: 查看某個 product
  path: /api/v1/product/:id
  method: GET
  res.body: {
    product_id: integer,
    store_id: integer,
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
    product_id: integer,
    commentUserID: integer,
    text: string, // markdown
    date: string,
    stars: integer
  }
  res.body: {
    success: boolean,
    commentID: integer
  }
*/


/*
  purpose: 查看 comment list
  path: /api/v1/product/:product_id/comments
  method: GET
  res.body: {
    success: boolean,
    message: string,
    comments: [
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
  }
*/
router.get('/api/v1/product/:product_id/comments', function (req, res) {
    var productID = req.params.product_id;
    var organizationID = req.query.organizationID;

    if (!productID) {
      return res.json({
          success: false,
          message: 'productID is not defined !'
      })
    }

    if (!organizationID) {
        return res.json({
            success: false,
            message: 'organizationID is not defined !'
        })
    }

    var results = [];
    pg.connect(connectionString, function(err, client, done) {
        // todo: SQL statement
        var queryString = 'SELECT comment_id, comments.product_id, products.name AS product_name, comment_user_id AS user_id, users.name AS user_name, text, stars, comments.date FROM comments, users, products WHERE (comment_user_id = users.user_id AND comments.product_id = products.product_id AND comments.product_id = {0});';

        queryString = queryString.format(productID);
        //console.log(queryString);
        var query = client.query(queryString);

        if (err) {
            return res.json({
                success: false,
                message: err
            });
        }

        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            client.end();
            //console.log(results);
            return res.json({
                success: true,
                message: '',
                comments: results
            });
        });
    });
});


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