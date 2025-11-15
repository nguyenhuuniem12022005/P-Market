import { Router } from 'express';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import * as orderController from '../app/controllers/orderController.js';

const orderRouter = Router();

orderRouter.use(requireAuthentication);

orderRouter.get('/me', orderController.listMyOrders);
orderRouter.get('/me/escrow', orderController.listMyEscrowEvents);
orderRouter.get('/:orderId', orderController.getOrder);
orderRouter.post('/:orderId/complete', orderController.markCompleted);
orderRouter.post('/:orderId/cancel', orderController.markCancelled);

export default orderRouter;
