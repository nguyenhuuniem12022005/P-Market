import { Router } from 'express';
import * as productController from '../app/controllers/productController.js';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import validate from '../app/middleware/common/validate.js';
import * as productRequest from '../app/requests/productRequest.js';
import checkProductIdExists from '../app/middleware/productMiddleware.js';

const productRouter = Router();

// ========= Public APIs =========
productRouter.get('/categories', productController.handleGetCategories);
productRouter.get('/', productController.handleGetAllProducts);

// Lấy danh sách sản phẩm của một supplier cụ thể
productRouter.get(
  '/supplier/:supplierId',
  productController.handleGetProductsBySupplier,
);

// Chi tiết một sản phẩm
productRouter.get(
  '/:id',
  checkProductIdExists,
  productController.handleGetProductById,
);

// ========= Protected APIs (cần đăng nhập) =========
productRouter.post(
  '/new-product',
  requireAuthentication,
  validate(productRequest.createProduct),
  productController.createProduct,
);

productRouter.put(
  '/:id/update-product',
  requireAuthentication,
  checkProductIdExists,
  validate(productRequest.updateProduct),
  productController.handleUpdateProduct,
);

productRouter.delete(
  '/:id/delete-product',
  requireAuthentication,
  checkProductIdExists,
  productController.handleDeleteProduct,
);

export default productRouter;
