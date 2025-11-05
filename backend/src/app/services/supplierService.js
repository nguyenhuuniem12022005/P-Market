import pool from "../../configs/mysql.js";

export async function updateShopName(id, newShopName){
    await pool.query(`
        update Supplier 
        set shopName = ?
        where id = ?    
        `, [newShopName, id]);
}

export async function updateSellerRating(id, rating){
    await pool.query(`
        update Supplier 
        set sellerRating = ?
        where id = ?
        `, [rating, id]);
}