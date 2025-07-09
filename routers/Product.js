const express = require('express')
const Router = express.Router()

const Controller = require('../controllers/Product')

const authenticateToken = require('../middlewares/auth');

// lấy danh sách sản phẩm
Router.get('/list-product', Controller.getAllProducts) // cung cấp thêm các điều kiện lọc

// lấy danh sách sản phẩm dựa trên danh sách các hạng mục thuốc cung cấp
Router.post('/list-product-by-categories', Controller.getAllProductsByCategories) // cung cấp thêm các điều kiện lọc

// Lấy danh sách thương hiệu sản phẩm
Router.get('/brands', Controller.getAllBrands);

// Lấy chi tiết sản phẩm
Router.get('/:id', Controller.getProductById)

// khách hàng lấy thông tin sản phẩm
Router.get('/display-for-customer/:id', Controller.getProductByIdForCustomer) // chỉ lấy các thông tin cần thiết

// nhà bán đăng ký sản phẩm
Router.post('/add-product', Controller.uploadCustom, Controller.addProduct)

// nhà bán xóa sản phẩm
Router.delete('/delete-product/:id', Controller.uploadCustom, Controller.deleteProduct)

// nhà bán cập nhật sản phẩm
Router.put('/update-product/:id', Controller.uploadCustom, Controller.updateProduct)

// admin duyệt sản phầm mà nhà bán đăng ký
Router.put('/approval-product/:id', Controller.uploadCustom, Controller.approvalProduct)

// nhà bán quản lý trạng thái hoạt động của sản phẩm
Router.put('/set-active-product/:id', Controller.uploadCustom, Controller.setActiveProduct)

// kiểm tra số lượng sản phẩm còn lại trong kho
Router.post('/check-stock', Controller.uploadCustom, Controller.checkStock)

// lấy danh sách sản phẩm theo các id
Router.post('/get-products-by-ids', Controller.getProductsByIds)

module.exports = Router