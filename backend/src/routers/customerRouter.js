import {Router} from 'express';
import * as customerController from '../app/controllers/customerController.js';
import ensureCustomer from '../app/middleware/customerMiddleware.js';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import validate from '../app/middleware/common/validate.js';
import * as customerRequest from '../app/requests/customerRequest.js';

const customerRouter = Router();
customerRouter.use(requireAuthentication);
customerRouter.use(ensureCustomer);

customerRouter.patch('/')