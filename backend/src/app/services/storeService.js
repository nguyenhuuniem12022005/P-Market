import pool from "../../configs/mysql.js"; 

export async function createStore(productId, warehouseId, quantity) {
    await pool.query(`
        insert into Store (productId, warehouseId, quantity)
        values (?, ?, ?)
    `, [productId, warehouseId, quantity]);

    const sql = `
        select 
            p.*,
            s.quantity,
            w.warehouseId,
            w.warehouseName
        from Store s
        join Product p on s.productId = p.productId
        join Warehouse w on s.warehouseId = w.warehouseId
        where s.productId = ?
        order by w.warehouseName;
    `;
    const [rows] = await pool.query(sql, [productId]);
    return rows;
}

export async function setQuantity(productId, warehouseId, quantity) {
    await pool.query(`
        update Store
        set quantity = ?
        where productId = ? and warehouseId = ?
    `, [quantity, productId, warehouseId]);
}

export async function updateQuantity(productId, warehouseId, amount) {
    const sql = `
        update Store
        set quantity = greatest(0, quantity + ?)
        where productId = ? and warehouseId = ?
    `;
    await pool.query(sql, [amount, productId, warehouseId]);
}

export async function deleteStore(productId, warehouseId) {
    const sql = `
        delete from Store 
        where productId = ? and warehouseId = ?
    `;
    await pool.query(sql, [productId, warehouseId]);
}