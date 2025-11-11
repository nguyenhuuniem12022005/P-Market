<<<<<<< HEAD
import pool from "../../configs/mysql.js";
=======
import pool from "../../configs/mysql";
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
import validator from 'validator';
import ApiError from "../../utils/classes/api-error.js";

async function checkProductAndWarehouseExist(req, res, next) {
    const { productId, warehouseId } = req.body;

<<<<<<< HEAD
    const productIdStr = productId !== undefined ? String(productId) : '';
    const warehouseIdStr = warehouseId !== undefined ? String(warehouseId) : '';

    if(!productIdStr || !validator.isInt(productIdStr, {min:1})){
        return next(ApiError.badRequest('ID của Product không hợp lệ!'));
    }

    if(!warehouseIdStr || !validator.isInt(warehouseIdStr, {min: 1})){
        return next(ApiError.badRequest('ID của Warehouse không hợp lệ'));
    }

    const numericProductId = Number(productIdStr);
    const numericWarehouseId = Number(warehouseIdStr);

=======
    const pId = productId;
    const wId = warehouseId;

    if(!pId || !validator.isInt(pId, {min:1})){
        return next(ApiError.badRequest('ID của Product không hợp lệ!'));
    }

    if(!wId || !validator.isInt(wId, {min: 1})){
        return next(ApiError.badRequest('ID của Warehouse không hợp lệ'));
    }

>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
    const [rowsP] = await pool.query(`
        select * 
        from Product
        where productId = ?    
<<<<<<< HEAD
        `, [numericProductId]);
=======
        `, [pId]);
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
    
    if(rowsP.length === 0){
        return next(ApiError.notFound('Không tìm thấy ID trong Product'));
    }

    const [rowsW] = await pool.query(`
        select * 
        from Warehouse
        where warehouseId = ?`
<<<<<<< HEAD
        , [numericWarehouseId]);
=======
        , [wId]);
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
    
    if(rowsW.length === 0){
        return next(ApiError.notFound('Không tìm thấy ID trong Warehouse'));
    }

<<<<<<< HEAD
    req.body.productId = numericProductId;
    req.body.warehouseId = numericWarehouseId;

    return next();
}

export default checkProductAndWarehouseExist;
=======
    return next();
}

export default checkProductAndWarehouseExist;
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
