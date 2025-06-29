const CatalogPromotion = require('../database/models/CatalogPromotion')

const { Op } = require('sequelize');

module.exports.getAllCatalogPromotions = async (req, res) => {
    try {
        const { name, status, page, limit } = req.query;

        // Áp dụng điều kiện lọc
        const conditions = {};

        if (name) {
            // lọc sản phẩm có name chứa chuỗi name và không phân biệt hoa thường
            conditions.name = {
                [Op.iLike]: `%${name}%`,
            };
        }

        if (status) {
            conditions.status = status;
        }

        // Xử lý phân trang
        let offset = 0
        let limitNumber = null
        if (limit && !isNaN(limit)) {
            limitNumber = parseInt(limit);

            if (page && !isNaN(page)) {
                const pageNumber = parseInt(page);
                offset = (pageNumber - 1) * limitNumber;
            }
        }

        const catalogPromotions = await CatalogPromotion.findAll({
            where: conditions,
            limit: limitNumber,
            offset
        });

        const total = await CatalogPromotion.count({ where: conditions });

        return res.status(200).json({ code: 0, message: 'Lấy danh mục chương trình khuyến mãi có sẵn thành công', total, data: catalogPromotions });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh mục chương trình khuyến mãi có sẵn thất bại', error: error.message });
    }
}

module.exports.getCatalogPromotionById = async (req, res) => {
    try {

        const { id } = req.params;

        const catalogPromotion = await CatalogPromotion.findByPk(id);

        if (!catalogPromotion) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi có sẵn không tồn tại' });
        }

        return res.status(200).json({ code: 0, message: 'Lấy chi tiết chương trình khuyến mãi có sẵn thành công', data: catalogPromotion });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy chi tiết chương trình khuyến mãi có sẵn thất bại', error: error.message });
    }
}

module.exports.addCatalogPromotion = async (req, res) => {

    try {
        const {
            name,
        } = req.body;

        const errors = [];

        if (!name || name === '') errors.push('name cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const catalogPromotion = await CatalogPromotion.create({ name });

        return res.status(201).json({ code: 0, message: 'Thêm chương trình khuyến mãi có sẵn thành công', data: catalogPromotion });


    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Thêm chương trình khuyến mãi có sẵn thất bại', error: error.message });
    }
}

module.exports.deleteCatalogPromotion = async (req, res) => {
    try {
        const { id } = req.params;

        const catalogPromotion = await CatalogPromotion.findByPk(id);

        if (!catalogPromotion) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi có sẵn không tồn tại' });
        }

        await catalogPromotion.destroy();

        return res.status(200).json({ code: 0, message: 'Xóa chương trình khuyến mãi có sẵn thành công', data: catalogPromotion });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa chương trình khuyến mãi có sẵn thất bại', error: error.message });
    }
}

module.exports.updateCatalogPromotion = async (req, res) => {

    try {
        const { id } = req.params;

        const {
            name,
        } = req.body;

        const errors = [];

        if (!name || name === '') errors.push('name cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const catalogPromotion = await CatalogPromotion.findByPk(id);

        if (!catalogPromotion) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi có sẵn không tồn tại' });
        }

        Object.assign(catalogPromotion, { name });

        await catalogPromotion.save();

        return res.status(200).json({ code: 0, message: 'Cập nhật chương trình khuyến mãi có sẵn thành công', data: catalogPromotion });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Cập nhật chương trình khuyến mãi có sẵn thất bại', error: error.message });
    }
}

module.exports.setActiveCatalogPromotion = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body

        const errors = [];

        if (!status || status === '') errors.push('status cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const [affectedRows, updatedRows] = await CatalogPromotion.update(
            { status },
            { where: { id }, returning: true }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ code: 1, message: 'Chương trình khuyến mãi có sẵn không tồn tại' });
        }

        return res.status(200).json({ code: 0, message: 'Cập nhật trạng thái kích hoạt của chương trình khuyến mãi có sẵn thành công', data: updatedRows[0] });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Cập nhật trạng thái kích hoạt của chương trình khuyến mãi có sẵn thất bại', error: error.message });
    }
}