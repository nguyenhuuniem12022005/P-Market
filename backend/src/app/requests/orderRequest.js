import Joi from 'joi';

export const createEscrowOrder = Joi.object({
  productId: Joi.number().integer().positive().required().label('Sản phẩm'),
  quantity: Joi.number().integer().min(1).max(50).default(1).label('Số lượng'),
  walletAddress: Joi.string().trim().required().label('Địa chỉ ví HScoin'),
  shippingAddress: Joi.string().trim().allow('', null).label('Địa chỉ giao hàng'),
});
