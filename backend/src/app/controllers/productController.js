import * as productService from '../services/productService.js';
import ApiError from '../../utils/classes/api-error.js';

export async function handleGetCategories(req, res, next) {
  try {
    const categories = await productService.getCategories();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const supplierId = req.user.userId;
    const product = await productService.createProduct(req.body, supplierId);

    res.status(201).json({
      success: true,
      message: 'Tạo sản phẩm thành công!',
      product,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetAllProducts(req, res, next) {
  try {
    const {
      q,
      categoryId,
      status,
      page,
      limit,
    } = req.query;

    const result = await productService.findAllProducts({
      searchTerm: q,
      categoryId: categoryId ? Number(categoryId) : undefined,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetProductById(req, res, next) {
  try {
    const productId = Number(req.params.id);
    const product = await productService.findProductById(productId);
    if (!product) {
      throw ApiError.notFound('Không tìm thấy sản phẩm');
    }
    res.json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetProductsBySupplier(req, res, next) {
  try {
    const supplierId = Number(req.params.supplierId || req.user?.userId);
    if (!supplierId) {
      throw ApiError.badRequest('Thiếu thông tin nhà cung cấp');
    }
    const products = await productService.findProductsBySupplier(supplierId);
    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateProduct(req, res, next) {
  try {
    const productId = Number(req.params.id);
    const supplierId = req.user.userId;
    await productService.updateProduct(productId, supplierId, req.body);

    res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công.',
    });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteProduct(req, res, next) {
  try {
    const productId = Number(req.params.id);
    const supplierId = req.user.userId;
    await productService.deleteProduct(productId, supplierId);

    res.json({
      success: true,
      message: 'Xóa sản phẩm thành công.',
    });
  } catch (error) {
    next(error);
  }
}
