import Joi from 'joi';

export const createProduct = Joi.object({
    productName: Joi.string()
        .trim()
        .min(2)
        .max(255)
        .required()
        .label('Tên sản phẩm'),

    description: Joi.string()
        .trim()
        .max(2000)
        .allow(null, '')
        .label('Mô tả'),

    unitPrice: Joi.number()
        .positive()
        .required()
        .label('Giá sản phẩm'),

    categoryId: Joi.number()
        .integer()
        .positive()
        .required()
        .label('Danh mục'),

    size: Joi.string()
        .trim()
        .max(50)
        .allow(null, '')
        .label('Kích thước'),

    status: Joi.string()
        .valid('Active', 'Sold')
        .default('Active')
        .label('Trạng thái'),
<<<<<<< HEAD
    
=======

>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
    discount: Joi.number()
        .min(0)
        .max(100)
        .default(0)
<<<<<<< HEAD
        .label('Giảm giá')
=======
        .label('Giảm giá (%)')
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
});


export const updateProduct = Joi.object({
    productName: Joi.string()
        .trim()
        .min(2)
        .max(255)
        .label('Tên sản phẩm'),

    description: Joi.string()
        .trim()
        .max(2000)
        .allow(null, '')
        .label('Mô tả'),

    unitPrice: Joi.number()
        .positive()
        .label('Giá sản phẩm'),

    categoryId: Joi.number()
        .integer()
        .positive()
        .label('Danh mục'),

    size: Joi.string()
        .trim()
        .max(50)
        .allow(null, '')
        .label('Kích thước'),

    status: Joi.string()
        .valid('Active', 'Sold')
        .label('Trạng thái'),

    discount: Joi.number()
        .min(0)
        .max(100)
<<<<<<< HEAD
        .label('Giảm giá')
=======
        .label('Giảm giá (%)')
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
}).min(1); // Phải có ít nhất 1 trường để update


export const updateProductStatus = Joi.object({
    status: Joi.string()
        .valid('Active', 'Sold')
        .required()
        .label('Trạng thái')
});


export const searchProducts = Joi.object({
    searchTerm: Joi.string()
        .trim()
        .allow('', null)
<<<<<<< HEAD
        .label('Từ khóa tìm kiếm'),
    categoryId: Joi.number()
        .integer()
        .positive()
        .allow(null)
        .label('Danh mục')
=======
        .label('Từ khóa tìm kiếm')
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
});
