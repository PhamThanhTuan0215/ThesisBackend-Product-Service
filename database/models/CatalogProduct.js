const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

require('./ProductType')
require('./Category')

// danh sách những sản phẩm sàn cho phép bán
const CatalogProduct = sequelize.define('CatalogProduct', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    brand: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    active_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active",
        validate: {
            isIn: {
                args: [["active", "inactive"]],
                msg: "active_status must be active or inactive"
            }
        }
    }, // trạng thái hoạt động do sàn quản lý (1 sản phẩm chỉ được bán cho khách hàng khi active_status của sàn và active_status của nhà bán cùng là active)
    url_image: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    url_registration_license: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    product_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'product_types',
            key: 'id'
        },
        onUpdate: 'CASCADE'
    },
    category_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'categories',
            key: 'id'
        },
        onUpdate: 'CASCADE'
        // ko thiết lập onDelete: 'CASCADE' là để chặn việc cấp cha bị xóa nếu cấp hiện tại có chứa liên kết tới cấp cha
    },
    product_details: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: {
            isJSON(value) {
                if (typeof value !== 'object' || Array.isArray(value)) {
                    throw new Error('product_details must be a valid JSON object');
                }
            }
        }
    }
}, {
    tableName: 'catalog_products' // TABLE_NAME
});

module.exports = CatalogProduct;