const Product = require('../database/models/Product')
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

module.exports.getAllProducts = async (req, res) => {
    try {
        const { seller_id } = req.query
        const { name, brand, approval_status, active_status, product_type_name, category_name, sort_price, page, limit, is_for_customer } = req.query;

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
        if (seller_id) {
            conditions.seller_id = seller_id;
        }
        if (approval_status) {
            conditions.approval_status = approval_status;
        }
        if (active_status) {
            conditions.active_status = active_status;
        }
        if (product_type_name) {
            // chuyển đổi product_type_name thành product_type_id

            const productType = await ProductType.findOne({
                where: { product_type_name }
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
                where: { category_name },
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

        // Xử lý sắp xếp
        const order = [];
        if (sort_price === 'asc' || sort_price === 'desc') {
            order.push(['retail_price', sort_price]);
        }

        // áp dụng ẩn các cột không cần thiết nếu là hiển thị cho khách hàng
        let attributes = undefined
        if (is_for_customer && (is_for_customer === 'true' || is_for_customer === true)) {
            attributes = { exclude: ['import_price'] }; // Ẩn các trường này

            conditions.approval_status = 'approved';
            conditions.active_status = 'active';
        }

        const products = await Product.findAll({
            where: conditions,
            limit: limitNumber,
            offset,
            order,
            attributes
        });

        const total = await Product.count({ where: conditions });

        return res.status(200).json({ code: 0, message: 'Lấy danh sách sản phẩm thành công', total, data: products });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh sách sản phẩm thất bại', error: error.message });
    }
}

module.exports.getProductById = async (req, res) => {
    try {

        const { id } = req.params;

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm không tồn tại' });
        }

        return res.status(200).json({ code: 0, message: 'Lấy chi tiết sản phẩm thành công', data: product });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy chi tiết sản phẩm thất bại', error: error.message });
    }
}

module.exports.getProductByIdForCustomer = async (req, res) => {
    try {

        const { id } = req.params;

        const product = await Product.findByPk(id, {
            attributes: {
                exclude: ['import_price']
            }
        });

        if (!product) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm không tồn tại' });
        }

        return res.status(200).json({ code: 0, message: 'Lấy thông tin cần thiết của sảm phẩm thành công', data: product });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy thông tin cần thiết của sảm phẩm thất bại', error: error.message });
    }
}

module.exports.addProduct = async (req, res) => {

    let public_id_image = null
    let public_id_registration_license = null

    try {
        const {
            name,
            brand,
            import_price,
            retail_price,
            stock,
            seller_id,
            seller_name,
            product_type_id,
            category_id,
            return_policy, // gửi dạng json đã được chuyển sang string
            product_details // gửi dạng json đã được chuyển sang string
        } = req.body;

        const errors = [];

        if (!name || name === '') errors.push('name cần cung cấp');
        if (!brand || brand === '') errors.push('brand cần cung cấp');
        if (!import_price || isNaN(import_price) || import_price < 0) errors.push('import_price phải là số và lớn hơn hoặc bằng 0');
        if (!retail_price || isNaN(retail_price) || retail_price < 0) errors.push('retail_price phải là số và lớn hơn hoặc bằng 0');
        if (!stock || isNaN(stock) || stock < 0) errors.push('stock phải là số và lớn hơn hoặc bằng 0');
        if (!seller_id || seller_id <= 0) errors.push('seller_id cần cung cấp');
        if (!seller_name || seller_name === '') errors.push('seller_name cần cung cấp');
        if (!product_type_id || product_type_id <= 0) errors.push('product_type_id cần cung cấp');
        if (!category_id || category_id <= 0) errors.push('category_id cần cung cấp');
        if (!return_policy) errors.push('return_policy cần cung cấp');
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
            errors.push('Không có file được tải lên, image file cần cung cấp');
        }
        if (!registration_license_file) {
            errors.push('Không có file được tải lên, registration_license file cần cung cấp');
        }

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const return_policy_json = JSON.parse(return_policy);
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

        const product = await Product.create({
            name,
            brand,
            import_price,
            retail_price,
            stock,
            seller_id,
            seller_name,
            url_image,
            url_registration_license,
            product_type_id,
            category_id,
            return_policy: return_policy_json,
            product_details: product_details_json
        });

        return res.status(201).json({ code: 0, message: 'Thêm sản phẩm thành công', data: product });
    }
    catch (error) {
        if (public_id_image) {
            deleteFile(public_id_image);
        }
        if (public_id_registration_license) {
            deleteFile(public_id_registration_license);
        }

        if (error.name === 'SequelizeUniqueConstraintError' && error.errors[0].message) {
            return res.status(400).json({ code: 2, message: 'Thêm sản phẩm thất bại', error: error.errors[0].message });
        }

        return res.status(500).json({ code: 2, message: 'Thêm sản phẩm thất bại', error: error.message });
    }
}

