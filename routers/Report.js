const express = require('express')
const Router = express.Router()

const Controller = require('../controllers/Report')

const authenticateToken = require('../middlewares/auth');

Router.get('/products', Controller.reportProducts) // có thể truyền seller_id nếu muốn thống kê riêng cho nhà bán

module.exports = Router