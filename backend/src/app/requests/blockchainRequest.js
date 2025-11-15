import Joi from 'joi';

export const registerDeveloperApp = Joi.object({
  name: Joi.string().trim().min(3).max(100).required().label('Tên ứng dụng'),
  quota: Joi.number().integer().positive().max(100000).default(1000).label('Quota mỗi ngày'),
  origins: Joi.array().items(Joi.string().uri().trim()).min(1).required().label('Allowed origins'),
});

export const requestGreenCreditSync = Joi.object({
  reason: Joi.string().trim().max(255).allow('', null).label('Lý do đồng bộ'),
});

export const executeSimpleToken = Joi.object({
  caller: Joi.string().trim().required().label('Caller address'),
  value: Joi.number().integer().min(0).default(0).label('Giá trị HScoin'),
  method: Joi.string().trim().label('Tên hàm'),
  args: Joi.array().default([]).label('Danh sách tham số'),
  inputData: Joi.object({
    function: Joi.string().trim().required(),
    args: Joi.array().default([]),
  }).optional(),
});
