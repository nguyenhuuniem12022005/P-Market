import pool from "../../configs/mysql.js";
import validator from 'validator';
import ApiError from "../../utils/classes/api-error.js";

async function checkProductAndWarehouseExist(req, res, next) {
    const { productId, warehouseId } = req.body;

    const pId = productId;
    const wId = warehouseId;

    if(!pId || !validator.isInt(pId, {min:1})){
        return next(ApiError.badRequest('ID của Product không hợp lệ!'));
    }

    if(!wId || !validator.isInt(wId, {min: 1})){
        return next(ApiError.badRequest('ID của Warehouse không hợp lệ'));
    }

    const [rowsP] = await pool.query(`
        select * 
        from Product
        where productId = ?    
        `, [pId]);
    
    if(rowsP.length === 0){
        return next(ApiError.notFound('Không tìm thấy ID trong Product'));
    }

    const [rowsW] = await pool.query(`
        select * 
        from Warehouse
        where warehouseId = ?`
        , [wId]);
    
    if(rowsW.length === 0){
        return next(ApiError.notFound('Không tìm thấy ID trong Warehouse'));
    }

    return next();
}

export default checkProductAndWarehouseExist;