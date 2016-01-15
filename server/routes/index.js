var express = require('express');
var router = express.Router();
var path = require('path');
var pg = require('pg');
var fs = require('fs-extra');
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var zlib = require('zlib');
var sq = require('../../models/query.js');
var status_code = require('./status-code');
//var session = require('express-session');
var connectionString = require(path.join(__dirname, '../../', 'config'));

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

/*
 * Return UUID name.
 */
function getUniqName() {
    return uuid.v4().replace(/-/g, '');
}

/* 
 * Upload image from HTTP chunk and return path.
 * Parameter:
 *   req: router request.
 * Return:
 *   If post file does exist, return path; otherwise, return undefine.
 */
function uploadImage(req, after) {
    console.log('Start uploadImage');
    if (!req.busboy) {
        after(undefined);
        return;
    }
    
    var uniqName = getUniqName();
    
    var fstream;
    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
        console.log("Uploading: " + filename);
        
        var s3Key = uniqName + '/' + filename;        
        
        // temp save to root/server/img
        var imgDir = path.join(__dirname, '..', 'img', getUniqName());
        fs.mkdirsSync(imgDir);
        var tmpFile = path.join(imgDir, filename);
        fstream = fs.createWriteStream(tmpFile);
        file.pipe(fstream);
        fstream.on('close', function () {  
            // send to S3
            console.log('Sending to S3 ...');
            var body = fs.createReadStream(tmpFile) /* .pipe(zlib.createGzip()) */;
            var params = {
                Bucket:      S3_BUCKET, 
                Key:         s3Key, 
                Body:        body,
                ContentType: 'image/jpeg'
            };
            var s3 = new AWS.S3();
            //var file = fs.createReadStream(tmpFile);
            s3.upload(params, function (err, data) {
                if (err) {
                    console.log("Error uploading data: ", err);
                } 
                else {
                    console.log("Successfully uploaded data to " + S3_BUCKET + '/' + s3Key);
                }
            })
            .on('httpUploadProgress', function(evt) { 
                console.log(evt); 
            })
            .send(function(err, data) { 
                console.log(err, data);
                
                // remove tmp file
                if (fs.existsSync(imgDir)) {
                    fs.removeSync(imgDir);
                }
            
                // response
                console.log("Upload Finished of " + filename);
                
                after(data.Location);
            });
        });
    });
}

/*
 * Get party ready.
 * Parameter:
 *   partyID
 *   thenEvent(): trigger when party is ready.
 *   errorEvent(exception, message): trigger when party is not ready.
 *     exception:
 *       partyNotExist
 *       partyWasReady
 *       connectionFailed
 *     message: string
 */
function partyIsReady(partyID, thenEvent, errorEvent) {
    var result = undefined;
    pg.connect(connectionString, function (err, client, done) {
        if (err) {
            if (errorEvent) {
                errorEvent('connectionFailed', err, client, done);
                return;
            }
        }
        var queryString = sq.getPartyInfo_F1.format(partyID);
        var query = client.query(queryString);
        query.on('row', function(row) {
            result = row.ready;
        });
        query.on('end', function () {
            if (result === undefined) {
                errorEvent('partyNotExist', 'Party does not exit !', client, done);
            } else if (!result) {
                thenEvent(client, done);
            } else {
                errorEvent('partyWasReady', 'Party was ready !', client, done);
            }
            //client.end();
        });
    });
}

// For json web token.
var secretString = process.env.TOKEN_KEY;

// AWS environment.
var S3_BUCKET =             process.env.S3_BUCKET;
var AWS_ACCESS_KEY =        process.env.AWS_ACCESS_KEY_ID;
var AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

AWS.config.update({
    accessKeyId:     AWS_ACCESS_KEY, 
    secretAccessKey: AWS_SECRET_ACCESS_KEY
});

// Page physical path.
var index_path = path.join(__dirname, '..', '..', 'client', 'views', 'index.html');
var login_path = path.join(__dirname, '..', '..', 'client', 'views', 'login.html');
var browse_path = path.join(__dirname, '..', '..', 'client', 'views', 'browse.html');
var header_path = path.join(__dirname, '..', '..', 'client', 'views', 'header.html');
var file_up_path = path.join(__dirname, '..', '..', 'client', 'views', 'file-upload.html');
var recharge_path = path.join(__dirname, '..', '..', 'client', 'views', 'recharge.html');

