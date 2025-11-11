import * as productService from '../services/productService.js';

export async function createProduct(req, res) {
    const supplierId = req.user.userId;
<<<<<<< HEAD
    
    // Lấy đường dẫn file ảnh nếu có upload
    const imageURL = req.file ? `/uploads/${req.file.filename}` : null;
    
    const productData = {
        ...req.body,
        status: 'Draft',
        imageURL
    };

    const newProduct = await productService.createProduct(productData, supplierId);
=======

    const newProduct = await productService.createProduct(req.body, supplierId);
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29

    res.status(201).json({
        success: true,
        message: 'Tạo sản phẩm thành công!',
        product: newProduct
    });
}

<<<<<<< HEAD
export async function searchProducts(req, res) {
    const { searchTerm, categoryId } = req.query; 

    const products = await productService.searchProducts(
        searchTerm || '', 
        categoryId ? Number(categoryId) : null
    );
=======
export async function uploadImage(req, res) {
    const productId = req.params.id;
    const imagePath = `public/uploads/${req.file.filename}`;

    await productService.uploadImage(productId, imagePath);

    res.json({
        success: true,
        message: 'Cập nhật ảnh thành công!'
    })
}

export async function searchProducts(req, res) {
    const { searchTerm } = req.query; 

    const products = await productService.searchProducts(searchTerm || '');

>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
    res.status(200).json({
        success: true,
        message: 'Tìm kiếm thành công!',
        products: products
    });
}

export async function updateProduct(req, res) {
    const productId = req.params.id;
    const supplierId = req.user.userId;
<<<<<<< HEAD
    const imageURL = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updatePayload = {
        ...req.body
    };

    if (imageURL !== undefined) {
        updatePayload.imageURL = imageURL;
    }

    await productService.updateProduct(productId, supplierId, updatePayload);
=======

    await productService.updateProduct(productId, supplierId, req.body);
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29

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
<<<<<<< HEAD

export async function getProductById(req, res) {
    const productId = req.params.id;
    const product = await productService.getProductById(productId);
    
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy sản phẩm'
        });
    }
    
    res.status(200).json({
        success: true,
        product: product
    });
}
=======
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
