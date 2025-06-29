const express = require('express')
const Router = express.Router()

const Controller = require('../controllers/Promotion')

const authenticateToken = require('../middlewares/auth');

// lấy danh sách khuyến mãi
Router.get('/', Controller.getAllPromotions) // lọc theo seller_id

// lấy danh sách chương trình khuyến mãi khả dụng cho khách hàng
Router.get('/available', Controller.getAvailablePromotionsWithProducts)

// Lấy danh sách sản phẩm đang được bán trong chương trình khuyến mãi
Router.get('/available/products', Controller.getActiveProductsInPromotion)

// Lấy danh sách sản phẩm của seller chưa tham gia chương trình khuyến mãi nào
Router.get('/not-in-promotion', Controller.getProductsNotInAnyPromotion)

// lấy thông tin khuyến mãi
Router.get('/:id', Controller.getPromotionById)

// tạo khuyến mãi
Router.post('/', Controller.createPromotion)

// cập nhật khuyến mãi
Router.put('/:id', Controller.updatePromotion)

// xóa khuyến mãi
Router.delete('/:id', Controller.deletePromotion)

// cập nhật trạng thái khuyến mãi
Router.put('/:id/status', Controller.updatePromotionStatus)

// áp dụng các sản phẩm vào khuyến mãi (truyền vào product_ids, nếu muốn thao tác với 1 sản phẩm thì vẫn truyền product_ids chứa 1 phần tử)
Router.post('/:id/products', Controller.applyProductsToPromotion)

// xóa sản phẩm khỏi khuyến mãi (truyền vào product_ids)
Router.delete('/:id/products', Controller.removeProductFromPromotion)

// xem danh sách sản phẩm đã áp dụng vào khuyến mãi
Router.get('/:id/products', Controller.getProductsInPromotion)

// tùy chỉnh khuyến mãi cho các sản phẩm trong khuyến mãi (truyền vào product_ids)
Router.put('/:id/products/custom', Controller.customProductInPromotion)

module.exports = Router