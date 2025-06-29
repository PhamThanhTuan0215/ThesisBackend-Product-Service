const Promotion = require('../database/models/Promotion')
const PromotionProduct = require('../database/models/PromotionProduct')
const Product = require('../database/models/Product')
const CatalogProduct = require('../database/models/CatalogProduct')
const CatalogPromotion = require('../database/models/CatalogPromotion')

const { formatPromotionLite, formatProductLite, formatProduct } = require('../ultis/formatData')

const { Op } = require('sequelize');

module.exports.getAllPromotions = async (req, res) => {
    try {
        const { seller_id, status, page, limit } = req.query;

        // Phân trang nếu có
        let offset = 0;
        let limitNumber = null;
        if (limit && !isNaN(limit)) {
            limitNumber = parseInt(limit);

            if (page && !isNaN(page)) {
                const pageNumber = parseInt(page);
                offset = (pageNumber - 1) * limitNumber;
            }
        }

        const condition = {};
        if (seller_id) condition.seller_id = seller_id;
        if (status) condition.status = status;

        // Lấy danh sách promotions
        const promotions = await Promotion.findAll({
            where: condition,
            limit: limitNumber,
            offset,
            include: [
                {
                    model: CatalogPromotion,
                    required: true
                },
                {
                    model: PromotionProduct,
                    required: false,
                    attributes: ['product_id']
                }
            ]
        });

        // Check và update status nếu end_date đã qua
        const now = new Date();
        for (const promo of promotions) {
            if (promo.end_date && promo.end_date < now && promo.status !== 'expired') {
                // Update trong DB
                promo.status = 'inactive';
                await promo.save();
            }
        }

        const formattedPromotions = promotions.map(formatPromotionLite);

        const total = await Promotion.count({ where: condition });

        return res.status(200).json({
            code: 0,
            message: 'Lấy danh sách chương trình khuyến mãi thành công',
            total,
            data: formattedPromotions
        });

    } catch (error) {
        return res.status(500).json({
            code: 2,
            message: 'Lấy danh sách chương trình khuyến mãi thất bại',
            error: error.message
        });
    }
};

