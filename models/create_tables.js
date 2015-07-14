var pg = require('pg');
var connectionString = require('../config.js');

//var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/';

var client = new pg.Client(connectionString);
client.connect();
// use query to run SQL query.

// Create users table
// Role: User/PartyCreator/Accountant/Admin
// todo: add Role check
var query = client.query(
    'CREATE TABLE users(' +
        'user_id SERIAL PRIMARY KEY,' +
        'name VARCHAR(32) not null,' +
        'password VARCHAR(32) not null,' +
        'create_date TIMESTAMP not null,' +
        'role VARCHAR(32) not null,' +
        'money NUMERIC(12, 2),' +
        'image VARCHAR(512))'
);

// Create Organizations table
var query = client.query(
    'CREATE TABLE organizations(' +
        'organization_id SERIAL PRIMARY KEY,' +
        'name VARCHAR(32) not null,' +
        'create_date TIMESTAMP not null)'
);

// Create organization_creators
var query = client.query(
    'CREATE TABLE organization_creators(' +
        'id SERIAL PRIMARY KEY,' +
        'creator_id INTEGER REFERENCES users(user_id),' +
        'organization_id INTEGER  REFERENCES organizations(organization_id))'
);

// Create user_organization table
var query = client.query(
    'CREATE TABLE user_organization(' +
        'id SERIAL PRIMARY KEY,' +
        'user_id INTEGER REFERENCES users(user_id),' +
        'organization_id INTEGER  REFERENCES organizations(organization_id))'
);

// Stores table
var query = client.query(
    'CREATE TABLE stores(' +
        'store_id SERIAL PRIMARY KEY,' +
        'name VARCHAR(64) NOT NULL,' +
        'phone_number VARCHAR(64),' +
        'create_date TIMESTAMP,' +
        'image VARCHAR(512),' +
        'min_spending NUMERIC(12, 2))'
);

// products table
var query = client.query(
    'CREATE TABLE products(' +
        'product_id SERIAL PRIMARY KEY,' +
        'store_id INTEGER REFERENCES stores(store_id),' +
        'name VARCHAR(64),' +
        'price NUMERIC(12, 2))'
);

// Comments table
var query = client.query(
    'CREATE TABLE comments(' +
        'comment_id SERIAL PRIMARY KEY,' +
        'product_id INTEGER REFERENCES products(product_id),' +
        'comment_user_id INTEGER REFERENCES users(user_id),' +
        'text TEXT,' +
        'stars INTEGER)'
);

// parties table
var query = client.query(
    'CREATE TABLE parties(' +
        'party_id SERIAL PRIMARY KEY,' +
        'organization_id INTEGER REFERENCES organizations(organization_id),' +
        'creator_id INTEGER REFERENCES users(user_id),' +
        'store_id INTEGER REFERENCES Stores(store_id),' +
        'name VARCHAR(64),' +
        'create_date TIMESTAMP,' +
        'expired_date TIMESTAMP,' +
        'ready BOOLEAN)'
);

// Orders table
var query = client.query(
    'CREATE TABLE orders(' +
        'order_id SERIAL PRIMARY KEY,' +
        'user_id INTEGER REFERENCES users(user_id),' +
        'party_id INTEGER REFERENCES parties(party_id),' +
        'product VARCHAR(64),' +
        'price NUMERIC(12, 2),' +
        'create_date TIMESTAMP)'
);

query.on('end', function() { client.end(); });