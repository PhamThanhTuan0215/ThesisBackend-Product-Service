const express = require('express')
const Router = express.Router()

const Controller = require('../controllers/CatalogProduct')

const authenticateToken = require('../middlewares/auth');

// lấy danh sách sản phẩm trong danh mục cho phép
Router.get('/', Controller.getAllCatalogProducts)

// lấy thông tin sản phẩm trong danh mục cho phép
Router.get('/:id', Controller.getCatalogProductById)

// thêm sản phẩm vào danh mục cho phép
Router.post('/', Controller.uploadCustom, Controller.addCatalogProduct)

// xóa sản phẩm khỏi danh mục cho phép
Router.delete('/:id', Controller.deleteCatalogProduct)

// cập nhật sản phẩm trong danh mục cho phép
Router.put('/:id', Controller.uploadCustom, Controller.updateCatalogProduct)

// quản lý trạng thái hoạt động của sản phẩm trong danh mục cho phép
Router.put('/:id/set-active', Controller.setActiveCatalogProduct)

module.exports = Router