module.exports.getAvailablePromotionsWithProducts = async (req, res) => {
    try {
        const { limit } = req.query;

        // lấy danh sách chương trình khuyến mãi có status là active, có ngày bắt đầu trước ngày hiện tại và có ngày kết thúc sau ngày hiện tại
        const promotions = await Promotion.findAll({
            where: { status: 'active', start_date: { [Op.lt]: new Date() }, end_date: { [Op.gt]: new Date() } },
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            include: [
                {
                    model: CatalogPromotion,
                    required: true
                },
                {
                    model: PromotionProduct,
                    required: false,
                    attributes: ['product_id']
                }
            ]
        });

        const formattedPromotions = promotions.map(formatPromotionLite);

        // dựa trên các chương trình khuyến mãi, lấy danh sách sản phẩm tương ứng vào lưu thêm vào trường items của formattedPromotions
        const product_ids = formattedPromotions.flatMap((promotion) => promotion.product_ids);

        attributes = { exclude: ['import_price', 'import_date', 'url_import_invoice', 'return_policy', 'approved', 'active_status', 'url_registration_license'] };
        const productConditions = { approval_status: 'approved', active_status: 'active' };
        const catalogProductConditions = { active_status: 'active' };

        // Lấy sản phẩm cho từng chương trình riêng biệt
        const productsPerPromotion = await Promise.all(formattedPromotions.map(async (promotion) => {
            const products = await Product.findAll({
                where: { ...productConditions, id: { [Op.in]: promotion.product_ids } },
                limit: limit || 5,
                attributes,
                include: [
                    {
                        model: CatalogProduct,
                        required: true,
                        where: catalogProductConditions
                    },
                    {
                        model: Promotion,
                        through: { attributes: ['custom_start_date', 'custom_end_date', 'custom_value'] },
                        include: [
                            {
                                model: CatalogPromotion,
                                required: true
                            }
                        ],
                        required: false
                    }
                ]
            });
            return {
                promotion_id: promotion.id,
                promotion_name: promotion.name,
                products: products.map(formatProduct)
            };
        }));

        // gom nhóm các promotion có cùng name, lấy ra catalog_promotion_id, start_date nhỏ nhất, end_date lớn nhất
        const groupedPromotions = formattedPromotions.reduce((acc, promotion) => {
            if (!acc[promotion.name]) {
                acc[promotion.name] = {
                    name: promotion.name,
                    catalog_promotion_id: promotion.catalog_promotion_id,
                    earliest_start_date: promotion.start_date,
                    latest_end_date: promotion.end_date,
                    product_ids: [...promotion.product_ids]
                };
            } else {
                // Cập nhật start_date và end_date
                acc[promotion.name].earliest_start_date = new Date(acc[promotion.name].earliest_start_date) < new Date(promotion.start_date)
                    ? acc[promotion.name].earliest_start_date
                    : promotion.start_date;
                acc[promotion.name].latest_end_date = new Date(acc[promotion.name].latest_end_date) > new Date(promotion.end_date)
                    ? acc[promotion.name].latest_end_date
                    : promotion.end_date;
                // Thêm product_ids mới
                acc[promotion.name].product_ids = [...new Set([...acc[promotion.name].product_ids, ...promotion.product_ids])];
            }
            return acc;
        }, {});

        // Chuyển đổi từ object sang array
        const mergedPromotions = Object.values(groupedPromotions);

        // Tính tổng số sản phẩm cho mỗi chương trình khuyến mãi đã gom nhóm
        const promotionTotals = await Promise.all(mergedPromotions.map(async (promotion) => {
            const total = await Product.count({
                where: {
                    id: { [Op.in]: promotion.product_ids },
                    approval_status: 'approved',
                    active_status: 'active'
                },
                include: [
                    {
                        model: CatalogProduct,
                        required: true,
                        where: catalogProductConditions
                    }
                ]
            });
            return { promotion_name: promotion.name, total };
        }));

        // Gom nhóm sản phẩm theo tên promotion
        const productsGroupedByName = productsPerPromotion.reduce((acc, curr) => {
            if (!acc[curr.promotion_name]) {
                acc[curr.promotion_name] = curr.products;
            } else {
                // Thêm sản phẩm mới, loại bỏ trùng lặp dựa trên id
                const existingIds = new Set(acc[curr.promotion_name].map(p => p.id));
                const newProducts = curr.products.filter(p => !existingIds.has(p.id));
                acc[curr.promotion_name] = [...acc[curr.promotion_name], ...newProducts].slice(0, limit || 5);
            }
            return acc;
        }, {});

        // Kết hợp thông tin vào mergedPromotions
        mergedPromotions.forEach(promotion => {
            promotion.products = productsGroupedByName[promotion.name] || [];
            promotion.total_products = promotionTotals.find(pt => pt.promotion_name === promotion.name)?.total || 0;
        });

        return res.status(200).json({ code: 0, message: 'Lấy danh sách chương trình khuyến mãi khả dụng cho khách hàng thành công', data: mergedPromotions });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh sách chương trình khuyến mãi khả dụng cho khách hàng thất bại', error: error.message });
    }
}

