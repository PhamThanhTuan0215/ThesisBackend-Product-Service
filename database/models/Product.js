const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const CatalogProduct = require('./CatalogProduct')
const Promotion = require('./Promotion');
const PromotionProduct = require('./PromotionProduct');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    catalog_product_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'catalog_products',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    import_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    }, // giá nhập hàng
    import_date: {
        type: DataTypes.DATE,
        allowNull: false,
    }, // ngày nhập hàng
    url_import_invoice: {
        type: DataTypes.STRING,
        allowNull: false,
    }, // giấy hóa đơn nhập hàng
    retail_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    }, // giá bán lẻ
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
        defaultValue: "active",
        validate: {
            isIn: {
                args: [["active", "inactive"]],
                msg: "active_status must be active or inactive"
            }
        }
    }, // trạng thái hoạt động do nhà bán quản lý (1 sản phẩm chỉ được bán cho khách hàng khi active_status của sàn và active_status của nhà bán cùng là active)
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
    promotion_name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "none"
    }, // tên khuyến mãi (none: không có khuyến mãi, flash_sale: khuyến mãi flash sale, ...)
    promotion_value_percent: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    }, //tỉ lệ giá trị khuyến mãi (0% nếu không có khuyến mãi)
    promotion_start_date: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // ngày bắt đầu khuyến mãi (mặc định lưu giống chương trình khuyến mãi được áp dụng, sau đó có thể tùy chỉnh cho từng sản phẩm)
    promotion_end_date: {
        type: DataTypes.DATE,
        allowNull: true,
    }, // ngày kết thúc khuyến mãi (mặc định lưu giống chương trình khuyến mãi được áp dụng, sau đó có thể tùy chỉnh cho từng sản phẩm)
    actual_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    } // giá bán thực tế sẽ hiển thị cho khách hàng (sau khi áp dụng khuyến mãi)
}, {
    tableName: 'products' // TABLE_NAME
});

// thiết lập mặc định cho giá bán thực tế
Product.beforeSave(async (product, options) => {
    product.actual_price = product.retail_price;
});


Product.belongsTo(CatalogProduct, { foreignKey: 'catalog_product_id' });
Product.belongsToMany(Promotion, { through: PromotionProduct, foreignKey: 'product_id', otherKey: 'promotion_id' });
PromotionProduct.belongsTo(Product, { foreignKey: 'product_id' });

Product.addHook('afterFind', async (result, options) => {
    const now = new Date();

    const applyPromotionData = (product) => {
        if (!product) return;

        // Find the active promotion for the product
        const activePromotion = product.Promotions?.find(promotion => {
            const promoProduct = promotion.PromotionProduct;
            const promoStartDate = promoProduct.custom_start_date || promotion.start_date;
            const promoEndDate = promoProduct.custom_end_date || promotion.end_date;

            return (
                promotion.status === 'active' &&
                (!promoStartDate || new Date(promoStartDate) <= now) &&
                (!promoEndDate || new Date(promoEndDate) >= now)
            );
        });

        if (activePromotion) {
            // hiện tại activePromotion đang liên kết với bảng CatalogPromotion để chứa name bên đó
            product.promotion_name = activePromotion.CatalogPromotion.name;
            product.promotion_start_date = activePromotion.PromotionProduct?.custom_start_date || activePromotion.start_date;
            product.promotion_end_date = activePromotion.PromotionProduct?.custom_end_date || activePromotion.end_date;

            const promotion_value = activePromotion.PromotionProduct?.custom_value || activePromotion.value;

            // Calculate promotion value based on type
            if (activePromotion.type === 'fixed') {
                product.promotion_value_percent = (Number(promotion_value) / Number(product.retail_price)) * 100;
            } else if (activePromotion.type === 'percent') {
                product.promotion_value_percent = Number(promotion_value);
            } else if (activePromotion.type === 'same_price') {
                product.promotion_value_percent = (Number(product.retail_price) - Number(promotion_value)) / Number(product.retail_price) * 100;
            }

            // Calculate actual price
            product.actual_price = Number(product.retail_price) * (1 - Number(product.promotion_value_percent) / 100);
        } else {
            // No active promotion
            product.promotion_name = 'none';
            product.promotion_value_percent = 0;
            product.promotion_start_date = null;
            product.promotion_end_date = null;
            product.actual_price = Number(product.retail_price);
        }
    };

    if (Array.isArray(result)) {
        result.forEach(applyPromotionData);
    } else if (result) {
        applyPromotionData(result);
    }
});

module.exports = Product;