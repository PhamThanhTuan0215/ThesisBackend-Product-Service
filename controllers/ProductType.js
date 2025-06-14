const ProductType = require('../database/models/ProductType')
const DetailAttribute = require('../database/models/DetailAttribute')
const Category = require('../database/models/Category')
const sequelize = require('../database/sequelize');

module.exports.getAllProductTypes = async (req, res) => {
    try {
        const productTypes = await ProductType.findAll();

        return res.status(200).json({ code: 0, message: 'Lấy tất cả loại sản phẩm thành công', data: productTypes });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy tất cả loại sản phẩm thất bại', error: error.message });
    }
}

module.exports.addProductType = async (req, res) => {

    try {
        const { product_type_name } = req.body;

        const errors = [];

        if (!product_type_name || product_type_name === '') errors.push('product_type_name cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const productType = await ProductType.create({
            product_type_name
        });

        return res.status(201).json({ code: 0, message: 'Thêm loại sản phẩm thành công', data: productType });
    }
    catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' && error.errors[0].message) {
            return res.status(400).json({ code: 2, message: 'Thêm loại sản phẩm thất bại', error: error.errors[0].message });
        }

        return res.status(500).json({ code: 2, message: 'Thêm loại sản phẩm thất bại', error: error.message });
    }
}

module.exports.deleteProductType = async (req, res) => {

    try {
        const { id } = req.params;

        const productType = await ProductType.findByPk(id);

        if (!productType) {
            return res.status(404).json({ code: 1, message: 'Loại sản phẩm không tồn tại' });
        }

        await productType.destroy();

        return res.status(200).json({ code: 0, message: 'Xóa loại sản phẩm thành công', data: productType });

    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa loại sản phẩm thất bại', error: error.message });
    }
}

module.exports.updateProductType = async (req, res) => {
    try {
        const { id } = req.params;

        const { product_type_name } = req.body;

        const errors = [];

        if (!product_type_name || product_type_name === '') errors.push('product_type_name cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const [affectedRows, updatedRows] = await ProductType.update(
            { product_type_name },
            { where: { id }, returning: true }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ code: 1, message: 'Loại sản phẩm không tồn tại hoặc không bị thay đổi' });
        }

        return res.status(200).json({ code: 0, message: 'Cập nhật loại sản phẩm thành công', data: updatedRows[0] });

    }
    catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' && error.errors[0].message) {
            return res.status(400).json({ code: 2, message: 'Cập nhật loại sản phẩm thất bại', error: error.errors[0].message });
        }

        return res.status(500).json({ code: 2, message: 'Cập nhật loại sản phẩm thất bại', error: error.message });
    }
}

module.exports.getDetailAttributes = async (req, res) => {
    try {
        const { product_type_id } = req.params;

        const productType = await ProductType.findByPk(product_type_id);

        if (!productType) {
            return res.status(404).json({ code: 1, message: 'Loại sản phẩm không tồn tại' });
        }

        const detailAttributes = await DetailAttribute.findAll({
            where: { product_type_id }
        });

        return res.status(200).json({ code: 0, message: 'Lấy tất cả thuộc tính chi tiết thành công', data: detailAttributes });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy tất cả thuộc tính chi tiết thất bại', error: error.message });
    }
}

module.exports.addDetailAttributes = async (req, res) => {

    try {
        const { product_type_id } = req.params;
        const { detail_attributes } = req.body;

        const errors = [];

        if (!detail_attributes || !(Array.isArray(detail_attributes) && detail_attributes.length > 0)) {
            errors.push('detail_attributes cần cung cấp');
        }

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const productType = await ProductType.findByPk(product_type_id);
        if (!productType) {
            return res.status(404).json({ code: 1, message: 'Loại sản phẩm không tồn tại' });
        }

        const detailAttributesData = detail_attributes.map(attribute_name => ({
            product_type_id,
            attribute_name
        }));

        const detailAttributesCreated = await DetailAttribute.bulkCreate(detailAttributesData);

        return res.status(201).json({ code: 0, message: 'Thêm các thuộc tính chi tiết thành công', data: detailAttributesCreated });
    }
    catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' && error.errors[0].message) {
            return res.status(400).json({ code: 2, message: 'Thêm các thuộc tính chi tiết thất bại', error: error.errors[0].message });
        }

        return res.status(500).json({ code: 2, message: 'Thêm các thuộc tính chi tiết thất bại', error: error.message });
    }
}

module.exports.deleteDetailAttribute = async (req, res) => {

    try {
        const { id } = req.params;

        const detailAttribute = await DetailAttribute.findByPk(id);

        if (!detailAttribute) {
            return res.status(404).json({ code: 1, message: 'Thuộc tính chi tiết không tồn tại' });
        }

        await detailAttribute.destroy();

        return res.status(200).json({ code: 0, message: 'Xóa thuộc tính chi tiết thành công', data: detailAttribute });

    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa thuộc tính chi tiết thất bại', error: error.message });
    }
}