// page navigation
router.get('/', function(req, res, next) {
    var token = req.cookies ? req.cookies.token : undefined;
    if (token) {
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
        res.redirect('/login');
    }
});

router.get('/browse', function(req, res, next) {
    var token = req.cookies ? req.cookies.token : undefined;
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, secretString, function(err, decoded) {
            if (err) {
                res.redirect('/login');
            }
            else {
                res.sendFile(browse_path);
            }
        })
    }
    else {
        res.redirect('/login');
    }
});

// template
router.get('/header', function(req, res, next) {
    var token = req.cookies ? req.cookies.token : undefined;
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, secretString, function(err, decoded) {
            if (err) {
                res.redirect('/login');
            }
            else {
                res.sendFile(header_path);
            }
        })
    }
    else {
        res.redirect('/login');
    }
});

router.get('/file-upload', function(req, res, next) {
    var token = req.cookies ? req.cookies.token : undefined;
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, secretString, function(err, decoded) {
            if (err) {
                res.redirect('/login');
            }
            else {
                res.sendFile(file_up_path);
            }
        })
    }
    else {
        res.redirect('/login');
    }
});

router.get('/recharge', function(req, res, next) {
    var token = req.cookies ? req.cookies.token : undefined;
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, secretString, function(err, decoded) {
            if (err) {
                res.redirect('/login');
            }
            else {
                res.sendFile(recharge_path);
            }
        })
    }
    else {
        res.redirect('/login');
    }
});


router.get('/login', function (req, res, next) {
    res.sendFile(login_path);
});

/* -------------------------------------------------------------------------- */
// API area

/* get auth token
 * res: {
 *   success: boolean,
 *   message: string,
 *   token: string,
 *   user_id: integer,
 *   organization_id: integer
 * }
 */
