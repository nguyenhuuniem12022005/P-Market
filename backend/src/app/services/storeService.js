<<<<<<< HEAD
import pool from "../../configs/mysql.js";

export async function createStore({ productId, warehouseId, quantity }) {
    const sql = `
        INSERT INTO Store (productId, warehouseId, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + ?
    `;
    
    await pool.query(sql, [productId, warehouseId, quantity, quantity]);

    const [rows] = await pool.query(
        `
            SELECT s.*, w.warehouseName
            FROM Store s
            JOIN Warehouse w ON s.warehouseId = w.warehouseId
            WHERE s.productId = ? AND s.warehouseId = ?
        `,
        [productId, warehouseId]
    );

    return rows[0] || null;
}

export async function updateQuantity(productId, warehouseId, quantity) {
    const sql = `
        UPDATE Store
        SET quantity = ?
        WHERE productId = ? AND warehouseId = ?
    `;
    
    await pool.query(sql, [quantity, productId, warehouseId]);
}

export async function getStoreByProduct(productId) {
    const [rows] = await pool.query(`
        SELECT s.*, w.warehouseName
        FROM Store s
        JOIN Warehouse w ON s.warehouseId = w.warehouseId
        WHERE s.productId = ?
    `, [productId]);
    
    return rows;
}
=======
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
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
