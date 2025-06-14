const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

require('./ProductType')
require('./Category')

const Product = sequelize.define('Product', {
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
    import_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    retail_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    seller_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
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
    },
    active_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "inactive",
        validate: {
            isIn: {
                args: [["active", "inactive"]],
                msg: "active_status must be active, inactive"
            }
        }
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
    return_policy: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: {
            isJSON(value) {
                if (typeof value !== 'object' || Array.isArray(value)) {
                    throw new Error('return_policy must be a valid JSON object');
                }
            }
        }
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
    tableName: 'products' // TABLE_NAME
});

module.exports = Product;