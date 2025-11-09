import pool from "../../configs/mysql.js";

export async function updateClass(id, newClass) {
    await pool.query(`
        update Customer 
        set class = ?
        where id = ?    
        `, [newClass, id]);
}

export async function updateTotalPurchasedOrders(id, amount) {
    await pool.query(`
        update Customer
        set totalPurchasedOrders = totalPurchasedOrders + ?
        where id = ?
        `, [amount, id]);
}