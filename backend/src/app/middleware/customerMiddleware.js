import pool from "../../configs/mysql";
import ApiError from "../../utils/classes/api-error";

async function ensureCustomer(req, res, next) {
    if(!req.user || !req.user.id){
        return next(ApiError.unauthorized('Yêu cầu xác thực người dùng!'));
    }
    try {
        const id = req.user.id;
    
        const [rows] = await pool.query(`
            select id
            from Customer
            where id = ?    
            `, [id]);

        // Chưa tồn tại người dùng, cho phép tạo. Nếu tồn tại rồi thì bỏ qua
        if (rows.length === 0) {
            console.log(`Tạo người dùng với id = ${id}`);
            const customerClass = 'D23CQCE04-B';

            await pool.query(`
                insert into Customer(id, class, totalPurchasedOrders)
                values (?, ?, default)
                `, [id, customerClass]);
        }

        next();
    } catch (error) {
        next(error);
    }
}

export default ensureCustomer;