import pool from "../../configs/mysql.js"; 

// Đăng bài
export async function createProduct(productData, supplierId) {
    const { productName, description, unitPrice, categoryId, size, status, discount } = productData;

    const sql = `
        insert into Product (
            supplierId, categoryId, productName, description, 
            unitPrice, size, status, discount
        )
        values (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [results] = await pool.query(sql, [
        supplierId,
        categoryId,
        productName,
        description || null, // Chuyển undefined/trống thành null
        unitPrice,
        size || null,
        status,
        discount
    ]);

    const insertId = results.insertId;

    const [rows] = await pool.query(`
        select * 
        from Product
        where productId = ?
    `, [insertId]);

    return rows[0];
}

export async function findProducts(productName) {
    const sql = `
        select * from Product
        where productName like ? and status = 'Active'
    `;
    const searchTerm = `%${productName}%`;
    
    const [rows] = await pool.query(sql, [searchTerm]);
    return rows;
}

export async function updateProduct(productId, supplierId, updateData) {
    // Tạo mảng 'fields' chứa các phần của câu lệnh SET 
    const fields = [];
    // Tạo mảng 'params' chứa các giá trị tương ứng
    const params = [];

    // Duyệt qua updateData và thêm trường vào query nếu nó tồn tại (khác undefined)
    if (updateData.productName !== undefined) {
        fields.push("productName = ?");
        params.push(updateData.productName);
    }
    
    if (updateData.description !== undefined) {
        fields.push("description = ?");
        params.push(updateData.description || null);
    }

    if (updateData.unitPrice !== undefined) {
        fields.push("unitPrice = ?");
        params.push(updateData.unitPrice);
    }

    if (updateData.size !== undefined) {
        fields.push("size = ?");
        params.push(updateData.size || null);
    }

    if (updateData.status !== undefined) {
        fields.push("status = ?");
        params.push(updateData.status);
    }

    if (updateData.discount !== undefined) {
        fields.push("discount = ?");
        params.push(updateData.discount);
    }

    if (updateData.categoryId !== undefined){
        fields.push('categoryId = ?');
        params.push(updateData.categoryId);
    }

    // Nếu không có trường nào để cập nhật, dừng lại
    if (fields.length === 0) {
        console.log("Không có trường nào để cập nhật.");
        return;
    }

    // Thêm các tham số cho WHERE (productId và supplierId)
    params.push(productId);
    params.push(supplierId);

    // fields.join(', ') sẽ tự động thêm dấu phẩy
    const sql = `
        update Product 
        set
            ${fields.join(', ')} 
        where 
            productId = ? and supplierId = ? 
    `;

    await pool.query(sql, params);
}

export async function deleteProduct(productId, supplierId) {
    const sql = `
        delete from Product 
        where productId = ? and supplierId = ?
    `;
    
    await pool.query(sql, [productId, supplierId]);
}