module.exports.getActiveProductsInPromotion = async (req, res) => {
    try {
        const { promotion_name, limit, page } = req.query;

        const errors = [];

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        // Tìm tất cả promotion có cùng tên
        const promotions = await Promotion.findAll({
            where: { status: 'active', start_date: { [Op.lt]: new Date() }, end_date: { [Op.gt]: new Date() } },
            include: [
                {
                    model: CatalogPromotion,
                    required: true,
                    where: { name: promotion_name }
                }
            ]
        });

        if (!promotions || promotions.length === 0) {
            return res.status(404).json({ code: 1, message: 'Không tìm thấy chương trình khuyến mãi' });
        }

        // phân trang nếu có
        let offset = 0
        let limitNumber = null
        if (limit && !isNaN(limit)) {
            limitNumber = parseInt(limit);

            if (page && !isNaN(page)) {
                const pageNumber = parseInt(page);
                offset = (pageNumber - 1) * limitNumber;
            }
        }

        // lấy danh sách ids của promotion_products từ tất cả promotion có cùng tên
        const promotionIds = promotions.map(promotion => promotion.id);
        const promotionProducts = await PromotionProduct.findAll({
            where: { promotion_id: { [Op.in]: promotionIds } },
            attributes: ['product_id']
        });
        const product_ids = [...new Set(promotionProducts.map(pp => pp.product_id))]; // Loại bỏ các product_id trùng lặp

        attributes = { exclude: ['import_price', 'import_date', 'url_import_invoice', 'return_policy', 'approved', 'active_status', 'url_registration_license'] };
        const productConditions = { approval_status: 'approved', active_status: 'active' };
        const catalogProductConditions = { active_status: 'active' };

        // lấy danh sách sản phẩm
        const products = await Product.findAll({
            where: { ...productConditions, id: { [Op.in]: product_ids } },
            limit: limitNumber,
            offset,
            attributes,
            include: [
                {
                    model: CatalogProduct,
                    required: true,
                    where: catalogProductConditions
                },
                {
                    model: Promotion,
                    through: { attributes: ['custom_start_date', 'custom_end_date', 'custom_value'] },
                    include: [
                        {
                            model: CatalogPromotion,
                            required: true
                        }
                    ],
                    required: false
                }
            ]
        });

        const formattedProducts = products.map(formatProduct);

        const total = await Product.count({
            where: { ...productConditions, id: { [Op.in]: product_ids } },
            include: [
                {
                    model: CatalogProduct,
                    required: true,
                    where: catalogProductConditions
                }
            ]
        });

        return res.status(200).json({
            code: 0,
            message: 'Lấy danh sách sản phẩm đang được bán trong chương trình khuyến mãi thành công',
            total,
            promotion_name,
            data: formattedProducts
        });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh sách sản phẩm đang được bán trong chương trình khuyến mãi thất bại', error: error.message });
    }
}

module.exports.getPromotionById = async (req, res) => {
    try {
        const { id } = req.params;

        const promotion = await Promotion.findByPk(id, {
            include: [
                {
                    model: CatalogPromotion,
                    required: true
                }
            ]
        });

        if (!promotion) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi không tồn tại' });
        }

        const formattedPromotion = formatPromotionLite(promotion);

        return res.status(200).json({ code: 0, message: 'Lấy thông tin chương trình khuyến mãi thành công', data: formattedPromotion });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy thông tin chương trình khuyến mãi thất bại', error: error.message });
    }
}

module.exports.createPromotion = async (req, res) => {
    try {
        const { catalog_promotion_id, type, value, start_date, end_date, seller_id } = req.body;
        const errors = [];

        if (!seller_id || seller_id === '') errors.push('seller_id cần cung cấp');
        if (!catalog_promotion_id || catalog_promotion_id === '') errors.push('catalog_promotion_id cần cung cấp');
        if (!type || type === '') errors.push('type cần cung cấp');
        if (!value || value <= 0) errors.push('value cần cung cấp');
        if (isNaN(Date.parse(start_date))) {
            errors.push('start_date phải là ngày hợp lệ');
        }
        if (isNaN(Date.parse(end_date))) {
            errors.push('end_date phải là ngày hợp lệ');
        }

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const catalogPromotion = await CatalogPromotion.findByPk(catalog_promotion_id);

        if (!catalogPromotion) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi không tồn tại' });
        }

        const promotion = await Promotion.create({ catalog_promotion_id, type, value, start_date, end_date, seller_id });

        const formattedPromotion = {
            ...promotion.toJSON(),
            name: catalogPromotion.name
        }

        return res.status(201).json({ code: 0, message: 'Tạo chương trình khuyến mãi thành công', data: formattedPromotion });
    }
    catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            const fields = Object.keys(error.fields || {});

            // Trường hợp 1
            if (fields.includes('catalog_promotion_id') && fields.includes('seller_id')) {
                return res.status(400).json({ code: 2, message: 'Nhà bán đã tạo chương trình khuyến mãi này', error: error.message });
            }

            // Mặc định nếu không khớp
            return res.status(400).json({ code: 2, message: 'Dữ liệu đã tồn tại, vui lòng kiểm tra lại', error: error.message });
        }

        return res.status(500).json({ code: 2, message: 'Tạo chương trình khuyến mãi thất bại', error: error.message });
    }
}

