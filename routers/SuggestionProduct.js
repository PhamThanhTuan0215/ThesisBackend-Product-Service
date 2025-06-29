const express = require('express')
const Router = express.Router()

const Controller = require('../controllers/SuggestionProduct')

const authenticateToken = require('../middlewares/auth');

// lấy danh sách sản phẩm đề xuất
Router.get('/', Controller.getAllSuggestionProducts)

// lấy thông tin sản phẩm đề xuất
Router.get('/:id', Controller.getSuggestionProductById)

// nhà bán đề xuất sản phẩm mới
Router.post('/', Controller.uploadCustom, Controller.addSuggestionProduct)

// nhà bán xóa sản phẩm đề xuất
Router.delete('/:id', Controller.deleteSuggestionProduct)

// nhà bán cập nhật sản phẩm đề xuất
Router.put('/:id', Controller.uploadCustom, Controller.updateSuggestionProduct)

// admin phê duyệt và phản hồi sản phẩm đề xuất
Router.put('/:id/response', Controller.responseSuggestionProduct)

module.exports = Router