router.post('/api/v1/auth', function(req, res) {
    var user_input_name = req.body.name;
    var user_input_pass = req.body.password;
    var name_pass_list = [];

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        if (err) {
            done();
            return res.json({
                success: false,
                message: 'DB connection failed.'
            });
        }

        //console.log('router.post(/api/v1/auth): connection success, ready to query ...');

        // SQL Query > Select Data
        //var query = client.query('SELECT name, password FROM users;');
        var query = client.query('SELECT users.user_id AS user_id, users.name AS name, users.password AS password, (SELECT user_organization.organization_id FROM user_organization WHERE (users.user_id = user_organization.user_id)) AS organization_id, users.role AS role FROM users;');
        /*
        row:
        user_id, name, password, organization_id, role
        */

        // Stream name_pass_list back one row at a time
        query.on('row', function(row) {
            name_pass_list.push(row);
        });

        // After all data is returned, close connection and return name_pass_list
        query.on('end', function() {
            //client.end();
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

                done();
                return res.json({
                    success: true,
                    message: 'Enjoy your token !',
                    token: token,
                    userID: userInfo.user_id,
                    organizationID: userInfo.organization_id
                });
            }
            else {
                // tell user he/she is wrong.
                done();
                return res.json({
                    succes: false,
                    message: 'Authentication failed.'
                });
            }
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
        //console.log('enter token');
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
  response: {
      success: boolean,
      users: [
              { user_id: intger,
              user_name: string,
              organization_id: integer,
              organization: string,
              create_date: string,
              role: integer,
              money: string },
              { ... }, ...
            ]
*/
router.get('/api/v1/users', function(req, res) {
    var results = [];

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {

        // SQL Query > Select Data
        var query = client.query('SELECT users.user_id AS user_id, users.name As user_name, user_organization.organization_id AS organization_id, organizations.name As organization, users.create_date AS create_date, users.role AS role, users.money AS money FROM user_organization, users, organizations WHERE (user_organization.user_id = users.user_id AND user_organization.organization_id = organizations.organization_id) ORDER BY user_name ASC;');

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            //client.end();
            done();
            return res.json({
                success: true,
                message: 'OK',
                users: results
            });
        });

        // Handle Errors
        if(err) {
          console.log(err);
          done();
          return res.json({
              success: false,
              message: 'Query error: ' + err
          });
        }
    });
});

/*
 * path: /api/v1/user/:user_id/password
 * role: 1
 * method: PUT
 * body: {
 *   old_password: string
 *   new_password: string
 * }
 * 
 * response: {
 *   success: boolean,
 *   message: string
 * }
 */
/*
var PASSWORD_LEN = 5;
router.put('/api/v1/user/:user_id/password', function (req, res) {
    var uiUserID = req.params.user_id;
    var uiOldPassword = req.body.old_password;
    var uiNewPassword = req.body.new_password;
    
    if (uiUserID === undefined) {
        return res.json({
            success: false,
            message: 'user_id is missing !'
        });
    }
    
    if (uiNewPassword.length <= PASSWORD_LEN) {
        return res.json({
            success: false,
            message: 'New password is too short ! At least: ' + PASSWORD_LEN
        })
    }
    
    pg.connect(connectionString, function (err, client, done) {
        var queryString = sq.getPasswordsListByUserID_F1.format(uiUserID);
        client.query(queryString, function (err, result) {
            if (err) {
                done();
                return res.json({
                    success: false,
                    message: err
                });
            }
            
            if (result.rows.length > 0) {
                var orgPassword = result.rows[0].password
                if (orgPassword === uiOldPassword) {
                    var queryString = sq.updatePasswordByUserID_F2.format(uiUserID, uiNewPassword);
                    client.query(queryString, function (err, result) {
                        if (err) {
                            done();
                            return res.json({
                                success: false,
                                message: err
                            });
                        }
                        
                        done();
                        return res.json({
                            success: true,
                            message: 'Change password OK !'
                        })
                    });
                } else {
                    done();
                    return res.json({
                        success: false,
                        message: 'Old password is wrong !'
                    });
                }
            }
        });
    });
});
*/

/*
 * path: /api/v1/user/recharge
 * role: acountant/admin
 * method: PUT
 * body: {
 *   user_id: integer,
 *   amount: float (+-)
 * }
 * 
 * response: {
 *   success: boolean,
 *   message: string,
 *   money: float (available if success == true)
 *   exception: (available if success == false)
 *     paramInvalid
 * }
 */
router.put('/api/v1/user/:user_id/recharge', function (req, res) {
    // todo: check role
    
    // todo: check parameters
    var uiUserID = req.params.user_id;
    var uiAmount = req.body.amount;
    
    if (uiUserID === undefined) {
        return res.json({
            success: false,
            message: 'user_id is missing !'
        });
    }
    
    pg.connect(connectionString, function(err, client, done) {
        var queryString = sq.updateUserMoney_F2.format(uiUserID, uiAmount);
        //console.log(queryString);
        //var result = 0.0;
        var query = client.query(queryString, function (err, results) {
            if (err) {
                done();
                return res.json({
                    success: false,
                    message: err
                });
            }
            
            query.on('end', function() {
                //client.end();
                done();
                return res.json({
                    success: true,
                    message: 'Recharge success.',
                    money: parseFloat(results.rows[0].money)
                });
            });
        });
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
    var uiOrgID = req.body.organization_id;
    var uiCreatorID = req.body.creator_id;
    var uiStoreID = req.body.store_id;
    // format: yyyy-mm-dd hh:mm:ss
    var uiCreateDate = req.body.create_date;
    var uiExpiredDate = req.body.expired_date;

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

        client.query(queryString, function (err, results) {
            if (err) {
                done();
                return res.json({
                    success: false,
                    message: err
                });
            }

            //client.end();

            // response
            done();
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
        var currMonth = new Date(uiYear, uiMonth, 0);
        var lastDay = currMonth.getDate();
        var queryString =
            'SELECT'+
            ' parties.name AS name,'+
            ' parties.party_id AS party_id,'+
            ' parties.creator_id AS creator_id,'+
            ' parties.store_id AS store_id,'+
            ' users.name AS creator,'+
            ' stores.name AS store,'+
            ' TO_CHAR(parties.create_date, \'yyyy-mm-dd hh24:mi:ss\') AS create_date,'+
            ' TO_CHAR(parties.expired_date, \'yyyy-mm-dd hh24:mi:ss\') AS expired_date,'+
            ' parties.ready AS ready,'+
            ' (SELECT COUNT(*) FROM orders WHERE parties.party_id = orders.party_id) AS order_count'+
            ' FROM parties, users, stores'+
            ' WHERE'+
            ' (parties.organization_id = {0}'+
            ' AND parties.creator_id = users.user_id'+
            ' AND parties.store_id = stores.store_id'+
            ' AND \'{1}-{2}-1 00:00:00\' <= parties.create_date'+
            ' AND parties.expired_date <= \'{1}-{2}-{3} 24:00:00\')'+
            ' GROUP BY'+
            ' parties.name, parties.party_id, parties.creator_id, parties.store_id, users.name, stores.name, parties.create_date, parties.expired_date, parties.ready'+
            ' ORDER BY parties.party_id ASC;';

        queryString = queryString.format(queryOrganization, uiYear, uiMonth, lastDay);
        //console.log(queryString);
        var query = client.query(queryString);

        if (err) {
            done();
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
            //client.end();
            //console.log(results);
            done();
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
  param: token
  res.body: {
      success: boolean,
      message: string,
      stores: [
          {
              id,
              name,
              phone_number,
              create_date,
              min_spending,
              image
          },
          { ... }
      ]
  }
*/
router.get('/api/v1/stores', function (req, res) {
    var results = [];
    pg.connect(connectionString, function(err, client, done) {
        var queryString = sq.queryStores;

        var query = client.query(queryString);

        if (err) {
            done();
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
            //client.end();
            //console.log(results);
            done();
            return res.json({
                success: true,
                message: '',
                stores: results
            });
        });
    });
});


/*
  purpose: 查看某個 party 資訊
  path: /api/v1/party/:party_id
  method: GET
  req.body: {
    name: string,
    organization_id: integer,
    creator_id: integer,
    store_id: integer,
    create_date: string,
    expired_date: string,
    ready: boolean
  }
*/
router.get('/api/v1/party/:party_id', function (req, res) {
    var uiPartyID = req.params.party_id;
    
    var results = [];
    pg.connect(connectionString, function(err, client, done) {
        var queryString = sq.getPartyInfo_F1.format(uiPartyID);
        //console.log(queryString);
        var query = client.query(queryString);

        if (err) {
            done();
            return res.json({
                success: false,
                message: err
            });
        }

        query.on('row', function(row) {
            results.push({
                name:            row.name,
                organization_id: parseInt(row.organization_id),
                creator_id:      parseInt(row.creator_id),
                create_date:     row.create_date,
                expired_date:    row.expired_date,
                ready:           row.ready
            });
        });

        query.on('end', function() {
            //client.end();
            if (results.length == 1) {
                done();
                return res.json({
                    success: true,
                    message: 'Get OK.',
                    party: results[0]
                });
            }
            else {
                done();
                return res.json({
                    success: false,
                    message: 'Party not found: ' + uiPartyID
                });
            }
        });
    });
});

/*
 * purpose: party 成立 (結算金額)
 * path: /api/v1/party/:party_id/ready
 * method: PUT
 * 
 * Pseudo code:
 *   Get order list
 *   foreach order:
 *     update row: user.money = user.money - order.price
 */
router.put('/api/v1/party/:party_id/ready', function (req, res) {
    // todo: check privilege
    
    var uiPartyID = req.params.party_id;
    
    if (!uiPartyID) {
        return res.json({
            success: false,
            message: 'party_id is missing.'
        });
    }
    
    pg.connect(connectionString, function(err, client, done) {
        if (err) {
            done();
            return res.json({
                success: false,
                message: err
            });
        }
        
        // get party ready; if ready = false then update.
        var partyInfo = undefined;
        var queryString = sq.getPartyInfo_F1.format(uiPartyID);
        var query = client.query(queryString);
        query.on('row', function (row) {
            partyInfo = row;
        });
        
        query.on('end', function() {
            if (!partyInfo) {
                //client.end();
                done();
                return res.json({
                    success: false,
                    message: 'Party does not exist.'
                })
            }
            
            if (partyInfo.ready) {
                //client.end();
                done();
                return res.json({
                    success: false,
                    message: 'Party has been ready.'
                })
            }
            else {
                // Make party ready.
                var queryString = sq.setPartyReadyAndUpdateUsersMoney_F1.format(uiPartyID);
                //console.log(queryString);
                var query = client.query(queryString);
                
                query.on('end', function() {
                    //client.end();
                    done();
                    return res.json({
                        success: true,
                        message: 'Set party ready.',
                    });
                });
            }
        });
    });
});

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
      
  response: {
      success: boolean,
      message: string,
      exception: (available if success == false) 
        connectionFailed
        partyNotExist
        partyWasReady
        priceIncorrect
  }
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
    
    // todo: check price validation

    // check party ready
    partyIsReady(uiPartyID, function partyExists (client, done) {
        // [ { product_id: integer, product_name: string, price: integer }, ... ]
        
        var productsInStore = [];
            
        var queryString = sq.getProductsListByStoreID_F1.format(uiStoreID);
        var query = client.query(queryString);
        query.on('row', function(row) {
            productsInStore.push({
                product_id: parseInt(row.product_id),
                product_name: row.product_name,
                price: parseInt(row.price)
            });
        });

        query.on('end', function() {
            // exist/new/incorrect
            try {
                var orderStatus = '';
                for (var i = 0; i < productsInStore.length; i++) {
                    var product = productsInStore[i];
                    if (product.product_name === uiProduct) {
                        if (product.price === uiPrice) {
                            orderStatus = 'exist';
                            break;
                        } else {
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
                if (orderStatus == 'exist' || orderStatus == 'new') {
                    var queryString = sq.insertOrder_F5.format(uiUserID, uiPartyID, uiProduct, uiPrice, uiNote);

                        
                    var query = client.query(queryString);

                    query.on('row', function (row) {
                        newOrderID = row.order_id;
                    });

                    query.on('end', function() {
                        return res.json({
                            success: true,
                            message: 'Create order OK !',
                            order_id: newOrderID
                        });
                    });

                }
                else if (orderStatus == 'incorrect') {
                    return res.json({
                        success: false,
                        message: 'Product price is incorrect !',
                        exception: 'priceIncorrect'
                    });
                }
                else {
                    return res.json({
                        success: false,
                        message: 'Something wrong during insert order !'
                    });
                }
            } finally {
                done();
            }
        });
    }, 
    function error (excp, msg, client, done) {
        done();
        return res.json({
            success: false,
            message: msg,
            exception: excp
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
        create_date: string,
        note: string
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
        var queryString = sq.getOrdersByPartyID_F1.format(partyID);
        var query = client.query(queryString);

        if (err) {
            done();
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
            //client.end();
            done();
            return res.json({
                success: true,
                message: '',
                orders: results
            });
        });
    });
});

/*
 * Purpose: delete specified order.
 * path: /api/v1/order/:order_id
 * params: token
 * response: {
 *     success: boolean,
 *     message: string,
 *     exception: string, (If success = false)
 * }
 * Exceptions:
 *   1. connectionFailed
 *   2. partyWasReady
 * Hint:
 *   It could only delete the order which belong to party that is ready.
 */
router.delete('/api/v1/order/:order_id', function (req, res) {
    var uiOrderID = req.params.order_id;
    
    // todo: prevent illegal order id.
    
    pg.connect(connectionString, function (err, client, done) {
        // check party ready
        if (err) {
            done();
            return res.json({
                success: false,
                message: err,
                exception: 'connectionFailed'
            });
        }
        
        var partyReady = undefined;
        var queryString = sq.getPartyByOrderID_F1.format(uiOrderID);
        client.query(queryString, function (err, result) {
            partyReady = result.rows[0].ready;
            if (!partyReady) {
                var queryString = sq.deleteRow_F3.format('orders', 'order_id', uiOrderID);
                client.query(queryString, function (err, result) {
                    done();
                    return res.json({
                            success: true,
                            message: ''
                        });
                });
            } else {
                done();
                return res.json({
                    success: false,
                    message: 'Party was ready !',
                    exception: 'partyWasReady'
                });
            }
        });
    });
});


/*
  purpose: 查看 store infos
  path: /api/v1/store/:store_id
  method: GET
  res.body: {
      success: boolean,
      message: string,
      store: {
          name: string,
          phone_number: string,
          create_date: string,
          image: string,
          min_spending: integer
      }
  }
*/
router.get('/api/v1/store/:store_id', function (req, res) {
    var uiStoreID = req.params.store_id;
    
    var results = [];
    pg.connect(connectionString, function(err, client, done) {
        var queryString = sq.getStoreInfo_F1.format(uiStoreID);
        //console.log(queryString);
        var query = client.query(queryString);

        if (err) {
            done();
            return res.json({
                success: false,
                message: err
            });
        }

        query.on('row', function(row) {
            results.push({
                name:         row.name,
                phone_number: row.phone_number,
                create_date:  row.create_date,
                image:        row.image,
                min_spending: parseInt(row.min_spending)
            });
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            //client.end();
            //console.log(results);
            if (results.length == 1) {
                done();
                return res.json({
                    success: true,
                    message: '',
                    store: results[0]
                });
            }
            else {
                done();
                return res.json({
                    success: false,
                    message: 'Store not found: ' + uiStoreID
                });
            }
        });
    });
});

/*
  purpose: 新增 store
  path: /api/v1/store
  method: POST
  req.file: image
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
router.post('/api/v1/store', function (req, res) {
    var uiName = req.body.name;
    var uiPhoneNumber = req.body.phone_number;
    var uiMinSpending = req.body.min_spending;
    
    var cols = [];
    var vals = [];
    var newStoreID = undefined;
    
    // Name is necessary.
    if (uiName) {
        cols.push('name');
        vals.push(sq.SQLString(uiName));
    }
    else {
        return res.json({
            success: false,
            message: 'Name is missing.'
        });
    }
    
    // Phone number is necessary.
    if (uiPhoneNumber) {
        cols.push('phone_number');
        vals.push(sq.SQLString(uiPhoneNumber));
    }
    else {
        return res.json({
            success: false,
            message: 'Phone number is missing.'
        })
    }
    
    // Auto-generate create_date.
    cols.push('create_date');
    vals.push('NOW()');
    
    // Default: 0
    cols.push('min_spending');
    if (uiMinSpending) {
        vals.push(uiMinSpending);
    }
    else {
        vals.push(0);
    }
    
    uploadImage(req, function (imagePath) {
        cols.push('image');
        vals.push((imagePath) ? sq.SQLString(imagePath) : sq.SQLString(''));
        pg.connect(connectionString, function(err, client, done) {
            var queryString = sq.insertStore_F2.format(
                sq.arrayToSQLInsertString(cols), 
                sq.arrayToSQLInsertString(vals));
            //console.log(queryString);
            var query = client.query(queryString);
    
            if (err) {
                done();
                return res.json({
                    success: false,
                    message: err
                });
            }
    
            query.on('row', function(row) {
                newStoreID = row.store_id;
            });
    
            query.on('end', function() {
                //client.end();
                done();
                return res.json({
                    success: true,
                    message: 'Update OK.',
                    store_id: newStoreID
                });
            });
        });
    });
});

/*
  purpose: modify store
  path: /api/v1/store
  metod: PUT
  image: multipart/form-data
  req.body: {
    store_id: integer,
    name: string (optional),
    phone_number: string (optional),
    min_spending (optional)
  }
*/
router.put('/api/v1/store/:store_id', function (req, res) {
    
    var uiStoreID = req.params.store_id;
    var uiName = req.body.name;
    var uiPhoneNumber = req.body.phone_number;
    var uiMinSpending = req.body.min_spending;
    
    console.log('name: ' + uiName);
    
    var cols = [];
    var vals = [];
    
    if (uiStoreID === undefined) {
        return res.json({
            success: false,
            message: 'store_id is missing !'
        });
    }
    
    if (uiName !== undefined) {
        cols.push('name');
        vals.push(sq.SQLString(uiName));
    }
    
    if (uiPhoneNumber !== undefined) {
        cols.push('phone_number');
        vals.push(sq.SQLString(uiPhoneNumber));
    }
    
    if (uiMinSpending !== undefined) {
        cols.push('min_spending');
        vals.push(uiMinSpending);
    }
    
    
    // todo: prevent illegal request field
    
    uploadImage(req, function (imagePath) {
        //console.log('imagePath: ' + imagePath);
        pg.connect(connectionString, function(err, client, done) {
            if (err) {
                res.status(status_code.CLI_ERR_BAD_REQ);
                res.send(err);
                done();
                return;
                /*
                return res.json({
                    success: false,
                    message: err
                });
                */
            }
            
            if (imagePath !== undefined) {
                cols.push('image');
                vals.push((imagePath) ? sq.SQLString(imagePath) : sq.SQLString(''));
            }
            
            if (cols.length > 0) {
                var queryString = 'UPDATE stores SET {0} WHERE store_id = {1};'.format(sq.arrayToSQLUpdateString(cols, vals), uiStoreID);
                //console.log(queryString);
                //if (imagePath) console.log(imagePath);
                var query = client.query(queryString);
        
                // After all data is returned, close connection and return results
                query.on('end', function() {
                    //client.end();
                    done();
                    return res.json({
                        success: true,
                        message: 'Update OK.'
                    });
                });
            } else {
                res.status(status_code.CLI_ERR_BAD_REQ);
                res.send('no giving field.');
                done();
                return;
                /*
                return res.json({
                    success: false,
                    message: "no giving field."
                });
                */
            }
        });
    });
});
    


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
        price: integer,
        comments: integer
      },
      ...
    ]
  }
*/
router.get('/api/v1/store/:store_id/products', function (req, res) {
    var storeID = req.params.store_id;

    if (!storeID) {
      return res.json({
          success: false,
          message: 'storeID is not defined !'
      })
    }

    var results = [];
    pg.connect(connectionString, function(err, client, done) {
        var queryString = sq.getProductsListByStoreID_F1.format(storeID);

        queryString = queryString.format(storeID);
        //console.log(queryString);
        var query = client.query(queryString);

        if (err) {
            done();
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
            //client.end();
            //console.log(results);
            done();
            return res.json({
                success: true,
                message: '',
                products: results
            });
        });
    });
});


/*
 * purpose: 查看某個 product
 * path: /api/v1/product/:product_id
 * method: GET
 * res.body: {
 *   store_id: integer,
 *   name: string,
 *   price: float
 * }
 */
router.get('/api/v1/product/:product_id', function (req, res) {
    var uiProductID = req.params.product_id;
    
    
    var results = [];
    pg.connect(connectionString, function(err, client, done) {
        var queryString = sq.getProductInfo_F1.format(uiProductID);
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
            //client.end();
            if (results.length == 1) {
                done();
                return res.json({
                    success: true,
                    message: '',
                    product: {
                        store_id: results[0].store_id,
                        name:     results[0].name,
                        price:    parseFloat(results[0].price)
                    }
                });
            }
            else {
                done();
                return res.json({
                    success: false,
                    message: 'Product not found: ' + uiProductID
                })
            }
        });
    });
});

/*
 * purpose: 留下 product comment
 * path: /api/v1/product/comment
 * method: POST
 * req.body: {
 *   product_id: integer,
 *   comment_user_id: integer,
 *   text: string, // markdown
 *   stars: integer,
 *   image: string
 * }
 * res.body: {
 *   success: boolean,
 *   comment_id: integer
 * }
 */
router.post('/api/v1/product/comment', function (req, res) {
    var uiProductID = req.body.product_id;
    var uiCommentUserID = req.body.comment_user_id;
    var uiText = req.body.text;
    var uiStars = req.body.stars;
    
    var cols = [];
    var vals = [];
    
    if (!uiProductID) {
        return res.json({
            success: false,
            message: 'product_id is missing.'
        });
    }
    else {
        cols.push('product_id');
        vals.push(uiProductID);
    }
    
    if (!uiCommentUserID) {
        return res.json({
            success: false,
            message: 'comment_user_id is missing.'
        })
    }
    else {
        cols.push('comment_user_id');
        vals.push(uiCommentUserID);
    }
    
    cols.push('text');
    if (!uiText) {
        vals.push(sq.SQLString(''));
    }
    else {
        vals.push(sq.SQLString(uiText));
    }
    
    if (uiStars) {
        cols.push('stars');
        vals.push(uiStars);
    }
    else {
        return res.json({
            success: false,
            message: 'stars is missing.'
        });
    }
    
    cols.push('date');
    vals.push('NOW()');
    
    uploadImage(req, function (uiImage) {
        cols.push('image');
        if (uiImage) {
            vals.push(sq.SQLString(uiImage));
        }
        else {
            vals.push(sq.SQLString(''));
        }
        
        var results = [];
        pg.connect(connectionString, function(err, client, done) {
            var queryString = sq.insertRow_F4.format(
                'comments',
                sq.arrayToSQLInsertString(cols),
                sq.arrayToSQLInsertString(vals),
                'comment_id');
            //console.log(queryString);
            var query = client.query(queryString);
    
            if (err) {
                done();
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
                //client.end();
                if (results.length == 1) {
                    done();
                    return res.json({
                        success: true,
                        message: '',
                        comment_id: results[0].comment_id
                    });
                }
                else {
                    done();
                    return res.json({
                        success: false,
                        message: 'Comment insert failed.'
                    })
                }
            });
        });
    });
});


/*
 * purpose: 查看 comment list
 * path: /api/v1/product/:product_id/comments
 * method: GET
 * res.body: {
 *   success: boolean,
 *   message: string,
 *   comments: [
 *       {
 *           comment_id: integer,
 *           product_id: integer,
 *           product_name: string,
 *           user_id: integer,
 *           user_name: string,
 *           text: string, // markdown
 *           date: string,
 *           stars: integer,
 *           image: string
 *       },
 *       ...
 *   ]
 * }
 */
router.get('/api/v1/product/:product_id/comments', function (req, res) {
    var productID = req.params.product_id;

    if (!productID) {
      return res.json({
          success: false,
          message: 'productID is not defined !'
      })
    }

    var results = [];
    pg.connect(connectionString, function(err, client, done) {
        if (err) {
            done();
            return res.json({
                success: false,
                message: err
            });
        }
        
        // todo: SQL statement
        var queryString = sq.getProductComments_F1.format(productID);

        //console.log(queryString);
        var query = client.query(queryString);

        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            //client.end();
            //console.log(results);
            done();
            return res.json({
                success: true,
                message: '',
                comments: results
            });
        });
    });
});

