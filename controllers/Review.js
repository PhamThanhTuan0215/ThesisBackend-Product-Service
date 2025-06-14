const Review = require('../database/models/Review')
const PurchasedProduct = require('../database/models/PurchasedProduct')

module.exports.getReviewByProductId = async (req, res) => {
    try {
        const { product_id } = req.params;

        const reviews = await Review.findAll({
            where: { product_id },
            order: [['updatedAt', 'DESC']]
        });

        return res.status(200).json({ code: 0, message: 'Lấy danh sách đánh giá của sản phẩm thành công', data: reviews });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh sách đánh giá của sản phẩm thất bại', error: error.message });
    }
}

module.exports.writeReview = async (req, res) => {
    try {
        const { user_id, user_fullname } = req.query;
        const { product_id } = req.params;
        const { rating, comment } = req.body;

        const errors = [];

        if (!user_id || user_id <= 0) errors.push('user_id cần cung cấp');
        if (!user_fullname || user_fullname === '') errors.push('user_fullname cần cung cấp');
        if (!rating || isNaN(rating) || rating < 1) errors.push('rating phải là số và lớn hơn hoặc bằng 1');
        if (!comment || comment === '') errors.push('comment cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const purchasedProduct = await PurchasedProduct.findOne({
            where: {
                user_id,
                product_id
            },
            order: [['updatedAt', 'DESC']]
        })

        if(!purchasedProduct) {
            return res.status(403).json({ code: 1, message: 'Chưa mua sản phẩm này' });
        }

        if(purchasedProduct.status !== 'completed') {
            return res.status(403).json({ code: 1, message: 'Chưa hoàn tất quá trình mua sản phẩm' });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 ngày trước
        if (purchasedProduct.updatedAt < thirtyDaysAgo) {
            return res.status(403).json({ code: 1, message: 'Chỉ có thể đánh giá sản phẩm đã mua dưới 30 ngày' });
        }

        let review = await Review.findOne({
            where: { user_id, product_id }
        });

        if (review) {
            review.rating = rating;
            review.comment = comment;
            review.user_fullname = user_fullname;
            await review.save();

            return res.status(200).json({ code: 0, message: 'Cập nhật đánh giá thành công', data: review });
        }
        else {
            review = await Review.create({
                user_id,
                order_id: purchasedProduct.order_id,
                user_fullname,
                product_id,
                rating,
                comment
            });
        }

        return res.status(200).json({ code: 0, message: 'Viết đánh giá thành công', data: review });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Viết đánh giá thất bại', error: error.message });
    }
}

module.exports.deleteReview = async (req, res) => {
    try {
        const { user_id } = req.query;
        const { review_id } = req.params;

        const review = await Review.findByPk(review_id);

        if (!review) {
            return res.status(404).json({ code: 1, message: 'Đánh giá không tồn tại' });
        }

        if (review.user_id != user_id) {
            return res.status(403).json({ code: 1, message: 'Người dùng không được phép xóa đánh giá này' });
        }

        await review.destroy();

        return res.status(200).json({ code: 0, message: 'Xóa đánh giá thành công', data: review });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa đánh giá thất bại', error: error.message });
    }
}

module.exports.deleteReviewByManager = async (req, res) => {
    try {
        const { review_id } = req.params;

        const review = await Review.findByPk(review_id);

        if (!review) {
            return res.status(404).json({ code: 1, message: 'Đánh giá không tồn tại' });
        }

        await review.destroy();

        return res.status(200).json({ code: 0, message: 'Xóa đánh giá thành công', data: review });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa đánh giá thất bại', error: error.message });
    }
}