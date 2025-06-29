const CatalogProduct = require('../database/models/CatalogProduct')
const ProductType = require('../database/models/ProductType')
const Category = require('../database/models/Category')

const { uploadFiles, deleteFile } = require('../ultis/manageFilesOnCloudinary')

// const { Op } = require('sequelize');
const { Op, where, fn, literal } = require('sequelize');

// Cấu hình multer để lưu trữ các tệp vào bộ nhớ tạm
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const folderPathUpload = 'ecommerce-pharmacy/products'

// Middleware upload cho một ảnh duy nhất
module.exports.uploadSingle = upload.single('image');

// Middleware upload cho nhiều ảnh
module.exports.uploadMultiple = upload.array('images', 10); // tối đa 10

module.exports.uploadCustom = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'registration_license', maxCount: 1 }
]);

module.exports.getAllCatalogProducts = async (req, res) => {
    try {
        const { name, brand, active_status, product_type_name, category_name, page, limit } = req.query;

        // Áp dụng điều kiện lọc
        const conditions = {};

        if (name) {
            // lọc sản phẩm có name chứa chuỗi name và không phân biệt hoa thường, hoặc có product_details?.["Tên hiển thị"] chứa chuỗi name và không phân biệt hoa thường, 2 điều này chỉ cần thỏa mãn 1 trong 2
            conditions[Op.or] = [
                {
                    name: {
                        [Op.iLike]: `%${name}%`,
                    },
                },
                where(
                    fn('LOWER', literal(`product_details->>'Tên hiển thị'`)),
                    {
                        [Op.like]: `%${name.toLowerCase()}%`,
                    }
                )
            ];
        }
        if (brand) {
            conditions.brand = brand;
        }
        if (active_status) {
            conditions.active_status = active_status;
        }
        if (product_type_name) {
            // chuyển đổi product_type_name thành product_type_id

            const productType = await ProductType.findOne({
                where: { product_type_name: { [Op.iLike]: `${product_type_name}` } } // không phân biệt hoa thường nhưng phải chính xác chuỗi
            });

            if (productType) {
                conditions.product_type_id = productType.id;
            }
            else {
                return res.status(200).json({ code: 0, message: 'Lấy danh sách sản phẩm thành công', data: [] });
            }
        }
        if (category_name) {
            // chuyển đổi category_name thành thành các category_id (bởi vì category_name có thể trùng nhau nếu khác loại sản phẩm)

            const categories = await Category.findAll({
                where: { category_name: { [Op.iLike]: `${category_name}` } }, // không phân biệt hoa thường nhưng phải chính xác chuỗi
                attributes: ['id']
            });

            const categoryIds = categories.map(category => category.id);

            if (categoryIds.length > 0) {
                conditions.category_id = { [Op.in]: categoryIds };
            }
            else {
                return res.status(200).json({ code: 0, message: 'Lấy danh sách sản phẩm thành công', data: [] });
            }
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

        const catalogProducts = await CatalogProduct.findAll({
            where: conditions,
            limit: limitNumber,
            offset
        });

        const total = await CatalogProduct.count({ where: conditions });

        return res.status(200).json({ code: 0, message: 'Lấy danh sách sản phẩm được phép bán thành công', total, data: catalogProducts });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh sách sản phẩm được phép bán thất bại', error: error.message });
    }
}

module.exports.getCatalogProductById = async (req, res) => {
    try {

        const { id } = req.params;

        const catalogProduct = await CatalogProduct.findByPk(id);

        if (!catalogProduct) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm được phép bán không tồn tại' });
        }

        return res.status(200).json({ code: 0, message: 'Lấy chi tiết sản phẩm được phép bán thành công', data: catalogProduct });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy chi tiết sản phẩm được phép bán thất bại', error: error.message });
    }
}