module.exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm không tồn tại' });
        }

        let public_id_image = null
        let public_id_registration_license = null

        if (product.url_image) {
            public_id_image = extractFolderFromURL(product.url_image) + product.url_image.split('/').pop().split('.')[0];
        }
        if (product.url_registration_license) {
            public_id_registration_license = extractFolderFromURL(product.url_registration_license) + product.url_registration_license.split('/').pop().split('.')[0];
        }

        await product.destroy();

        if (public_id_image) {
            deleteFile(public_id_image);
        }
        if (public_id_registration_license) {
            deleteFile(public_id_registration_license);
        }

        return res.status(200).json({ code: 0, message: 'Xóa sản phẩm thành công', data: product });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa sản phẩm thất bại', error: error.message });
    }
}

module.exports.updateProduct = async (req, res) => {

    let new_public_id_image = null
    let new_public_id_registration_license = null

    try {
        const { id } = req.params;

        const {
            name,
            brand,
            import_price,
            retail_price,
            stock,
            seller_id,
            seller_name,
            product_type_id,
            category_id,
            return_policy,
            product_details
        } = req.body;

        const errors = [];

        if (!name || name === '') errors.push('name cần cung cấp');
        if (!brand || brand === '') errors.push('brand cần cung cấp');
        if (!import_price || isNaN(import_price) || import_price < 0) errors.push('import_price phải là số và lớn hơn hoặc bằng 0');
        if (!retail_price || isNaN(retail_price) || retail_price < 0) errors.push('retail_price phải là số và lớn hơn hoặc bằng 0');
        if (!stock || isNaN(stock) || stock < 0) errors.push('stock phải là số và lớn hơn hoặc bằng 0');
        if (!seller_id || seller_id <= 0) errors.push('seller_id cần cung cấp');
        if (!seller_name || seller_name === '') errors.push('seller_name cần cung cấp');
        if (!product_type_id || product_type_id <= 0) errors.push('product_type_id cần cung cấp');
        if (!category_id || category_id <= 0) errors.push('category_id cần cung cấp');
        if (!return_policy) errors.push('return_policy cần cung cấp');
        if (!product_details) errors.push('product_details cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const return_policy_json = JSON.parse(return_policy);
        const product_details_json = JSON.parse(product_details);

        let image_file = null;
        let registration_license_file = null;

        if (req.files && req.files['image']) {
            image_file = req.files && req.files['image'] && req.files['image'][0];
        }
        if (req.files && req.files['registration_license']) {
            registration_license_file = req.files && req.files['registration_license'] && req.files['registration_license'][0];
        }

        let product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm không tồn tại' });
        }

        let old_public_id_image = null;
        let old_public_id_registration_license = null;

        if (image_file || registration_license_file) {

            // Lấy public id trước đó của ảnh
            if (product.url_image) {
                old_public_id_image = extractFolderFromURL(product.url_image) + product.url_image.split('/').pop().split('.')[0];
            }
            if (product.url_registration_license) {
                old_public_id_registration_license = extractFolderFromURL(product.url_registration_license) + product.url_registration_license.split('/').pop().split('.')[0];
            }

            if (image_file && registration_license_file) {
                const filesToUpload = [image_file, registration_license_file];
                const results = await uploadFiles(filesToUpload, folderPathUpload);

                const result_image_file = results[0];
                const result_registration_license_file = results[1];

                // cập nhật url mới trong DB
                product.url_image = result_image_file.secure_url;
                product.url_registration_license = result_registration_license_file.secure_url;

                new_public_id_image = result_image_file.public_id;
                new_public_id_registration_license = result_registration_license_file.public_id;
            }
            else if (image_file) {
                const filesToUpload = [image_file];
                const results = await uploadFiles(filesToUpload, folderPathUpload);

                const result_image_file = results[0];

                product.url_image = result_image_file.secure_url;

                new_public_id_image = result_image_file.public_id;

            }
            else if (registration_license_file) {
                const filesToUpload = [registration_license_file];
                const results = await uploadFiles(filesToUpload, folderPathUpload);

                const result_registration_license_file = results[0];

                product.url_registration_license = result_registration_license_file.secure_url;

                new_public_id_registration_license = result_registration_license_file.public_id;

            }
        }

        Object.assign(product, {
            name,
            brand,
            import_price,
            retail_price,
            stock,
            seller_id,
            seller_name,
            product_type_id,
            category_id,
            return_policy: return_policy_json,
            product_details: product_details_json
        });

        await product.save();

        // xóa các ảnh cũ nếu có ảnh mới
        if (old_public_id_image && new_public_id_image) {
            deleteFile(old_public_id_image);
        }
        if (old_public_id_registration_license && new_public_id_registration_license) {
            deleteFile(old_public_id_registration_license);
        }

        return res.status(200).json({ code: 0, message: 'Cập nhật sản phẩm thành công', data: product });
    }
    catch (error) {
        if (new_public_id_image) {
            deleteFile(new_public_id_image);
        }
        if (new_public_id_registration_license) {
            deleteFile(new_public_id_registration_license);
        }

        if (error.name === 'SequelizeUniqueConstraintError' && error.errors[0].message) {
            return res.status(400).json({ code: 2, message: 'Cập nhật sản phẩm thất bại', error: error.errors[0].message });
        }

        return res.status(500).json({ code: 2, message: 'Cập nhật sản phẩm thất bại', error: error.message });
    }
}

