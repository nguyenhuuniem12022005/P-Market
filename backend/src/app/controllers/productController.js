import * as productService from '../services/productService.js';

export async function createProduct(req, res) {
    const supplierId = req.user.userId;
    
    // Lấy đường dẫn file ảnh nếu có upload
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const productData = {
        ...req.body,
        imageUrl
    };

    const newProduct = await productService.createProduct(productData, supplierId);

    res.status(201).json({
        success: true,
        message: 'Tạo sản phẩm thành công!',
        product: newProduct
    });
}

export async function searchProducts(req, res) {
    const { searchTerm, categoryId } = req.query; 

    const products = await productService.searchProducts(
        searchTerm || '', 
        categoryId ? Number(categoryId) : null
    );
    res.status(200).json({
        success: true,
        message: 'Tìm kiếm thành công!',
        products: products
    });
}

export async function updateProduct(req, res) {
    const productId = req.params.id;
    const supplierId = req.user.userId;

    await productService.updateProduct(productId, supplierId, req.body);

    res.status(200).json({
        success: true,
        message: 'Cập nhật sản phẩm thành công!'
    });
}

export async function updateProductStatus(req, res) {
    const productId = req.params.id;
    const supplierId = req.user.userId;

    await productService.updateProductStatus(productId, supplierId, req.body.status);

    res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái sản phẩm thành công!'
    });
}

export async function deleteProduct(req, res) {
    const productId = req.params.id;
    const supplierId = req.user.userId;

    await productService.deleteProduct(productId, supplierId);

    res.status(200).json({
        success: true,
        message: 'Xóa sản phẩm thành công!'
    });
}

export async function getProductById(req, res) {
    const productId = req.params.id;
    const product = await productService.getProductById(productId);
    
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Kh�ng t?m th?y s?n ph?m'
        });
    }
    
    res.status(200).json({
        success: true,
        product: product
    });
}
