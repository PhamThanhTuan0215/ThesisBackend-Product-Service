const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const CatalogPromotion = require('./CatalogPromotion');

const Promotion = sequelize.define('Promotion', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    catalog_promotion_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'catalog_promotions',
            key: 'id'
        },
        onUpdate: 'CASCADE'
    },
    seller_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    }, // ID của nhà bán tạo chương trình khuyến mãi, // Tên chương trình khuyến mãi
    type: {
        type: DataTypes.ENUM('fixed', 'percent', 'same_price'), // cố định, phần trăm, đồng giá sản phẩm
        allowNull: false,
        defaultValue: 'percent'
    }, // Loại khuyến mãi: giảm giá cố định hoặc theo phần trăm
    value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    }, // Giá trị giảm giá
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    }, // Ngày bắt đầu
    end_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
    }, // Trạng thái hoạt động
}, {
    tableName: 'promotions',
    indexes: [
        {
            unique: true,
            fields: ['catalog_promotion_id', 'seller_id']
        }
    ]
});

Promotion.belongsTo(CatalogPromotion, { foreignKey: 'catalog_promotion_id' });

module.exports = Promotion;