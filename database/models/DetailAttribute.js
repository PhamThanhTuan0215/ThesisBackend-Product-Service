const {DataTypes} = require('sequelize')
const sequelize = require('../sequelize')

require('./ProductType')

const DetailAttribute = sequelize.define('DetailAttribute', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    product_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'product_types',
            key: 'id'
        },
        onUpdate: 'CASCADE', // nếu id của product_types thay đổi thì product_type_id của detail_attributes cũng thay đổi theo
        onDelete: 'CASCADE'  // nếu 1 hàng trong product_types bị xóa thì tất cả các hàng của detail_attributes có product_type_id liên quan cũng bị xóa
    },
    attribute_name: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'detail_attributes',
    timestamps: false
})

module.exports = DetailAttribute;