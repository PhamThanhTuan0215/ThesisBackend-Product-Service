const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

require('./ProductType')
require('./Category')

// danh sách những sản phẩm sàn cho phép bán
const SuggestionProduct = sequelize.define('SuggestionProduct', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    brand: {
        type: DataTypes.STRING,
        allowNull: false,
    },
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
    },
    seller_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    }, // id của cửa hàng đề xuất sản phẩm mới
    seller_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    approval_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
        validate: {
            isIn: {
                args: [["pending", "approved", "rejected"]],
                msg: "approval_status must be pending, approved, or rejected"
            }
        }
    }, // trạng thái phê duyệt đề xuất sản phẩm mới
    response_message: {
        type: DataTypes.STRING,
        allowNull: true,
    }, // tin nhắn phản hồi phê duyệt hoặc lời từ chối của sàn
    response_at: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // thời gian phản hồi phê duyệt hoặc lời từ chối của sàn
    response_by_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
    }, // id của người phản hồi phê duyệt hoặc lời từ chối của sàn
    response_by_name: {
        type: DataTypes.STRING,
        allowNull: true,
    }, // tên của người phản hồi phê duyệt hoặc lời từ chối của sàn
}, {
    tableName: 'suggestion_products' // TABLE_NAME
});

module.exports = SuggestionProduct;