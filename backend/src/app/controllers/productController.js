import * as productService from '../services/productService.js';

export async function createProduct(req, res, next) {
    const supplierId = req.user.id; // Lấy từ requireAuthentication
    
    // Gọi service (đã 'await' trong service để lấy lại sản phẩm)
    const newProduct = await productService.createProduct(req.body, supplierId);
    
    res.status(201).json({
        success: true,
        message: 'Tạo sản phẩm thành công!',
        product: newProduct
    });
}

/**
 * Xử lý lấy tất cả sản phẩm (còn hàng).
 * (Route này là công khai)
 */
export async function handleGetAllProducts(req, res, next) {
    const products = await productService.findAllProducts();
    res.status(200).json({
        success: true,
        products: products
    });
}

/**
 * Xử lý lấy chi tiết một sản phẩm bằng ID.
 * (Route này là công khai)
 */
export async function handleGetProductById(req, res, next) {
    const productId = req.params.id;
    const product = await productService.findProductById(productId);
    
    // (Lưu ý: Nếu product là 'null', code này sẽ trả về 'null'
    // mà không báo lỗi 404, vì controller không xử lý lỗi)
    res.status(200).json({
        success: true,
        product: product
    });
}

/**
 * Xử lý lấy tất cả sản phẩm của một Supplier (cho trang quản lý shop).
 * (Route này có thể là công khai hoặc bảo vệ)
 */
export async function handleGetProductsBySupplier(req, res, next) {
    // Lấy supplierId từ URL (nếu xem shop người khác) 
    // hoặc từ token (nếu xem shop của mình)
    const supplierId = req.params.supplierId || req.user.id;
    
    const products = await productService.findProductsBySupplier(supplierId);
    res.status(200).json({
        success: true,
        products: products
    });
}

/**
 * Xử lý cập nhật sản phẩm.
 * (Yêu cầu 'requireAuthentication' và 'isSupplier')
 */
export async function handleUpdateProduct(req, res, next) {
    const productId = req.params.id;  // ID sản phẩm từ URL
    const supplierId = req.user.id; // ID chủ shop (đã xác thực)
    
    // Service sẽ tự check (WHERE id = ? AND supplierId = ?)
    await productService.updateProduct(productId, supplierId, req.body);

    res.status(200).json({
        success: true,
        message: 'Cập nhật sản phẩm thành công.'
    });
    // (Lưu ý: Controller không biết update có thành công hay không
    // vì service của bạn không return 'affectedRows')
}

/**
 * Xử lý xóa sản phẩm.
 * (Yêu cầu 'requireAuthentication' và 'isSupplier')
 */
export async function handleDeleteProduct(req, res, next) {
    const productId = req.params.id;
    const supplierId = req.user.id;
    
    // Service sẽ tự check (WHERE id = ? AND supplierId = ?)
    await productService.deleteProduct(productId, supplierId);

    res.status(200).json({
        success: true,
        message: 'Xóa sản phẩm thành công.'
    });
    // (Lưu ý: Controller không biết delete có thành công hay không)
}