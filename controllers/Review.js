const Review = require('../database/models/Review')
const PurchasedProduct = require('../database/models/PurchasedProduct')
const ResponseReview = require('../database/models/ResponseReview')

const sequelize = require('../database/sequelize');

const { uploadFiles, deleteFile } = require('../ultis/manageFilesOnCloudinary')

const multer = require('multer');
const storage = multer.memoryStorage();

// Cấu hình multer
const uploadConfig = {
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Kiểm tra loại file
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file hình ảnh!'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // tăng giới hạn mỗi file lên 10MB
        fieldSize: 10 * 1024 * 1024, // tăng giới hạn kích thước field
        files: 10 // cho phép tối đa 10 files
    }
};

const upload = multer(uploadConfig);

const folderPathUpload = 'ecommerce-pharmacy/reviews'

module.exports.uploadCustom = upload.fields([
    { name: 'image_related', maxCount: 10 }
]);

module.exports.getReviewByProductId = async (req, res) => {
    try {
        const { product_id } = req.params;

        const reviews = await sequelize.query(`
            SELECT 
                r.id AS review_id,
                r.user_id,
                r.seller_id,
                r.order_id,
                r.user_fullname,
                r.product_id,
                r.comment,
                r.rating,
                r.url_images_related AS review_url_images_related,
                r.is_edited,
                r."createdAt" AS review_created_at,
                r."updatedAt" AS review_updated_at,

                rr.id AS response_id,
                rr.review_id as response_review_id,
                rr.response_comment,
                rr.seller_name,
                rr.url_image_related AS response_url_image_related,
                rr."createdAt" AS response_created_at,
                rr."updatedAt" AS response_updated_at
            FROM reviews r
            LEFT JOIN response_reviews rr ON r.id = rr.review_id
            WHERE r.product_id = :productId
            ORDER BY r."updatedAt" DESC
        `, {
            replacements: { productId: product_id },
            type: sequelize.QueryTypes.SELECT
        });

        // Gom các phản hồi vào từng review
        const grouped = {};

        for (const row of reviews) {
            const reviewId = row.review_id;

            if (!grouped[reviewId]) {
                grouped[reviewId] = {
                    id: row.review_id,
                    user_id: row.user_id,
                    seller_id: row.seller_id,
                    order_id: row.order_id,
                    user_fullname: row.user_fullname,
                    product_id: row.product_id,
                    comment: row.comment,
                    rating: row.rating,
                    url_images_related: row.review_url_images_related || [], // Ensure it's always an array
                    is_edited: row.is_edited,
                    createdAt: row.review_created_at,
                    updatedAt: row.review_updated_at,
                    response_review: null
                };
            }

            if (row.response_id) {
                grouped[reviewId].response_review = {
                    id: row.response_id,
                    review_id: row.response_review_id,
                    seller_name: row.seller_name,
                    response_comment: row.response_comment,
                    url_image_related: row.response_url_image_related,
                    createdAt: row.response_created_at,
                    updatedAt: row.response_updated_at,
                };
            }
        }

        const result = Object.values(grouped);

        return res.status(200).json({ code: 0, message: 'Lấy danh sách đánh giá của sản phẩm thành công', data: result });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh sách đánh giá của sản phẩm thất bại', error: error.message });
    }
}

