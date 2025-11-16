import * as orderService from '../services/orderService.js';

export async function createEscrowOrder(req, res, next) {
  try {
    const payload = {
      customerId: req.user?.userId,
      productId: Number(req.body.productId),
      quantity: req.body.quantity,
      walletAddress: req.body.walletAddress,
      shippingAddress: req.body.shippingAddress,
    };
    const data = await orderService.createEscrowOrder(payload);
    return res.status(201).json({
      success: true,
      message:
        data.hscoinStatus === 'QUEUED'
          ? 'Đã tạo đơn hàng và xếp hàng burn HScoin. Hệ thống sẽ thử lại tự động.'
          : 'Đã tạo đơn hàng và burn HScoin thành công.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function markCompleted(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const data = await orderService.markOrderCompleted(orderId, { triggerReferral: true });
    return res.status(200).json({
      success: true,
      message: 'Đơn hàng đã được đánh dấu hoàn tất và xử lý thưởng referral.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function markCancelled(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const data = await orderService.markOrderCancelled(orderId);
    return res.status(200).json({
      success: true,
      message: 'Đơn hàng đã bị hủy.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getOrder(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    const data = await orderService.getOrderDetail(orderId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listMyOrders(req, res, next) {
  try {
    const data = await orderService.listOrdersForCustomer(req.user?.userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listMyEscrowEvents(req, res, next) {
  try {
    const data = await orderService.listEscrowEventsForUser(req.user?.userId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}
