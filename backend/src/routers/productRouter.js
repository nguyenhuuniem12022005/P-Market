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
    '/:id(\\d+)',
    productController.getProductById
);

// C�c route c?n l?i y�u c?u x�c th?c
productRouter.use(requireAuthentication);

productRouter.get(
    '/my',
    productController.listMyProducts
);

productRouter.get(
    '/:id/manage',
    checkProductIdExists,
    productController.getProductManagementDetail
);

productRouter.get(
    '/audits/pending',
    productController.listPendingAudits
);

productRouter.get(
    '/:id/audits',
    checkProductIdExists,
    productController.getProductAudits
);

productRouter.post(
    '/:id/audits',
    checkProductIdExists,
    validate(productRequest.requestProductAudit),
    productController.requestProductAudit
);

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

productRouter.patch(
    '/:id/audits/:auditId',
    checkProductIdExists,
    validate(productRequest.reviewProductAudit),
    productController.reviewProductAudit
);

productRouter.delete(
    '/:id/delete-product',
    checkProductIdExists,
    productController.deleteProduct
);

export default productRouter;



