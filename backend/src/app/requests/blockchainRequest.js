import Joi from 'joi';

export const registerDeveloperApp = Joi.object({
  name: Joi.string().trim().min(3).max(100).required().label('Tên ứng dụng'),
  quota: Joi.number().integer().positive().max(100000).default(1000).label('Quota mỗi ngày'),
  origins: Joi.array().items(Joi.string().uri().trim()).min(1).required().label('Allowed origins'),
});

export const requestGreenCreditSync = Joi.object({
  reason: Joi.string().trim().max(255).allow('', null).label('Lý do đồng bộ'),
});
