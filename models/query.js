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