import { Router } from "express";
import * as supplierController from '../app/controllers/supplierController.js';
import requireAuthentication from "../app/middleware/common/require-authentication.js";
import ensureSupplier from "../app/middleware/supplierMiddleware.js";
import { updateShopName } from "../app/requests/supplierRequest.js";
import validate from "../app/middleware/common/validate.js";

const supplierRouter = Router();
supplierRouter.use(requireAuthentication);
supplierRouter.use(ensureSupplier);

supplierRouter.patch(
    '/me/update-shop-name',
    validate(updateShopName),
    supplierController.updateShopName
);

supplierRouter.patch(
    '/me/update-rating',
    supplierController.updateSellerRating
);

export default supplierRouter;