module.exports.addCatalogProduct = async (req, res) => {

    let public_id_image = null
    let public_id_registration_license = null

    try {
        const {
            name,
            brand,
            product_type_id,
            category_id,
            product_details // gửi dạng json đã được chuyển sang string
        } = req.body;

        const errors = [];

        if (!name || name === '') errors.push('name cần cung cấp');
        if (!brand || brand === '') errors.push('brand cần cung cấp');
        if (!product_type_id || product_type_id <= 0) errors.push('product_type_id cần cung cấp');
        if (!category_id || category_id <= 0) errors.push('category_id cần cung cấp');
        if (!product_details) errors.push('product_details cần cung cấp');

        let image_file = null;
        let registration_license_file = null;

        if (req.files && req.files['image']) {
            image_file = req.files && req.files['image'] && req.files['image'][0];
        }
        if (req.files && req.files['registration_license']) {
            registration_license_file = req.files && req.files['registration_license'] && req.files['registration_license'][0];
        }

        if (!image_file) {
            errors.push('image file cần cung cấp');
        }
        if (!registration_license_file) {
            errors.push('registration_license file cần cung cấp');
        }

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const product_details_json = JSON.parse(product_details);

        const filesToUpload = [image_file, registration_license_file];

        const results = await uploadFiles(filesToUpload, folderPathUpload);

        const result_image_file = results[0];
        const result_registration_license_file = results[1];

        // url của ảnh đã được tải lên
        const url_image = result_image_file.secure_url;
        const url_registration_license = result_registration_license_file.secure_url;

        // Lưu public id để xóa các ảnh đã tải lên nếu có lỗi
        public_id_image = result_image_file.public_id;
        public_id_registration_license = result_registration_license_file.public_id;

        const catalogProduct = await CatalogProduct.create({
            name,
            brand,
            url_image,
            url_registration_license,
            product_type_id,
            category_id,
            product_details: product_details_json
        });

        return res.status(201).json({ code: 0, message: 'Thêm sản phẩm được phép bán thành công', data: catalogProduct });
    }
    catch (error) {
        if (public_id_image) {
            deleteFile(public_id_image);
        }
        if (public_id_registration_license) {
            deleteFile(public_id_registration_license);
        }

        if (error.name === 'SequelizeUniqueConstraintError' && error.errors[0].message) {
            return res.status(400).json({ code: 2, message: 'Thêm sản phẩm được phép bán thất bại', error: error.errors[0].message });
        }

        return res.status(500).json({ code: 2, message: 'Thêm sản phẩm được phép bán thất bại', error: error.message });
    }
}

module.exports.deleteCatalogProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const catalogProduct = await CatalogProduct.findByPk(id);

        if (!catalogProduct) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm được phép bán không tồn tại' });
        }

        let public_id_image = null
        let public_id_registration_license = null

        if (catalogProduct.url_image) {
            public_id_image = extractFolderFromURL(catalogProduct.url_image) + catalogProduct.url_image.split('/').pop().split('.')[0];
        }
        if (catalogProduct.url_registration_license) {
            public_id_registration_license = extractFolderFromURL(catalogProduct.url_registration_license) + catalogProduct.url_registration_license.split('/').pop().split('.')[0];
        }

        await catalogProduct.destroy();

        if (public_id_image) {
            deleteFile(public_id_image);
        }
        if (public_id_registration_license) {
            deleteFile(public_id_registration_license);
        }

        return res.status(200).json({ code: 0, message: 'Xóa sản phẩm được phép bán thành công', data: catalogProduct });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa sản phẩm được phép bán thất bại', error: error.message });
    }
}

