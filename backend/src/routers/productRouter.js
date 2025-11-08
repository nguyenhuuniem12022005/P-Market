import { Router } from "express";
import * as productController from '../app/controllers/productController.js';
import requireAuthentication from "../app/middleware/common/require-authentication.js";
import validate from "../app/middleware/common/validate.js";
import * as productRequest from '../app/requests/productRequest.js';
import checkProductIdExists from "../app/middleware/productMiddleware.js";

const productRouter = Router();
productRouter.use(requireAuthentication);

productRouter.post(
    '/new-product',
    validate(productRequest.createProduct),
    productController.createProduct
);

productRouter.get(
    '/',
    validate(productRequest.searchProducts),
    productController.searchProducts
);

productRouter.put(
    '/:id/update-product',
    checkProductIdExists,
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