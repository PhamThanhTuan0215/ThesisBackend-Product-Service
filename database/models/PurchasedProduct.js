const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

require('./Product');

const PurchasedProduct = sequelize.define('PurchasedProduct', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    order_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    seller_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    product_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        },
        onUpdate: 'CASCADE'
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 0
        }
    },
    total_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "processing",
        validate: {
            isIn: {
                args: [["processing", "completed", "returned"]],
                msg: "status must be processing, completed, or returned"
            }
        }
    }
}, {
    tableName: 'purchased_products'
});

module.exports = PurchasedProduct;