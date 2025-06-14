const {DataTypes} = require('sequelize')
const sequelize = require('../sequelize')

require('./ProductType')

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    product_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'product_types',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    category_name: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'categories',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['category_name', 'product_type_id']  // Đảm bảo unique combination: category_name ko đc trùng nhau nếu nó cùng product_type_id
        }
    ]
})

module.exports = Category;