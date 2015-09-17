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