module.exports.getReviewByOrderId = async (req, res) => {
    try {
        const { order_id } = req.params;

        const reviews = await sequelize.query(`
            SELECT 
                r.id AS review_id,
                r.user_id,
                r.seller_id,
                r.order_id,
                r.user_fullname,
                r.product_id,
                r.comment,
                r.rating,
                r.url_images_related AS review_url_images_related,
                r.is_edited,
                r."createdAt" AS review_created_at,
                r."updatedAt" AS review_updated_at,

                rr.id AS response_id,
                rr.review_id as response_review_id,
                rr.response_comment,
                rr.seller_name,
                rr.url_image_related AS response_url_image_related,
                rr."createdAt" AS response_created_at,
                rr."updatedAt" AS response_updated_at
            FROM reviews r
            LEFT JOIN response_reviews rr ON r.id = rr.review_id
            WHERE r.order_id = :orderId
            ORDER BY r."updatedAt" DESC
        `, {
            replacements: { orderId: order_id },
            type: sequelize.QueryTypes.SELECT
        });

        // Gom các phản hồi vào từng review
        const grouped = {};

        for (const row of reviews) {
            const reviewId = row.review_id;

            if (!grouped[reviewId]) {
                grouped[reviewId] = {
                    id: row.review_id,
                    user_id: row.user_id,
                    seller_id: row.seller_id,
                    order_id: row.order_id,
                    user_fullname: row.user_fullname,
                    product_id: row.product_id,
                    comment: row.comment,
                    rating: row.rating,
                    url_images_related: row.review_url_images_related || [], // Ensure it's always an array
                    is_edited: row.is_edited,
                    createdAt: row.review_created_at,
                    updatedAt: row.review_updated_at,
                    response_review: null
                };
            }

            if (row.response_id) {
                grouped[reviewId].response_review = {
                    id: row.response_id,
                    review_id: row.response_review_id,
                    seller_name: row.seller_name,
                    response_comment: row.response_comment,
                    url_image_related: row.response_url_image_related,
                    createdAt: row.response_created_at,
                    updatedAt: row.response_updated_at,
                };
            }
        }

        const result = Object.values(grouped);

        return res.status(200).json({ code: 0, message: 'Lấy danh sách đánh giá của đơn hàng thành công', data: result });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh sách đánh giá của đơn hàng thất bại', error: error.message });
    }
}

