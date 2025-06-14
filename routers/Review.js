const express = require('express')
const Router = express.Router()

const Controller = require('../controllers/Review')

const authenticateToken = require('../middlewares/auth');

Router.get('/:product_id', Controller.getReviewByProductId);

Router.post('/add/:product_id',  Controller.writeReview);   // tạm thời dùng trực tiếp thông tin của user trong query, về sau thay bằng việc lấy thông tin user từ token ở header

Router.delete('/delete/:review_id', Controller.deleteReview);   // tạm thời dùng trực tiếp thông tin của user trong query

Router.delete('/delete-by-manager/:review_id', Controller.deleteReviewByManager);

module.exports = Router