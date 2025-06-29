function formatProductLite(product) {
    const plain = product.toJSON();

    const formattedProduct = {
        ...plain,
        name: product.CatalogProduct?.name,
        url_image: product.CatalogProduct?.url_image
    };

    delete formattedProduct.CatalogProduct;
    delete formattedProduct.Promotions;

    return formattedProduct;
}

function formatPromotionLite(promotion) {
    const plain = promotion.toJSON();

    const formattedPromotion = {
        ...plain,
        name: promotion.CatalogPromotion?.name,
        product_ids: promotion.PromotionProducts?.map((promotionProduct) => promotionProduct.product_id)
    };

    delete formattedPromotion.CatalogPromotion;
    delete formattedPromotion.PromotionProducts;
    
    return formattedPromotion;
}

function formatProduct(product) {
    const plain = product.toJSON();

    const formattedProduct = {
        ...plain,
        name: product.CatalogProduct?.name,
        brand: product.CatalogProduct?.brand,
        platform_active_status: product.CatalogProduct?.active_status,
        url_image: product.CatalogProduct?.url_image,
        url_registration_license: product.CatalogProduct?.url_registration_license,
        product_type_id: product.CatalogProduct?.product_type_id,
        category_id: product.CatalogProduct?.category_id,
        product_details: product.CatalogProduct?.product_details,
    };

    delete formattedProduct.CatalogProduct;
    delete formattedProduct.Promotions;

    return formattedProduct;
}

module.exports = { formatProductLite, formatPromotionLite, formatProduct };