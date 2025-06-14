const {DataTypes} = require('sequelize')
const sequelize = require('../sequelize')

const ProductType = sequelize.define('ProductType', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    product_type_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'product_types',
    timestamps: false
})

module.exports = ProductType;