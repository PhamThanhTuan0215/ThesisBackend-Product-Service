const express = require('express')
const Router = express.Router()

const Controller = require('../controllers/PurchasedProduct')

const authenticateToken = require('../middlewares/auth');

Router.post('/add', Controller.addPurchasedProduct)

Router.put('/update-status', Controller.updateStatusPurchasedProduct)

Router.delete('/cancel/:order_id', Controller.deletePurchasedProduct)

Router.put('/returned/:order_id', Controller.returnedPurchasedProduct)

module.exports = Router