/*
 * purpose: add product.
 * path: /api/v1/product
 * method: POST
 * req.body: {
 *     store_id: integer,
 *     name: string,
 *     price: float
 * }
 * 
 * res: {
 *     success: boolean,
 *     message: string,
 *     product_id: integer
 * }
 */
router.post('/api/v1/product', function (req, res) {
    var uiStoreID = req.body.store_id;
    var uiName = req.body.name;
    var uiPrice = req.body.price;
    
    var cols = [];
    var vals = [];
    if (!uiStoreID) {
        return res.json({
            success: false,
            message: 'store_id is missing.'
        });
    }
    cols.push('store_id');
    vals.push(uiStoreID);
    
    if (!uiName) {
        return res.json({
            success: false,
            message: 'name is missing.'
        });
    }
    uiName = uiName.trim();
    if (uiName === '') {
        return res.json({
            success: false,
            message: 'message could not be empty !'
        });
    } 
    cols.push('name');
    vals.push(sq.SQLString(uiName));
    
    if (!uiPrice) {
        return res.json({
            success: false,
            message: 'price is missing.'
        });
    }
    else if (uiPrice <= 0) {
        return res.json({
            success: false,
            message: 'Price must be greater than 0 !'
        })
    }
    cols.push('price');
    vals.push(uiPrice);
    
    var results = [];
    pg.connect(connectionString, function (err, client, done) {
        if (err) {
            done();
            return res.json({
                success: false,
                message: err
            });
        }
        
        var queryString = sq.insertRow_F4.format('products',
            sq.arrayToSQLInsertString(cols),
            sq.arrayToSQLInsertString(vals),
            'product_id');
            
        var query = client.query(queryString);

        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            //client.end();
            if (results.length == 1) {
                done();
                return res.json({
                    success: true,
                    message: '',
                    product_id: results[0].product_id
                });
            }
            else {
                done();
                return res.json({
                    success: false,
                    message: 'Result failed.'
                });
            }
        });
    });
})

/*
 * purpose: modify product comment.
 * path: /api/v1/product/:product_id/comment
 * method: PUT
 */
// todo

module.exports = router;