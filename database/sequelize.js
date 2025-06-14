const { Sequelize } = require('sequelize');
require('dotenv').config()

const sequelize = new Sequelize(process.env.URI_PRODUCT_SERVICE_DATABASE, {
  dialect: 'postgres',
  logging: false,
});

module.exports = sequelize;