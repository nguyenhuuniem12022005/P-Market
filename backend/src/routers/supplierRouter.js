<<<<<<< HEAD
﻿import { Router } from 'express';
import * as supplierController from '../app/controllers/supplierController.js';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import validate from '../app/middleware/common/validate.js';
import ensureSupplier from '../app/middleware/supplierMiddleware.js';
import * as supplierRequest from '../app/requests/supplierRequest.js';
=======
import { Router } from "express";
import * as supplierController from '../app/controllers/supplierController.js';
import requireAuthentication from "../app/middleware/common/require-authentication.js";
import ensureSupplier from "../app/middleware/supplierMiddleware.js";
import { updateShopName } from "../app/requests/supplierRequest.js";
import validate from "../app/middleware/common/validate.js";
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29

const supplierRouter = Router();
supplierRouter.use(requireAuthentication);
supplierRouter.use(ensureSupplier);

supplierRouter.patch(
    '/me/update-shop-name',
<<<<<<< HEAD
    validate(supplierRequest.updateShopName),
=======
    validate(updateShopName),
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
    supplierController.updateShopName
);

supplierRouter.patch(
<<<<<<< HEAD
    '/me/update-seller-rating',
    supplierController.updateSellerRating
);

export default supplierRouter;
=======
    '/me/update-rating',
    supplierController.updateSellerRating
);

export default supplierRouter;
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
