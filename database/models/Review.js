const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

require('./Product');

const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    seller_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    order_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    user_fullname: {
        type: DataTypes.STRING,
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
    comment: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    rating: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: 0,
            max: 5
        }
    },
    url_images_related: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
    },
    is_edited: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'reviews'
});

module.exports = Review;