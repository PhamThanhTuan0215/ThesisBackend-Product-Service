const ProductType = require('../database/models/ProductType')
const Category = require('../database/models/Category')
const CatalogProduct = require('../database/models/CatalogProduct')
const Product = require('../database/models/Product')
const Promotion = require('../database/models/Promotion')
const CatalogPromotion = require('../database/models/CatalogPromotion')

const { uploadFiles, deleteFile } = require('../ultis/manageFilesOnCloudinary')

const { formatProduct } = require('../ultis/formatData')

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
    { name: 'import_invoice', maxCount: 1 }
]);

module.exports.getAllProducts = async (req, res) => {
    try {
        const { seller_id } = req.query
        const { name, brand, approval_status, active_status, platform_active_status, product_type_name, category_name, sort_price, page, limit, is_for_customer } = req.query;

        // Áp dụng điều kiện lọc
        const productConditions = {}; // Conditions for Product model
        const catalogProductConditions = {}; // Conditions for CatalogProduct model

        if (name) {
            catalogProductConditions[Op.or] = [
                {
                    name: {
                        [Op.iLike]: `%${name}%`,
                    },
                },
                where(
                    fn('LOWER', literal(`"CatalogProduct"."product_details"->>'Tên hiển thị'`)),
                    {
                        [Op.like]: `%${name.toLowerCase()}%`,
                    }
                )
            ];
        }
        if (brand) {
            catalogProductConditions.brand = brand;
        }
        if (seller_id) {
            productConditions.seller_id = seller_id;
        }
        if (approval_status) {
            productConditions.approval_status = approval_status;
        }
        if (active_status) {
            productConditions.active_status = active_status;
        }
        if (platform_active_status) {
            catalogProductConditions.active_status = platform_active_status;
        }
        if (product_type_name) {
            // chuyển đổi product_type_name thành product_type_id

            const productType = await ProductType.findOne({
                where: { product_type_name: { [Op.iLike]: `${product_type_name}` } } // không phân biệt hoa thường nhưng phải chính xác chuỗi
            });

            if (productType) {
                catalogProductConditions.product_type_id = productType.id;
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
                catalogProductConditions.category_id = { [Op.in]: categoryIds };
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
            attributes = { exclude: ['import_price', 'import_date', 'url_import_invoice'] }; // Ẩn các trường này

            productConditions.approval_status = 'approved';
            productConditions.active_status = 'active';
            catalogProductConditions.active_status = 'active';
        }

        // Bước 1: Lấy danh sách id sản phẩm theo điều kiện, phân trang
        const productIds = await Product.findAll({
            where: productConditions,
            include: [
                {
                    model: CatalogProduct,
                    required: true,
                    where: catalogProductConditions
                }
            ],
            attributes: ['id'],
            limit: limitNumber,
            offset,
            order,
            raw: true
        });
        const ids = productIds.map(p => p.id);

        // Nếu không có sản phẩm nào thì trả về luôn
        if (ids.length === 0) {
            return res.status(200).json({ code: 0, message: 'Lấy danh sách sản phẩm thành công', total: 0, data: [] });
        }

        // Bước 2: Truy vấn lại Product với include đầy đủ dựa trên danh sách id vừa lấy
        const products = await Product.findAll({
            where: { ...productConditions, id: ids },
            order,
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

        // Đếm tổng số sản phẩm (không phân trang)
        const total = await Product.count({
            where: productConditions,
            include: [
                {
                    model: CatalogProduct,
                    required: true,
                    where: catalogProductConditions
                }
            ]
        });

        const formattedProducts = products.map(product => formatProduct(product));

        return res.status(200).json({ code: 0, message: 'Lấy danh sách sản phẩm thành công', total, data: formattedProducts });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh sách sản phẩm thất bại', error: error.message });
    }
}

module.exports.getProductById = async (req, res) => {
    try {

        const { id } = req.params;

        // join với bảng CatalogProduct để lấy thêm các trường của CatalogProduct
        const product = await Product.findByPk(id, {
            include: [
                {
                    model: CatalogProduct
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

        if (!product) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm không tồn tại' });
        }

        // format lại data
        const formattedProduct = formatProduct(product);

        return res.status(200).json({ code: 0, message: 'Lấy chi tiết sản phẩm thành công', data: formattedProduct });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy chi tiết sản phẩm thất bại', error: error.message });
    }
}

module.exports.getProductByIdForCustomer = async (req, res) => {
    try {

        const { id } = req.params;

        const productConditions = {
            id,
            approval_status: 'approved',
            active_status: 'active'
        }

        const catalogProductConditions = {
            active_status: 'active'
        }

        const product = await Product.findOne({
            where: productConditions,
            attributes: {
                exclude: ['import_price', 'import_date', 'url_import_invoice']
            },
            include: [
                {
                    model: CatalogProduct,
                    required: true,
                    where: catalogProductConditions
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

        if (!product) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm không tồn tại' });
        }

        const formattedProduct = formatProduct(product);

        return res.status(200).json({ code: 0, message: 'Lấy thông tin cần thiết của sảm phẩm thành công', data: formattedProduct });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy thông tin cần thiết của sảm phẩm thất bại', error: error.message });
    }
}

module.exports.addProduct = async (req, res) => {

    let public_id_import_invoice = null

    try {
        const {
            catalog_product_id,
            import_price,
            import_date,
            retail_price,
            stock,
            seller_id,
            seller_name,
            return_policy, // gửi dạng json đã được chuyển sang string
        } = req.body;

        const errors = [];

        if (!catalog_product_id || catalog_product_id <= 0) errors.push('catalog_product_id cần cung cấp');
        if (!import_price || isNaN(import_price) || import_price < 0) errors.push('import_price phải là số và lớn hơn hoặc bằng 0');
        if (isNaN(Date.parse(import_date))) {
            errors.push('import_date phải là ngày hợp lệ');
        }
        if (!retail_price || isNaN(retail_price) || retail_price < 0) errors.push('retail_price phải là số và lớn hơn hoặc bằng 0');
        if (!stock || isNaN(stock) || stock < 0) errors.push('stock phải là số và lớn hơn hoặc bằng 0');
        if (!seller_id || seller_id <= 0) errors.push('seller_id cần cung cấp');
        if (!seller_name || seller_name === '') errors.push('seller_name cần cung cấp');
        if (!return_policy) errors.push('return_policy cần cung cấp');

        let import_invoice_file = null;

        if (req.files && req.files['import_invoice']) {
            import_invoice_file = req.files && req.files['import_invoice'] && req.files['import_invoice'][0];
        }

        if (!import_invoice_file) {
            errors.push('import_invoice file cần cung cấp');
        }

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const return_policy_json = JSON.parse(return_policy);

        const filesToUpload = [import_invoice_file];

        const results = await uploadFiles(filesToUpload, folderPathUpload);

        const result_import_invoice_file = results[0];

        // url của ảnh đã được tải lên
        const url_import_invoice = result_import_invoice_file.secure_url;

        // Lưu public id để xóa các ảnh đã tải lên nếu có lỗi
        public_id_import_invoice = result_import_invoice_file.public_id;

        const product = await Product.create({
            catalog_product_id,
            import_price,
            import_date,
            url_import_invoice,
            retail_price,
            stock,
            seller_id,
            seller_name,
            return_policy: return_policy_json
        });

        return res.status(201).json({ code: 0, message: 'Thêm sản phẩm thành công', data: product });
    }
    catch (error) {
        if (public_id_import_invoice) {
            deleteFile(public_id_import_invoice);
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

        let public_id_import_invoice = null

        if (product.url_import_invoice) {
            public_id_import_invoice = extractFolderFromURL(product.url_import_invoice) + product.url_import_invoice.split('/').pop().split('.')[0];
        }

        await product.destroy();

        if (public_id_import_invoice) {
            deleteFile(public_id_import_invoice);
        }

        return res.status(200).json({ code: 0, message: 'Xóa sản phẩm thành công', data: product });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Xóa sản phẩm thất bại', error: error.message });
    }
}

module.exports.updateProduct = async (req, res) => {

    let new_public_id_import_invoice = null

    try {
        const { id } = req.params;

        const {
            catalog_product_id,
            import_price,
            import_date,
            retail_price,
            stock,
            seller_id,
            seller_name,
            return_policy
        } = req.body;

        const errors = [];

        if (!catalog_product_id || catalog_product_id <= 0) errors.push('catalog_product_id cần cung cấp');
        if (!import_price || isNaN(import_price) || import_price < 0) errors.push('import_price phải là số và lớn hơn hoặc bằng 0');
        if (isNaN(Date.parse(import_date))) {
            errors.push('import_date phải là ngày hợp lệ');
        }
        if (!retail_price || isNaN(retail_price) || retail_price < 0) errors.push('retail_price phải là số và lớn hơn hoặc bằng 0');
        if (!stock || isNaN(stock) || stock < 0) errors.push('stock phải là số và lớn hơn hoặc bằng 0');
        if (!seller_id || seller_id <= 0) errors.push('seller_id cần cung cấp');
        if (!seller_name || seller_name === '') errors.push('seller_name cần cung cấp');
        if (!return_policy) errors.push('return_policy cần cung cấp');

        if (errors.length > 0) {
            return res.status(400).json({ code: 1, message: 'Xác thực thất bại', errors });
        }

        const return_policy_json = JSON.parse(return_policy);

        let import_invoice_file = null;

        if (req.files && req.files['import_invoice']) {
            import_invoice_file = req.files && req.files['import_invoice'] && req.files['import_invoice'][0];
        }

        let product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm không tồn tại' });
        }

        let old_public_id_import_invoice = null;

        if (import_invoice_file) {

            // Lấy public id trước đó của ảnh
            if (product.url_import_invoice) {
                old_public_id_import_invoice = extractFolderFromURL(product.url_import_invoice) + product.url_import_invoice.split('/').pop().split('.')[0];
            }

            if (import_invoice_file) {
                const filesToUpload = [import_invoice_file];
                const results = await uploadFiles(filesToUpload, folderPathUpload);

                const result_import_invoice_file = results[0];

                // cập nhật url mới trong DB
                product.url_import_invoice = result_import_invoice_file.secure_url;

                new_public_id_import_invoice = result_import_invoice_file.public_id;
            }
        }

        Object.assign(product, {
            catalog_product_id,
            import_price,
            import_date,
            retail_price,
            stock,
            seller_id,
            seller_name,
            return_policy: return_policy_json
        });

        await product.save();

        // xóa các ảnh cũ nếu có ảnh mới
        if (old_public_id_import_invoice && new_public_id_import_invoice) {
            deleteFile(old_public_id_import_invoice);
        }

        return res.status(200).json({ code: 0, message: 'Cập nhật sản phẩm thành công', data: product });
    }
    catch (error) {
        if (new_public_id_import_invoice) {
            deleteFile(new_public_id_import_invoice);
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

        const [affectedRows, updatedRows] = await Product.update(
            { approval_status },
            { where: { id }, returning: true }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm không tồn tại' });
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
            { where: { id }, returning: true }
        );

        if (affectedRows === 0) {
            return res.status(404).json({ code: 1, message: 'Sản phẩm không tồn tại' });
        }

        return res.status(200).json({ code: 0, message: 'Cập nhật trạng thái kích hoạt của sản phẩm thành công', data: updatedRows[0] });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Cập nhật trạng thái kích hoạt của sản phẩm thất bại', error: error.message });
    }
}

module.exports.getAllBrands = async (req, res) => {
    try {
        const catalogProducts = await CatalogProduct.findAll({
            attributes: ['brand'], // Chỉ lấy cột 'brand'
            group: ['brand'],      // Nhóm theo cột 'brand' để lấy các giá trị duy nhất
            order: [['brand', 'ASC']]
        });

        const brandList = catalogProducts.map(catalogProducts => catalogProducts.brand);

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
            const { id, quantity } = item;

            const product = await Product.findByPk(id, {
                attributes: ['id', 'stock'],
                include: [
                    {
                        model: CatalogProduct,
                        attributes: ['name'],
                        required: true
                    }
                ]
            });

            if (!product) {
                return res.status(404).json({ code: 1, message: `Sản phẩm không tồn tại: ${id}` });
            }

            if (product.stock < quantity) {
                return res.status(400).json({ code: 1, message: `Sản phẩm không đủ hàng: ${product.CatalogProduct.name} chỉ còn lại ${product.stock}` });
            }
        }

        return res.status(200).json({ code: 0, message: 'Tất cả sản phẩm còn đủ hàng' });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Kiểm tra kho hàng thất bại', error: error.message });
    }
}

module.exports.getProductsByIds = async (req, res) => {
    try {
        const { product_ids } = req.body;

        const products = await Product.findAll({
            where: { id: product_ids },
            attributes: ['id', 'retail_price', 'stock', 'seller_id', 'seller_name', 'promotion_name', 'promotion_value_percent', 'promotion_start_date', 'promotion_end_date', 'active_status', 'approval_status'],
            include: [
                {
                    model: CatalogProduct,
                    attributes: ['name', 'url_image', 'active_status'],
                    required: true
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

        const formattedProducts = products.map(product => formatProduct(product));

        return res.status(200).json({ code: 0, message: 'Lấy danh sách sản phẩm thành công', data: formattedProducts });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Lấy danh sách sản phẩm thất bại', error: error.message });
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