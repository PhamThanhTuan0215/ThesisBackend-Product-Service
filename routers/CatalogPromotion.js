const express = require('express')
const Router = express.Router()

const Controller = require('../controllers/CatalogPromotion')

const authenticateToken = require('../middlewares/auth');

// admin lấy danh sách chương trình khuyến mãi
Router.get('/', Controller.getAllCatalogPromotions)

// admin lấy thông tin chương trình khuyến mãi
Router.get('/:id', Controller.getCatalogPromotionById)

// admin thêm chương trình khuyến mãi
Router.post('/', Controller.addCatalogPromotion)

// admin xóa chương trình khuyến mãi
Router.delete('/:id', Controller.deleteCatalogPromotion)

// admin cập nhật chương trình khuyến mãi
Router.put('/:id', Controller.updateCatalogPromotion)

// admin quản lý trạng thái hoạt động của chương trình khuyến mãi
Router.put('/:id/set-active', Controller.setActiveCatalogPromotion)

module.exports = Router