module.exports.updateDetailAttribute = async (req, res) => {
    try {
        const { id } = req.params;

        const { attribute_name } = req.body;

        const errors = [];

        if (!attribute_name || attribute_name === '') errors.push('attribute_name cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const [affectedRows, updatedRows] = await DetailAttribute.update(
            { attribute_name },
            { where: { id }, returning: true }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ code: 1, message: 'Thuộc tính chi tiết không tồn tại hoặc không bị thay đổi' });
        }

        return res.status(200).json({ code: 0, message: 'Cập nhật thuộc tính chi tiết thành công', data: updatedRows[0] });

    }
    catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' && error.errors[0].message) {
            return res.status(400).json({ code: 2, message: 'Cập nhật thuộc tính chi tiết thất bại', error: error.errors[0].message });
        }

        return res.status(500).json({ code: 2, message: 'Cập nhật thuộc tính chi tiết thất bại', error: error.message });
    }
}

module.exports.getCategories = async (req, res) => {
    try {
        const { product_type_id } = req.params;

        const productType = await ProductType.findByPk(product_type_id);
        if (!productType) {
            return res.status(404).json({ code: 1, message: 'Loại sản phẩm không tồn tại' });
        }

        const categories = await Category.findAll({
            where: { product_type_id }
        });

        return res.status(200).json({ code: 0, message: 'Lấy tất cả hạng mục thành công', data: categories });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy tất cả hạng mục thất bại', error: error.message });
    }
}

module.exports.getDistinctCategoryNames = async (req, res) => {
    try {

        const categories = await Category.findAll({
            attributes: ['category_name'],
            group: ['category_name'],
        });

        const categoryNameList = categories.map(category => category.category_name);

        return res.status(200).json({ code: 0, message: 'Lấy tất cả tên hạng mục thành công', data: categoryNameList });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy tất cả tên hạng mục thất bại', error: error.message });
    }
}

module.exports.addCategories = async (req, res) => {

    try {

        const { product_type_id } = req.params;
        const { categories } = req.body;

        const errors = [];

        if (!categories || !(Array.isArray(categories) && categories.length > 0)) {
            errors.push('categories cần cung cấp');
        }

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const productType = await ProductType.findByPk(product_type_id);
        if (!productType) {
            return res.status(404).json({ code: 1, message: 'Loại sản phẩm không tồn tại' });
        }

        const categoriesData = categories.map(category_name => ({
            product_type_id: productType.id,
            category_name
        }));

        const categoriesCreated = await Category.bulkCreate(categoriesData);

        return res.status(201).json({ code: 0, message: 'Thêm các hạng mục thành công', data: categoriesCreated });
    }
    catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' && error.errors[0].message) {
            return res.status(400).json({ code: 2, message: 'Thêm các hạng mục thất bại', error: error.errors[0].message });
        }

        return res.status(500).json({ code: 2, message: 'Thêm các hạng mục thất bại', error: error.message });
    }
}

module.exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findByPk(id);

        if (!category) {
            return res.status(404).json({ code: 1, message: 'Hạng mục không tồn tại' });
        }

        await category.destroy();

        return res.status(200).json({ code: 0, message: 'Xóa hạng mục thành công', data: category });

    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa hạng mục thất bại', error: error.message });
    }
}

module.exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const { category_name } = req.body;

        const errors = [];

        if (!category_name || category_name === '') errors.push('category_name cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const [affectedRows, updatedRows] = await Category.update(
            { category_name },
            { where: { id }, returning: true }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ code: 1, message: 'Hạng mục không tồn tại hoặc không bị thay đổi' });
        }

        return res.status(200).json({ code: 0, message: 'Cập nhật hạng mục thành công', data: updatedRows[0] });

    }
    catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' && error.errors[0].message) {
            return res.status(400).json({ code: 2, message: 'Cập nhật hạng mục thất bại', error: error.errors[0].message });
        }

        return res.status(500).json({ code: 2, message: 'Cập nhật hạng mục thất bại', error: error.message });
    }
}

module.exports.getFullListProductTypeWithCategories = async (req, res) => {
    try {
        const sql = `
            SELECT 
              pt.id AS product_type_id,
              pt.product_type_name AS product_type_name,
              c.id AS category_id,
              c.category_name AS category_name
            FROM 
              product_types pt
            LEFT JOIN 
              categories c ON pt.id = c.product_type_id
        `;

        const results = await sequelize.query(sql, {
            type: sequelize.QueryTypes.SELECT
        });

        const grouped = results.reduce((acc, row) => {
            const ptId = row.product_type_id;
            if (!acc[ptId]) {
                acc[ptId] = {
                    product_type_id: ptId,
                    product_type_name: row.product_type_name,
                    categories: []
                };
            }
            if (row.category_id) {
                acc[ptId].categories.push({
                    category_id: row.category_id,
                    category_name: row.category_name
                });
            }
            return acc;
        }, {});

        const productTypes = Object.values(grouped);

        return res.status(200).json({ code: 0, message: 'Lấy danh sách tất cả các product type và các category thành công', data: productTypes });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh sách tất cả các product type và các category thất bại', error: error.message });
    }
}