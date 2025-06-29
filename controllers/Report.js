const sequelize = require('../database/sequelize');

module.exports.reportProducts = async (req, res) => {
    try {
        const { startDate, endDate, seller_id } = req.query;

        let selectedStartDate = undefined
        let selectedEndDate = undefined

        if (startDate && endDate) {
            const isValidStartDate = /^\d{4}-\d{2}-\d{2}$/.test(startDate);
            const isValidEndDate = /^\d{4}-\d{2}-\d{2}$/.test(endDate);

            if (!isValidStartDate || !isValidEndDate) {
                return res.status(400).json({ code: 1, message: 'Định dạng ngày không hợp lệ. Vui lòng sử dụng: yyyy-mm-dd.' });
            }

            selectedStartDate = new Date(startDate);
            selectedStartDate.setHours(0, 0, 0, 0); // 00:00:00

            selectedEndDate = new Date(endDate);
            selectedEndDate.setHours(23, 59, 59, 999); // 23:59:59.999
        }

        const sql = `
                SELECT pp.*, p.import_price, p.retail_price, p.actual_price, cp.name, cp.url_image
                FROM purchased_products pp
                JOIN products p ON pp.product_id = p.id
                JOIN catalog_products cp ON p.catalog_product_id = cp.id
                WHERE pp.status = :status
                ${seller_id ? 'AND pp.seller_id = :seller_id' : ''}
                ${startDate && endDate ? 'AND pp."updatedAt" BETWEEN :startDate AND :endDate' : ''}
            `

        const purchasedProducts = await sequelize.query(sql,
            {
                replacements: {
                    status: 'completed',
                    seller_id: seller_id,
                    startDate: startDate ? new Date(selectedStartDate) : undefined,
                    endDate: endDate ? new Date(selectedEndDate) : undefined
                },
                type: sequelize.QueryTypes.SELECT
            }
        );
        // lưu ý: updatedAt phải đặt trong cặp dấu "" nếu không thì nó sẽ tự động bị đổi thành in thường updatedat, gây lỗi cột không tồn tại
        // dùng replacements để chống SQL Injection
        // Sequelize biết đây là câu lệnh SELECT, trả về data dạng mảng các object JSON (chứ không phải metadata hay số lượng rows...).
        
        const productStats = {};

        purchasedProducts.forEach(purchasedProduct => {
            const productId = purchasedProduct.product_id;

            if (!productStats[productId]) {
                productStats[productId] = {
                    product_id: productId,
                    name: purchasedProduct.name,
                    url_image: purchasedProduct.url_image,
                    import_price: purchasedProduct.import_price,
                    retail_price: purchasedProduct.retail_price,
                    quantity_sold: 0,
                    cost: 0,    // tổng vốn
                    revenue: 0, // tổng tiền bán được (doanh thu)
                    profit: 0,
                    profit_margin: 0,
                };
            }

            const quantitySold = purchasedProduct.quantity;
            const cost = purchasedProduct.import_price * quantitySold;
            const revenue = purchasedProduct.retail_price * quantitySold;
            const profit = revenue - cost;  

            // Cập nhật các thông tin thống kê cho sản phẩm
            productStats[productId].quantity_sold += quantitySold;
            productStats[productId].cost += cost;
            productStats[productId].revenue += revenue;
            productStats[productId].profit += profit;
            productStats[productId].profit_margin = (productStats[productId].revenue > 0) ? 
                ((productStats[productId].profit / productStats[productId].revenue) * 100).toFixed(2) : 0;
        });

        const reportProducts = Object.values(productStats);

        return res.status(200).json({ code: 0, message: 'Báo cáo và thống kê sản phẩm đã bán thành công', data: reportProducts });
    }
    catch (error) {
        return res.status(500).json({ code: 2, message: 'Báo cáo và thống kê sản phẩm đã bán thất bại', error: error.message });
    }
}