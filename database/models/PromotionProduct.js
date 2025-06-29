const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Promotion = require('./Promotion');

const PromotionProduct = sequelize.define('PromotionProduct', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    promotion_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'promotions',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
    custom_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    custom_start_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    custom_end_date: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'promotion_products',
    indexes: [
        {
            unique: true,
            fields: ['promotion_id', 'product_id']
        }
    ]
});

PromotionProduct.belongsTo(Promotion, { foreignKey: 'promotion_id' });
Promotion.hasMany(PromotionProduct, { foreignKey: 'promotion_id' });

module.exports = PromotionProduct;