module.exports.updateCatalogProduct = async (req, res) => {

    let new_public_id_image = null
    let new_public_id_registration_license = null

    try {
        const { id } = req.params;

        const {
            name,
            brand,
            product_type_id,
            category_id,
            product_details
        } = req.body;

        const errors = [];

        if (!name || name === '') errors.push('name cần cung cấp');
        if (!brand || brand === '') errors.push('brand cần cung cấp');
        if (!product_type_id || product_type_id <= 0) errors.push('product_type_id cần cung cấp');
        if (!category_id || category_id <= 0) errors.push('category_id cần cung cấp');
        if (!product_details) errors.push('product_details cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const product_details_json = JSON.parse(product_details);

        let image_file = null;
        let registration_license_file = null;

        if (req.files && req.files['image']) {
            image_file = req.files && req.files['image'] && req.files['image'][0];
        }
        if (req.files && req.files['registration_license']) {
            registration_license_file = req.files && req.files['registration_license'] && req.files['registration_license'][0];
        }

        let catalogProduct = await CatalogProduct.findByPk(id);

        if (!catalogProduct) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm được phép bán không tồn tại' });
        }

        let old_public_id_image = null;
        let old_public_id_registration_license = null;

        if (image_file || registration_license_file) {

            // Lấy public id trước đó của ảnh
            if (catalogProduct.url_image) {
                old_public_id_image = extractFolderFromURL(catalogProduct.url_image) + catalogProduct.url_image.split('/').pop().split('.')[0];
            }
            if (catalogProduct.url_registration_license) {
                old_public_id_registration_license = extractFolderFromURL(catalogProduct.url_registration_license) + catalogProduct.url_registration_license.split('/').pop().split('.')[0];
            }

            if (image_file && registration_license_file) {
                const filesToUpload = [image_file, registration_license_file];
                const results = await uploadFiles(filesToUpload, folderPathUpload);

                const result_image_file = results[0];
                const result_registration_license_file = results[1];

                // cập nhật url mới trong DB
                catalogProduct.url_image = result_image_file.secure_url;
                catalogProduct.url_registration_license = result_registration_license_file.secure_url;

                new_public_id_image = result_image_file.public_id;
                new_public_id_registration_license = result_registration_license_file.public_id;
            }
            else if (image_file) {
                const filesToUpload = [image_file];
                const results = await uploadFiles(filesToUpload, folderPathUpload);

                const result_image_file = results[0];

                catalogProduct.url_image = result_image_file.secure_url;

                new_public_id_image = result_image_file.public_id;

            }
            else if (registration_license_file) {
                const filesToUpload = [registration_license_file];
                const results = await uploadFiles(filesToUpload, folderPathUpload);

                const result_registration_license_file = results[0];

                catalogProduct.url_registration_license = result_registration_license_file.secure_url;

                new_public_id_registration_license = result_registration_license_file.public_id;

            }
        }

        Object.assign(catalogProduct, {
            name,
            brand,
            product_type_id,
            category_id,
            product_details: product_details_json
        });

        await catalogProduct.save();

        // xóa các ảnh cũ nếu có ảnh mới
        if (old_public_id_image && new_public_id_image) {
            deleteFile(old_public_id_image);
        }
        if (old_public_id_registration_license && new_public_id_registration_license) {
            deleteFile(old_public_id_registration_license);
        }

        return res.status(200).json({ code: 0, message: 'Cập nhật sản phẩm được phép bán thành công', data: catalogProduct });
    }
    catch (error) {
        if (new_public_id_image) {
            deleteFile(new_public_id_image);
        }
        if (new_public_id_registration_license) {
            deleteFile(new_public_id_registration_license);
        }

        if (error.name === 'SequelizeUniqueConstraintError' && error.errors[0].message) {
            return res.status(400).json({ code: 2, message: 'Cập nhật sản phẩm được phép bán thất bại', error: error.errors[0].message });
        }

        return res.status(500).json({ code: 2, message: 'Cập nhật sản phẩm được phép bán thất bại', error: error.message });
    }
}

module.exports.setActiveCatalogProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { active_status } = req.body

        const errors = [];

        if (!active_status || active_status === '') errors.push('active_status cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const [affectedRows, updatedRows] = await CatalogProduct.update(
            { active_status },
            { where: { id }, returning: true }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm được phép bán không tồn tại' });
        }

        return res.status(200).json({ code: 0, message: 'Cập nhật trạng thái kích hoạt của sản phẩm được phép bán thành công', data: updatedRows[0] });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Cập nhật trạng thái kích hoạt của sản phẩm thất bại', error: error.message });
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