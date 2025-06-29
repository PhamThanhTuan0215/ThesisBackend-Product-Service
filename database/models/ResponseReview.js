const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Review = require('./Review');

const ResponseReview = sequelize.define('ResponseReview', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },
    review_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'reviews',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    seller_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    response_comment: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    url_image_related: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    is_edited: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'response_reviews'
});

ResponseReview.belongsTo(Review, { foreignKey: 'review_id', targetKey: 'id' });

module.exports = ResponseReview;