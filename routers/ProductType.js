const express = require('express')
const Router = express.Router()

const Controller = require('../controllers/ProductType')

const authenticateToken = require('../middlewares/auth');

// Lấy danh sách tất cả các product type
Router.get('/list-product-type', Controller.getAllProductTypes)

// Lấy danh sách tất cả các product type và các category của từng product type
Router.get('/full-list-product-type', Controller.getFullListProductTypeWithCategories)

// Thêm product type mới
Router.post('/add-product-type', Controller.addProductType)

// Xóa product type
Router.delete('/delete-product-type/:id', Controller.deleteProductType)

// Cập nhật product type
Router.put('/update-product-type/:id', Controller.updateProductType)

// Lấy danh sách tất cả các attribute của product type
Router.get('/list-detail-attribute/:product_type_id', Controller.getDetailAttributes)

// Thêm attribute mới
Router.post('/add-detail-attributes/:product_type_id', Controller.addDetailAttributes)

// Xóa attribute
Router.delete('/delete-detail-attribute/:id', Controller.deleteDetailAttribute)

// Cập nhật attribute
Router.put('/update-detail-attribute/:id', Controller.updateDetailAttribute)

// Lấy danh sách tất cả các category của product type
Router.get('/list-category/:product_type_id', Controller.getCategories)

// Lấy danh sách tất cả các tên category
Router.get('/category-names', Controller.getDistinctCategoryNames)

// Thêm category mới
Router.post('/add-categories/:product_type_id', Controller.addCategories)

// Xóa category
Router.delete('/delete-category/:id', Controller.deleteCategory)

// Cập nhật category
Router.put('/update-category/:id', Controller.updateCategory)

module.exports = Router