import pool from "../../configs/mysql.js";

export async function updateShopName(newShopName){
    await pool.query(`
        update Supplier 
        set shopName = ?    
        `, [newShopName]);
}

export async function updateSellerRating(rating){
    await pool.query(`
        update Supplier 
        set sellerRating = ?
        `, [rating]);
}