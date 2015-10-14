/*************************************
  get Products list by store ID
  [
      {
          id,
          name,
          price
      }
  ]
*************************************/
module.exports.queryProductsListByStoreID_F1 = 'SELECT product_id AS id, name, price FROM products WHERE (store_id = {0});';

/*
  paramters:
    user_id
    party_id
    product
    price
*/
module.exports.insertOrder_F4 = 'INSERT INTO orders (user_id, party_id, product, price, create_date) VALUES ({0}, {1}, \'{2}\', {3}, now()) RETURNING order_id;';

/*
 * Get all stores.
 * Return: id, name, phone_number, create_date, min_spending, image
 */
module.exports.queryStores = 'SELECT store_id AS id, name, phone_number, TO_CHAR(create_date, \'yyyy-mm-dd hh:mm:ss\') AS create_date, min_spending, image FROM stores;';

/*
 * Add new store, return store_id.
 * Parameters:
 *   0: columns list.
 *   1: values list.
 */
module.exports.insertStore_F2 = 'INSERT INTO stores {0} VALULES {1} RETURNING store_id';

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