module.exports.updatePromotion = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, value, start_date, end_date, status } = req.body;

        const errors = [];

        if (!type || type === '') errors.push('type cần cấp');
        if (!value || value <= 0) errors.push('value cần cấp');
        if (isNaN(Date.parse(start_date))) {
            errors.push('start_date phải là ngày hợp lệ');
        }
        if (isNaN(Date.parse(end_date))) {
            errors.push('end_date phải là ngày hợp lệ');
        }

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const [affectedRows, updatedRows] = await Promotion.update(
            { type, value, start_date, end_date, status },
            { where: { id }, returning: true }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi không tồn tại' });
        }

        const promotion = updatedRows[0];

        return res.status(200).json({ code: 0, message: 'Cập nhật chương trình khuyến mãi thành công', data: promotion });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Cập nhật chương trình khuyến mãi thất bại', error: error.message });
    }
}

module.exports.deletePromotion = async (req, res) => {
    try {
        const { id } = req.params;

        const promotion = await Promotion.findByPk(id);

        if (!promotion) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi không tồn tại' });
        }

        await promotion.destroy();

        return res.status(200).json({ code: 0, message: 'Xóa chương trình khuyến mãi thành công', data: promotion });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa chương trình khuyến mãi thất bại', error: error.message });
    }
}

module.exports.updatePromotionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const [affectedRows, updatedRows] = await Promotion.update(
            { status },
            { where: { id }, returning: true }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi không tồn tại' });
        }

        const promotion = updatedRows[0];

        return res.status(200).json({ code: 0, message: 'Cập nhật trạng thái chương trình khuyến mãi thành công', data: promotion });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Cập nhật trạng thái chương trình khuyến mãi thất bại', error: error.message });
    }
}

module.exports.applyProductsToPromotion = async (req, res) => {
    try {
        const { id } = req.params;
        const { product_ids } = req.body;

        const errors = [];

        if (!product_ids || product_ids.length === 0) errors.push('product_ids cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const promotion = await Promotion.findByPk(id);

        if (!promotion) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi không tồn tại' });
        }

        const promises = product_ids.map(async (product_id) => {
            const product = await Product.findByPk(product_id, { attributes: ['id'] });
            if (product) {
                // tạo nếu chưa có
                const promotionProduct = await PromotionProduct.findOne({ where: { promotion_id: id, product_id } });
                if (!promotionProduct) {
                    await PromotionProduct.create({ promotion_id: id, product_id });
                }
            }
        });
        await Promise.all(promises);

        return res.status(200).json({ code: 0, message: 'Áp dụng sản phẩm vào chương trình khuyến mãi thành công', data: { promotion, product_ids } });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Áp dụng sản phẩm vào chương trình khuyến mãi thất bại', error: error.message });
    }
}

module.exports.removeProductFromPromotion = async (req, res) => {
    try {
        const { id } = req.params;
        const { product_ids } = req.body;

        const errors = [];

        if (!product_ids || product_ids.length === 0) errors.push('product_ids cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const promotion = await Promotion.findByPk(id);

        if (!promotion) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi không tồn tại' });
        }

        await PromotionProduct.destroy({ where: { promotion_id: id, product_id: { [Op.in]: product_ids } } });

        return res.status(200).json({ code: 0, message: 'Xóa sản phẩm khỏi chương trình khuyến mãi thành công', data: { promotion, product_ids } });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa sản phẩm khỏi chương trình khuyến mãi thất bại', error: error.message });
    }
}

