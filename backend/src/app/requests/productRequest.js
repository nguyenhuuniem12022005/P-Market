import Joi from 'joi';

// Schema để validate khi tạo sản phẩm
export const createProduct = Joi.object({
    productName: Joi.string()
        .trim()
        .min(3)
        .max(255)
        .required()
        .label('Tên sản phẩm'),
    
    categoryId: Joi.number()
        .integer()
        .positive() // ID phải là số dương
        .required()
        .label('ID Danh mục'),
    
    description: Joi.string()
        .trim()
        .allow('') // Cho phép mô tả rỗng
        .optional()
        .label('Mô tả'),
        
    unitPrice: Joi.number()
        .positive() // Giá phải lớn hơn 0
        .required()
        .label('Giá'),
        
    size: Joi.string()
        .trim()
        .allow('')
        .optional(),
        
    status: Joi.string()
        .valid('Active', 'Sold') // Chỉ cho phép 2 giá trị này
        .optional()
        .default('Active'),
        
    discount: Joi.number()
        .min(0) // Giảm giá không thể âm
        .optional()
        .default(0)
});

// Schema để validate khi cập nhật sản phẩm
export const updateProduct = Joi.object({
    // Các trường đều là 'optional' khi cập nhật
    productName: Joi.string().trim().min(3).max(255).optional().label('Tên sản phẩm'),
    categoryId: Joi.number().integer().positive().optional().label('ID Danh mục'),
    description: Joi.string().trim().allow('').optional().label('Mô tả'),
    unitPrice: Joi.number().positive().optional().label('Giá'),
    size: Joi.string().trim().allow('').optional(),
    status: Joi.string().valid('Active', 'Sold').optional(),
    discount: Joi.number().min(0).optional()
}).min(1); // Yêu cầu phải có ít nhất 1 trường để cập nhật

export const updateProductStatus = Joi.object({
    status: Joi.string()
        .valid('Active', 'Sold') // Chỉ cho phép 2 giá trị này
        .required()
        .label('Trạng thái')
});