module.exports.writeReview = async (req, res) => {

    let public_id_image_related = []

    try {
        const { user_id, user_fullname } = req.query;
        const { product_id } = req.params;
        const { rating, comment, order_id } = req.body;

        const errors = [];

        if (!user_id || user_id <= 0) errors.push('user_id cần cung cấp');
        if (!user_fullname || user_fullname === '') errors.push('user_fullname cần cung cấp');
        if (!rating || isNaN(rating) || rating < 1) errors.push('rating phải là số và lớn hơn hoặc bằng 1');
        if (!comment || comment === '') errors.push('comment cần cung cấp');
        if (!order_id || order_id <= 0) errors.push('order_id cần cung cấp');

        let image_related_files = [];
        let url_images_related = [];

        if (req.files && req.files['image_related']) {
            image_related_files = req.files['image_related'];
        }

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        if (image_related_files.length > 0) {
            const results = await uploadFiles(image_related_files, folderPathUpload);

            results.forEach(result => {
                url_images_related.push(result.secure_url);
                public_id_image_related.push(result.public_id);
            });
        }

        const purchasedProduct = await PurchasedProduct.findOne({
            where: {
                user_id,
                product_id,
                order_id
            },
            order: [['updatedAt', 'DESC']]
        })

        if (!purchasedProduct) {
            return res.status(400).json({ code: 1, message: 'Chưa đủ điều kiện để đánh giá sản phẩm' });
        }

        if (purchasedProduct.status !== 'completed') {
            return res.status(400).json({ code: 1, message: 'Chưa hoàn tất quá trình mua sản phẩm' });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 ngày trước
        if (purchasedProduct.updatedAt < thirtyDaysAgo) {
            return res.status(400).json({ code: 1, message: 'Chỉ có thể đánh giá sản phẩm đã mua dưới 30 ngày' });
        }

        let review = await Review.findOne({
            where: { user_id, product_id, order_id }
        });

        if (review) {
            return res.status(400).json({ code: 1, message: 'Đã đánh giá sản phẩm này trong đơn hàng' });
        }

        review = await Review.create({
            user_id,
            seller_id: purchasedProduct.seller_id,
            order_id: order_id,
            user_fullname,
            product_id,
            rating,
            comment,
            url_images_related
        });

        return res.status(200).json({ code: 0, message: 'Viết đánh giá thành công', data: review });
    }
    catch (error) {
        if (public_id_image_related.length > 0) {
            public_id_image_related.forEach(public_id => {
                deleteFile(public_id);
            });
        }

        return res.status(500).json({ code: 2, message: 'Viết đánh giá thất bại', error: error.message });
    }
}

module.exports.updateReview = async (req, res) => {
    let new_public_id_image_related = []

    try {
        const { review_id } = req.params;
        const { rating, comment } = req.body;

        const errors = [];

        if (!rating || isNaN(rating) || rating < 1) errors.push('rating phải là số và lớn hơn hoặc bằng 1');
        if (!comment || comment === '') errors.push('comment cần cung cấp');
        if (!review_id || review_id <= 0) errors.push('review_id cần cung cấp');

        const review = await Review.findByPk(review_id);

        if (!review) {
            return res.status(404).json({ code: 1, message: 'Đánh giá không tồn tại' });
        }

        if (review.is_edited) {
            return res.status(400).json({ code: 1, message: 'Chỉ có thể chỉnh sửa đánh giá 1 lần' });
        }

        const purchasedProduct = await PurchasedProduct.findOne({
            where: {
                user_id: review.user_id,
                product_id: review.product_id,
                order_id: review.order_id
            },
            order: [['updatedAt', 'DESC']]
        })

        if (!purchasedProduct) {
            return res.status(400).json({ code: 1, message: 'Chưa đủ điều kiện để đánh giá sản phẩm' });
        }

        if (purchasedProduct.status !== 'completed') {
            return res.status(400).json({ code: 1, message: 'Chưa hoàn tất quá trình mua sản phẩm' });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 ngày trước
        if (purchasedProduct.updatedAt < thirtyDaysAgo) {
            return res.status(400).json({ code: 1, message: 'Chỉ có thể chỉnh sửa đánh giá sản phẩm đã mua dưới 30 ngày' });
        }

        let image_related_files = [];

        if (req.files && req.files['image_related']) {
            image_related_files = req.files['image_related'];
        }

        let old_public_id_image_related = [];

        if (image_related_files.length > 0) {
            // Lấy public id trước đó của các ảnh
            if (review.url_images_related && review.url_images_related.length > 0) {
                old_public_id_image_related = review.url_images_related.map(url => {
                    return extractFolderFromURL(url) + url.split('/').pop().split('.')[0];
                });
            }

            const results = await uploadFiles(image_related_files, folderPathUpload);

            // cập nhật url mới trong DB
            review.url_images_related = results.map(result => result.secure_url);
            new_public_id_image_related = results.map(result => result.public_id);
        }

        review.comment = comment;
        review.rating = rating;
        review.is_edited = true;

        await review.save();

        if (old_public_id_image_related.length > 0) {
            old_public_id_image_related.forEach(public_id => {
                deleteFile(public_id);
            });
        }

        return res.status(200).json({ code: 0, message: 'Chỉnh sửa đánh giá thành công', data: review });
    }
    catch (error) {
        if (new_public_id_image_related.length > 0) {
            new_public_id_image_related.forEach(public_id => {
                deleteFile(public_id);
            });
        }

        return res.status(500).json({ code: 2, message: 'Chỉnh sửa đánh giá thất bại', error: error.message });
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

        let public_ids_image_related = [];

        if (review.url_images_related && review.url_images_related.length > 0) {
            public_ids_image_related = review.url_images_related.map(url => {
                return extractFolderFromURL(url) + url.split('/').pop().split('.')[0];
            });
        }

        await review.destroy();

        if (public_ids_image_related.length > 0) {
            public_ids_image_related.forEach(public_id => {
                deleteFile(public_id);
            });
        }

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

        let public_ids_image_related = [];

        if (review.url_images_related && review.url_images_related.length > 0) {
            public_ids_image_related = review.url_images_related.map(url => {
                return extractFolderFromURL(url) + url.split('/').pop().split('.')[0];
            });
        }

        await review.destroy();

        if (public_ids_image_related.length > 0) {
            public_ids_image_related.forEach(public_id => {
                deleteFile(public_id);
            });
        }

        return res.status(200).json({ code: 0, message: 'Xóa đánh giá thành công', data: review });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa đánh giá thất bại', error: error.message });
    }
}

module.exports.responseReview = async (req, res) => {
    let public_id_image_related = null

    try {
        const { review_id } = req.params;
        const { seller_name, response_comment } = req.body;

        const review = await Review.findByPk(review_id);

        if (!review) {
            return res.status(404).json({ code: 1, message: 'Đánh giá không tồn tại' });
        }

        const existedResponseReview = await ResponseReview.findOne({
            where: { review_id, seller_name }
        });

        if (existedResponseReview) {
            return res.status(400).json({ code: 1, message: 'Phản hồi về đánh giá này đã tồn tại' });
        }

        let image_related_file = null;
        let url_image_related = null;

        if (req.files && req.files['image_related']) {
            image_related_file = req.files && req.files['image_related'] && req.files['image_related'][0];
        }

        if (image_related_file) {
            const filesToUpload = [image_related_file];

            const results = await uploadFiles(filesToUpload, folderPathUpload);

            const result_image_related_file = results[0];

            url_image_related = result_image_related_file.secure_url;

            public_id_image_related = result_image_related_file.public_id;
        }

        const responseReview = await ResponseReview.create({
            review_id,
            seller_name,
            response_comment,
            url_image_related
        });

        return res.status(200).json({ code: 0, message: 'Phản hồi đánh giá thành công', data: responseReview });
    }
    catch (error) {
        if (public_id_image_related) {
            deleteFile(public_id_image_related);
        }

        return res.status(500).json({ code: 2, message: 'Phản hồi đánh giá thất bại', error: error.message });
    }
}

module.exports.updateResponseReview = async (req, res) => {
    let new_public_id_image_related = null

    try {
        const { id } = req.params;
        const { response_comment } = req.body;

        const responseReview = await ResponseReview.findByPk(id);

        if (!responseReview) {
            return res.status(404).json({ code: 1, message: 'Phản hồi đánh giá không tồn tại' });
        }

        if (responseReview.is_edited) {
            return res.status(400).json({ code: 1, message: 'Chỉ cho phép chỉnh sửa phản hồi 1 lần cho mỗi đánh giá' });
        }

        let image_related_file = null;

        if (req.files && req.files['image_related']) {
            image_related_file = req.files && req.files['image_related'] && req.files['image_related'][0];
        }

        let old_public_id_image_related = null;

        if (image_related_file) {

            // Lấy public id trước đó của ảnh
            if (responseReview.url_image_related) {
                old_public_id_image_related = extractFolderFromURL(responseReview.url_image_related) + responseReview.url_image_related.split('/').pop().split('.')[0];
            }

            const filesToUpload = [image_related_file];
            const results = await uploadFiles(filesToUpload, folderPathUpload);

            const result_image_related_file = results[0];

            // cập nhật url mới trong DB
            responseReview.url_image_related = result_image_related_file.secure_url;

            new_public_id_image_related = result_image_related_file.public_id;
        }

        responseReview.response_comment = response_comment;
        responseReview.is_edited = true;
        await responseReview.save();

        if (old_public_id_image_related && new_public_id_image_related) {
            deleteFile(old_public_id_image_related);
        }

        return res.status(200).json({ code: 0, message: 'Cập nhật phản hồi đánh giá thành công', data: responseReview });
    }
    catch (error) {
        if (new_public_id_image_related) {
            deleteFile(new_public_id_image_related);
        }

        return res.status(500).json({ code: 2, message: 'Cập nhật phản hồi đánh giá thất bại', error: error.message });
    }
}

module.exports.deleteResponseReview = async (req, res) => {

    try {
        const { id } = req.params;

        const responseReview = await ResponseReview.findByPk(id);

        if (!responseReview) {
            return res.status(404).json({ code: 1, message: 'Phản hồi đánh giá không tồn tại' });
        }

        let public_id_image_related = null

        if (responseReview.url_image_related) {
            public_id_image_related = extractFolderFromURL(responseReview.url_image_related) + responseReview.url_image_related.split('/').pop().split('.')[0];
        }

        if (public_id_image_related) {
            deleteFile(public_id_image_related);
        }

        await responseReview.destroy();

        return res.status(200).json({ code: 0, message: 'Xóa phản hồi đánh giá thành công', data: responseReview });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa phản hồi đánh giá thất bại', error: error.message });
    }
}

function extractFolderFromURL(url) {
    // Tách phần sau "upload/" (nếu có)
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return ''; // Không tìm thấy "/upload/", trả về chuỗi rỗng

    // Lấy phần sau "/upload/"
    const path = url.substring(uploadIndex + 8);

    // Loại bỏ tiền tố "v[digits]/" nếu có
    const cleanedPath = path.replace(/^v\d+\//, '');

    // Tìm vị trí của dấu "/" cuối cùng
    const lastSlashIndex = cleanedPath.lastIndexOf('/');

    // Trích xuất toàn bộ path (không có tiền tố "v[digits]/")
    if (lastSlashIndex !== -1) {
        return cleanedPath.substring(0, lastSlashIndex + 1);
    }

    // Nếu không có thư mục
    return ''; // Trả về chuỗi rỗng
}

/**
 * Lấy tất cả review, cho phép lọc theo seller_id, rating, ngày, search, trả về thống kê và danh sách review (có/không phản hồi, kèm dữ liệu phản hồi nếu có)
 * Query: ?seller_id=...&rating=5&rating=4&search=...&from_date=yyyy-mm-dd&to_date=yyyy-mm-dd
 */
module.exports.getAllReviewsWithStats = async (req, res) => {
    try {
        const { seller_id, rating, search, from_date, to_date } = req.query;
        // Lấy ngày hôm nay (UTC)
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(today.getUTCDate() + 1);

        // ----------- 1. Lấy stats (chỉ filter seller_id nếu có) -----------
        let statsSellerSQL = '';
        let statsReplacements = {};
        if (seller_id) {
            statsSellerSQL = ' AND r.seller_id = :sellerId';
            statsReplacements.sellerId = seller_id;
        }
        const statsReviews = await sequelize.query(`
            SELECT 
                r.id AS review_id,
                r.rating,
                r."createdAt" AS review_created_at,
                rr.id AS response_id
            FROM reviews r
            LEFT JOIN response_reviews rr ON r.id = rr.review_id
            WHERE 1=1
            ${statsSellerSQL}
        `, {
            replacements: statsReplacements,
            type: sequelize.QueryTypes.SELECT
        });
        let totalReviews = 0;
        let goodReviews = 0;
        let badReviews = 0;
        let badReviewsNoResponse = 0;
        let todayReviews = 0;
        let starCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const row of statsReviews) {
            totalReviews++;
            if ([3, 4, 5].includes(Number(row.rating))) {
                goodReviews++;
            } else {
                badReviews++;
            }
            const createdAt = new Date(row.review_created_at);
            if (createdAt >= today && createdAt < tomorrow) {
                todayReviews++;
            }
            if ([1, 2, 3, 4, 5].includes(Number(row.rating))) {
                starCount[Number(row.rating)]++;
            }
            if (!row.response_id && [1, 2].includes(Number(row.rating))) {
                badReviewsNoResponse++;
            }
        }
        // Lấy tổng số sản phẩm đã mua (để tính tỷ lệ đánh giá)
        let purchasedCount = 0;
        if (seller_id) {
            purchasedCount = await PurchasedProduct.count({ where: { seller_id } });
        } else {
            purchasedCount = await PurchasedProduct.count();
        }
        const goodReviewRatio = totalReviews > 0 ? (goodReviews / totalReviews) : 0;
        const reviewRate = purchasedCount > 0 ? (totalReviews / purchasedCount) : 0;

        // ----------- 2. Lấy data (áp dụng filter/search như hiện tại) -----------
        // Xử lý filter rating (có thể là mảng hoặc 1 giá trị)
        let ratingFilter = [];
        if (rating) {
            if (Array.isArray(rating)) {
                ratingFilter = rating.map(r => Number(r)).filter(r => [1, 2, 3, 4, 5].includes(r));
            } else if (typeof rating === 'string') {
                ratingFilter = rating.split(',').map(r => Number(r)).filter(r => [1, 2, 3, 4, 5].includes(r));
            } else {
                ratingFilter = [Number(rating)].filter(r => [1, 2, 3, 4, 5].includes(r));
            }
        }
        // Xử lý filter ngày
        let dateFilter = '';
        let replacements = {};
        if (from_date) {
            dateFilter += ` AND r."createdAt" >= :fromDate`;
            replacements.fromDate = new Date(from_date + 'T00:00:00.000Z');
        }
        if (to_date) {
            dateFilter += ` AND r."createdAt" <= :toDate`;
            replacements.toDate = new Date(to_date + 'T23:59:59.999Z');
        }
        // Xử lý search (tìm theo product_name, order_id, user_fullname)
        let searchFilter = '';
        if (search) {
            searchFilter = ` AND (
                LOWER(cp.name) LIKE :searchLike
                OR CAST(r.order_id AS TEXT) LIKE :searchLike
                OR LOWER(r.user_fullname) LIKE :searchLike
            )`;
            replacements.searchLike = `%${search.toLowerCase()}%`;
        }
        // Xử lý filter rating trong SQL
        let ratingSQL = '';
        if (ratingFilter.length > 0) {
            ratingSQL = ` AND r.rating IN (:ratingFilter)`;
            replacements.ratingFilter = ratingFilter;
        }
        // Xử lý filter seller_id
        let sellerSQL = '';
        if (seller_id) {
            sellerSQL = ' AND r.seller_id = :sellerId';
            replacements.sellerId = seller_id;
        }
        const reviews = await sequelize.query(`
            SELECT 
                r.id AS review_id,
                r.user_id,
                r.seller_id,
                r.order_id,
                r.user_fullname,
                r.product_id,
                r.comment,
                r.rating,
                r.url_images_related AS review_url_images_related,
                r.is_edited,
                r."createdAt" AS review_created_at,
                r."updatedAt" AS review_updated_at,

                rr.id AS response_id,
                rr.review_id as response_review_id,
                rr.response_comment,
                rr.seller_name,
                rr.url_image_related AS response_url_image_related,
                rr."createdAt" AS response_created_at,
                rr."updatedAt" AS response_updated_at,

                cp.name AS product_name,
                cp.url_image AS product_image
            FROM reviews r
            LEFT JOIN response_reviews rr ON r.id = rr.review_id
            LEFT JOIN products p ON r.product_id = p.id
            LEFT JOIN catalog_products cp ON p.catalog_product_id = cp.id
            WHERE 1=1
            ${sellerSQL}
            ${ratingSQL}
            ${dateFilter}
            ${searchFilter}
            ORDER BY r."updatedAt" DESC
        `, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });
        const reviewsWithResponse = [];
        const reviewsWithoutResponse = [];
        for (const row of reviews) {
            const reviewData = {
                id: row.review_id,
                user_id: row.user_id,
                seller_id: row.seller_id,
                order_id: row.order_id,
                user_fullname: row.user_fullname,
                product_id: row.product_id,
                product_name: row.product_name,
                product_image: row.product_image,
                comment: row.comment,
                rating: row.rating,
                url_images_related: row.review_url_images_related || [],
                is_edited: row.is_edited,
                createdAt: row.review_created_at,
                updatedAt: row.review_updated_at,
                response_review: null
            };
            if (row.response_id) {
                reviewData.response_review = {
                    id: row.response_id,
                    review_id: row.response_review_id,
                    seller_name: row.seller_name,
                    response_comment: row.response_comment,
                    url_image_related: row.response_url_image_related,
                    createdAt: row.response_created_at,
                    updatedAt: row.response_updated_at,
                };
                reviewsWithResponse.push(reviewData);
            } else {
                reviewsWithoutResponse.push(reviewData);
            }
        }
        return res.status(200).json({
            code: 0,
            message: 'Lấy thống kê và danh sách đánh giá thành công',
            stats: {
                totalReviews,
                goodReviewRatio,
                reviewRate,
                badReviewsNoResponse,
                todayReviews,
                starCount
            },
            data: {
                reviewsWithResponse,
                reviewsWithoutResponse
            }
        });
    } catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy thống kê và danh sách đánh giá thất bại', error: error.message });
    }
}