module.exports.approvalProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { approval_status } = req.body

        const errors = [];

        if (!approval_status || approval_status === '') errors.push('approval_status cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        let active_status = 'inactive';
        if (approval_status === 'approved') {
            active_status = 'active';
        } else if (approval_status === 'rejected') {
            active_status = 'inactive';
        }

        const [affectedRows, updatedRows] = await Product.update(
            { approval_status, active_status },
            { where: { id }, returning: true }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm không tồn tại hoặc không bị thay đổi' });
        }

        return res.status(200).json({ code: 0, message: 'Cập nhật trạng thái phê duyệt sản phẩm thành công', data: updatedRows[0] });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Cập nhật trạng thái phê duyệt sản phẩm thất bại', error: error.message });
    }
}

module.exports.setActiveProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { active_status } = req.body

        const errors = [];

        if (!active_status || active_status === '') errors.push('active_status cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const [affectedRows, updatedRows] = await Product.update(
            { active_status },
            { where: { id, approval_status: 'approved' }, returning: true }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm phải tồn tại và đã được duyệt' });
        }

        return res.status(200).json({ code: 0, message: 'Cập nhật trạng thái kích hoạt của sản phẩm thành công', data: updatedRows[0] });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Cập nhật trạng thái kích hoạt của sản phẩm thất bại', error: error.message });
    }
}

module.exports.getAllBrands = async (req, res) => {
    try {

        const products = await Product.findAll({
            attributes: ['brand'], // Chỉ lấy cột 'brand'
            group: ['brand'],      // Nhóm theo cột 'brand' để lấy các giá trị duy nhất
            order: [['brand', 'ASC']]
        });

        const brandList = products.map(products => products.brand);

        return res.status(200).json({ code: 0, message: 'Lấy tất cả tên thương hiệu thành công', data: brandList });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy tất cả tên thương hiệu thất bại', error: error.message });
    }
}

module.exports.checkStock = async (req, res) => {
    try {
        const { products } = req.body

        const errors = [];

        if (!products || !Array.isArray(products)) errors.push('products cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        for (const item of products) {
            const { id, name, quantity } = item;

            const product = await Product.findByPk(id, {
                attributes: ['id', 'stock']
            });

            if (!product) {
                return res.status(404).json({ code: 1, message: `Sản phẩm không tồn tại: ${name}` });
            }

            if (product.stock < quantity) {
                return res.status(400).json({ code: 1, message: `Sản phẩm không đủ hàng: ${name} chỉ còn lại ${product.stock}` });
            }
        }

        return res.status(200).json({ code: 0, message: 'Tất cả sản phẩm còn đủ hàng' });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Kiểm tra kho hàng thất bại', error: error.message });
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