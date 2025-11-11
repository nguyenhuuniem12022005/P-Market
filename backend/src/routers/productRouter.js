import { Router } from "express";
import * as productController from '../app/controllers/productController.js';
import requireAuthentication from "../app/middleware/common/require-authentication.js";
import validate from "../app/middleware/common/validate.js";
import * as productRequest from '../app/requests/productRequest.js';
import checkProductIdExists from "../app/middleware/productMiddleware.js";
import { upload } from "../app/middleware/uploadMiddleware.js";

const productRouter = Router();

// Route c�ng khai - kh�ng y�u c?u x�c th?c
productRouter.get(
    '/',
    validate(productRequest.searchProducts),
    productController.searchProducts
);

productRouter.get(
    '/:id',
    productController.getProductById
);

// C�c route c?n l?i y�u c?u x�c th?c
productRouter.use(requireAuthentication);

productRouter.post(
    '/new-product',
    upload.single('image'),
    validate(productRequest.createProduct),
    productController.createProduct
);

productRouter.put(
    '/:id/update-product',
    checkProductIdExists,
    upload.single('image'),
    validate(productRequest.updateProduct),
    productController.updateProduct
);

productRouter.patch(
    '/:id/update-product-status',
    checkProductIdExists,
    validate(productRequest.updateProductStatus),
    productController.updateProductStatus
);

productRouter.delete(
    '/:id/delete-product',
    checkProductIdExists,
    productController.deleteProduct
);

export default productRouter;



