import pool from "../../configs/mysql.js";
import ApiError from "../../utils/classes/api-error.js";

async function ensureSupplier(req, res, next){
    if(!req.user || !req.user.id){
        return next(ApiError.unauthorized('Yêu cầu xác thực người dùng!'));
    }
    try {
        const id = req.user.id;

        const [rows] = await pool.query(`
            select id 
            from Supplier 
            where id = ?    
            `, [id]);

        if(rows.length === 0){
            console.log('Tạo người bán với id =', id);
            const shopName = "shop_" + id + "_" + Math.random().toString(36).substring(2, 6);

            await pool.query(`
                insert into Supplier(id, shopName)
                values (?, ?)
                `[id, shopName]);
        }
        next();
    } catch (error) {
        next(error);
    }
} 

export default ensureSupplier;