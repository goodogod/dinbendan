/*
 * get Products list by store ID.
 * Parameter:
 *   0: store_id
 * Return: [ { prodcut_id, product_name, price, comments }, { ... }, ... ]
 */
module.exports.getProductsListByStoreID_F1 = 
    'SELECT product_id, name AS product_name, store_id, price, (SELECT COUNT(comments.product_id) AS comments FROM comments WHERE comments.product_id = products.product_id) FROM products WHERE (store_id = {0}) ORDER BY product_name;';

/*
 * Get product info.
 * Parameter:
 *   0: product_id
 * Return: store_id, name, price
 */
module.exports.getProductInfo_F1 =  
    'SELECT store_id, name, price FROM products WHERE product_id = {0};';

/*
 * Get orders list.
 */
module.exports.getOrdersByPartyID_F1 =
    'SELECT order_id, users.user_id AS user_id, users.name AS user_name, product, price, TO_CHAR(orders.create_date, \'yyyy-mm-dd hh24:mm:ss\') AS create_date, orders.note AS note FROM orders, users WHERE (users.user_id = orders.user_id AND orders.party_id = {0});';

/*
 * paramters:
 *   0: user_id
 *   1: party_id
 *   2: product
 *   3: price
 * Return: order_id
 */
module.exports.insertOrder_F5 = 
    'INSERT INTO orders (user_id, party_id, product, price, create_date, note) VALUES ({0}, {1}, \'{2}\', {3}, now(), \'{4}\') RETURNING order_id;';

/*
 * Get all stores.
 * Return: id, name, phone_number, create_date, min_spending, image
 */
module.exports.queryStores = 
    'SELECT store_id AS id, name, phone_number, TO_CHAR(create_date, \'yyyy-mm-dd hh24:mm:ss\') AS create_date, min_spending, image FROM stores ORDER BY name;';

/*
 * Add new store, return store_id.
 * Parameters:
 *   0: columns list.
 *   1: values list.
 */
module.exports.insertStore_F2 = 
    'INSERT INTO stores {0} VALUES {1} RETURNING store_id';
    
/*
 * Get store info.
 * Parameter:
 *   0: store ID.
 * Return: name, phone_number, create_date, image, min_spending
 */
module.exports.getStoreInfo_F1 = 
    'SELECT name, phone_number, TO_CHAR(create_date, \'yyyy-mm-dd hh24:mi:ss\') AS create_date, image, min_spending FROM stores WHERE store_id = {0};';

/*
 * Get party info.
 * Parameter:
 *   0: party ID.
 * Return: name, organization_id, creator_id, store_id, create_date, expired_date, ready, deleted
 */
module.exports.getPartyInfo_F1 = 
    'SELECT name, organization_id, creator_id, store_id, TO_CHAR(create_date, \'yyyy-mm-dd hh24:mi:ss\') AS create_date, TO_CHAR(expired_date, \'yyyy-mm-dd hh24:mi:ss\') AS expired_date, ready, deleted FROM parties WHERE party_id = {0};';

/*
 * Get product comments.
 * Paramter:
 *   0: product_id
 * Return comment_id, product_id, product_name, user_id, user_name, text, date, stars, image
 */
module.exports.getProductComments_F1 = 
    'SELECT comment_id, comments.product_id, products.name AS product_name, comment_user_id AS user_id, users.name AS user_name, text, stars, comments.date, comments.image FROM comments, users, products WHERE (comment_user_id = users.user_id AND comments.product_id = products.product_id AND comments.product_id = {0});';
    
module.exports.insertComment_F5 = 
    'INSERT INTO comments (product_id, comment_user_id, text, stars, image, date) VALUES  ({0}, {1}, {2}, {3}, {4}, NOW());';
    
/*
 * For each orders where is given party, decrease user money, and set party ready to true.
 * Parameter:
 *   0: party_id
 */
module.exports.setPartyReadyAndUpdateUsersMoney_F1 =
    'BEGIN;'
  + 'WITH price_table AS (SELECT user_id, SUM(orders.price) AS price FROM orders WHERE orders.party_id = {0} GROUP BY user_id) '
  + 'UPDATE users SET money = money - price_table.price FROM price_table WHERE price_table.user_id = users.user_id;'
  + 'UPDATE parties SET ready = true WHERE party_id = {0};'
  + 'COMMIT;';

/*
 * Increase or decrease user's money.
 * Parameter:
 *   0: user_id
 *   1: amount
 */
module.exports.updateUserMoney_F2 =
  'UPDATE users SET money = money + {1} WHERE user_id = {0} RETURNING money;';

/*
 * Get party info by order ID.
 * Parameters:
 *   0: order_id.
 */
module.exports.getPartyByOrderID_F1 =
    'SELECT parties.ready AS ready FROM parties, orders WHERE parties.party_id = orders.party_id AND orders.order_id = {0};';

/*------------------------------------------------------*/
/* General query strings.
 * Parameters:
 *   0: table name.
 *   1: columns list.
 *   2: values list.
 *   3: return column.
 * Return:
 *   return column.
 */

module.exports.insertRow_F4 = 
    'INSERT INTO {0} {1} VALUES {2} RETURNING {3};';
    
/*
 * Delete row.
 * Parameters:
 *   0: table name.
 *   1: column name you wanna delete.
 *   2: delete value condition.
 */
module.exports.deleteRow_F3 = 
    'DELETE FROM {0} WHERE {1} = {2};';

module.exports.updateRow_F4 =
    'UPDATE {0} SET {1} WHERE {2} = {3};';

/*------------------------------------------------------*/
/*
 * Tools.
 */

/*
 * return string of '(a, b, c)' style.
 */
module.exports.arrayToSQLInsertString = function (list) {
    var result = '';
    if (list.length > 0) {
        result = '(' + list[0];
        for (var i = 1; i < list.length; i++) {
            result += ', ' + list[i];
        }
        result += ')';
         return result;
    }
    else {
        return '()';
    }
};

/*
 * Return string of 'a=a1, b=b1' style.
 */
module.exports.arrayToSQLUpdateString = function (cols, vals) {
    var result = '';
    if (cols.length > 0 && vals.length > 0) {
        result = cols[0] + '=' + vals[0];
        for(var i = 1; i < Math.min(cols.length, vals.length); i++) {
            result += ', ' + cols[i] + '=' + vals[i];
        }
    }
    return result;
}

module.exports.SQLString = function (s) {
    return '\'' + s + '\'';
}