module.exports.getProductsInPromotion = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit, page } = req.query;

        const errors = [];

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const promotion = await Promotion.findByPk(id);

        if (!promotion) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi không tồn tại' });
        }

        // phân trang nếu có

        let offset = 0
        let limitNumber = null
        if (limit && !isNaN(limit)) {
            limitNumber = parseInt(limit);

            if (page && !isNaN(page)) {
                const pageNumber = parseInt(page);
                offset = (pageNumber - 1) * limitNumber;
            }
        }

        // lấy danh sách ids của promotion_products
        const promotionProducts = await PromotionProduct.findAll({ where: { promotion_id: id }, attributes: ['product_id'] });
        const product_ids = promotionProducts.map((promotionProduct) => promotionProduct.product_id);

        // lấy danh sách sản phẩm
        const products = await Product.findAll({
            where: { id: { [Op.in]: product_ids } },
            limit: limitNumber,
            offset,
            attributes: ['id', 'stock', 'retail_price', 'actual_price', 'promotion_name', 'promotion_value_percent', 'promotion_start_date', 'promotion_end_date'],
            include: [
                {
                    model: CatalogProduct,
                    required: true, // inner join
                    attributes: ['name', 'url_image']
                },
                {
                    model: Promotion,
                    through: { attributes: ['custom_start_date', 'custom_end_date', 'custom_value'] }, // Lấy các trường từ bảng PromotionProduct
                    include: [
                        {
                            model: CatalogPromotion,
                            required: true
                        }
                    ],
                    required: false
                }
            ]
        });

        const formattedProducts = products.map(formatProductLite);

        const total = await Product.count({ where: { id: { [Op.in]: product_ids } } });

        return res.status(200).json({ code: 0, message: 'Lấy danh sách sản phẩm đã áp dụng khuyến mãi thành công', total, data: formattedProducts });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh sách sản phẩm đã áp dụng khuyến mãi thất bại', error: error.message });
    }
}

module.exports.customProductInPromotion = async (req, res) => {
    try {
        const { id } = req.params;
        const { product_ids, custom_value, custom_start_date, custom_end_date } = req.body;

        const errors = [];

        if (!product_ids || product_ids.length === 0) errors.push('product_ids cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const promotion = await Promotion.findByPk(id);

        if (!promotion) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi không tồn tại' });
        }

        // dùng Op.in để cập nhật 1 lần
        const [affectedRows, updatedRows] = await PromotionProduct.update({ custom_value, custom_start_date, custom_end_date }, { where: { promotion_id: id, product_id: { [Op.in]: product_ids } }, returning: true });

        if (affectedRows === 0) {
            return res.status(404).json({ code: 1, message: 'Không tìm thấy sản phẩm trong chương trình khuyến mãi' });
        }

        const promotionProducts = updatedRows;

        return res.status(200).json({ code: 0, message: 'Tùy chỉnh khuyến mãi cho sản phẩm thành công', data: { promotion, promotionProducts } });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Tùy chỉnh khuyến mãi cho sản phẩm thất bại', error: error.message });
    }
}

module.exports.getProductsNotInAnyPromotion = async (req, res) => {
    try {
        const { seller_id } = req.query;
        if (!seller_id) {
            return res.status(400).json({ code: 1, message: 'Thiếu seller_id' });
        }

        // Lấy tất cả product_id đã tham gia bất kỳ promotion nào và promotion đó có status là active
        const promotionProducts = await PromotionProduct.findAll({ attributes: ['product_id'], raw: true, include: [{ model: Promotion, where: { status: 'active' } }] });
        const productIdsInPromotion = promotionProducts.map(pp => pp.product_id);

        // Lấy tất cả sản phẩm của seller chưa tham gia promotion nào
        const products = await Product.findAll({
            where: {
                seller_id,
                id: { [Op.notIn]: productIdsInPromotion }
            },
            attributes: ['id', 'stock', 'retail_price', 'actual_price', 'promotion_name', 'promotion_value_percent', 'promotion_start_date', 'promotion_end_date'],
            include: [
                {
                    model: CatalogProduct,
                    required: true,
                    attributes: ['name']
                }
            ]
        });

        const formattedProducts = products.map(formatProduct);
        return res.status(200).json({ code: 0, message: 'Lấy danh sách sản phẩm chưa tham gia khuyến mãi thành công', total: formattedProducts.length, data: formattedProducts });
    } catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh sách sản phẩm chưa tham gia khuyến mãi thất bại', error: error.message });
    }
}