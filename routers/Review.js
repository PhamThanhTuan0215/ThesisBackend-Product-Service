const express = require('express')
const Router = express.Router()

const Controller = require('../controllers/Review')

const authenticateToken = require('../middlewares/auth');

Router.get('/stats', Controller.getAllReviewsWithStats);

Router.get('/:product_id', Controller.getReviewByProductId);

Router.get('/order/:order_id', Controller.getReviewByOrderId);

Router.post('/add/:product_id', Controller.uploadCustom, Controller.writeReview);   // tạm thời dùng trực tiếp thông tin của user trong query, về sau thay bằng việc lấy thông tin user từ token ở header

Router.put('/update/:review_id', Controller.uploadCustom, Controller.updateReview);

// Router.delete('/delete/:review_id', Controller.deleteReview);   // tính năng này ko tồn tại trên các sàn TMDT phổ biến

// Router.delete('/delete-by-manager/:review_id', Controller.deleteReviewByManager); // tính năng này ko tồn tại trên các sàn TMDT phổ biến

// phản hồi đánh giá
Router.post('/response/:review_id', Controller.uploadCustom, Controller.responseReview);

// chỉnh sửa phản hồi
// Router.put('/response/:id', Controller.uploadCustom, Controller.updateResponseReview); // tính năng này ko tồn tại trên các sàn TMDT phổ biến

// xóa phản hồi
// Router.delete('/response/:id', Controller.deleteResponseReview); // tính năng này ko tồn tại trên các sàn TMDT phổ biến
module.exports = Router