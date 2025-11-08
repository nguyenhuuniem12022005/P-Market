import pool from "../../configs/mysql.js";

export async function createWarehouse(data) {
    const { warehouseName, capacity } = data;
    const sql = `
        insert into Warehouse (warehouseName, capacity)
        values (?, ?)
    `;
    const [result] = await pool.query(sql, [warehouseName, capacity || null]);

    const [rows] = await pool.query(
        `select * 
        from Warehouse
        where warehouseId = ?`,
        [result.insertId]
    );
    return rows[0];
}

export async function updateWarehouse(warehouseId, updateData) {
    // (Sử dụng logic cập nhật động để tránh ghi đè 'undefined')
    const fields = [];
    const params = [];

    if (updateData.warehouseName !== undefined) {
        fields.push("warehouseName = ?");
        params.push(updateData.warehouseName);
    }
    if (updateData.capacity !== undefined) {
        fields.push("capacity = ?");
        params.push(updateData.capacity || null);
    }

    if (fields.length === 0) return; // Không có gì để cập nhật

    params.push(warehouseId);
    const sql = `
        update Warehouse 
        set ${fields.join(', ')}
        where warehouseId = ?
    `;
    await pool.query(sql, params);
}

export async function deleteWarehouse(warehouseId) {
    await pool.query(`
        delete from Warehouse 
        where warehouseId = ?
        `, [warehouseId]);
}