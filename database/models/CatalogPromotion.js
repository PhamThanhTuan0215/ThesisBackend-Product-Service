const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const CatalogPromotion = sequelize.define('CatalogPromotion', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }, // Tên chương trình khuyến mãi
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
    }, // Trạng thái hoạt động
}, {
    tableName: 'catalog_promotions'
});

module.exports = CatalogPromotion;