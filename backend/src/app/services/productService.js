import pool from "../../configs/mysql.js"; 

// Đăng bài
export async function createProduct(productData, supplierId) {
<<<<<<< HEAD
    const { productName, description, imageURL, unitPrice, categoryId, size, status, discount } = productData;

    const sql = `
        insert into Product (
            supplierId, categoryId, productName, description, imageURL,
            unitPrice, size, status, discount
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
=======
    const { productName, description, unitPrice, categoryId, size, status, discount } = productData;

    const sql = `
        insert into Product (
            supplierId, categoryId, productName, description, 
            unitPrice, size, status, discount
        )
        values (?, ?, ?, ?, ?, ?, ?, ?)
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
    `;

    const [results] = await pool.query(sql, [
        supplierId,
        categoryId,
        productName,
<<<<<<< HEAD
        description || null,
        imageURL || null,
        unitPrice,
        size || null,
        status || 'Draft',
=======
        description || null, // Chuyển undefined/trống thành null
        unitPrice,
        size || null,
        status || 'Active',
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
        discount || 0
    ]);

    const insertId = results.insertId;

    const [rows] = await pool.query(`
        select * 
        from Product
        where productId = ?
    `, [insertId]);

    return rows[0];
}

<<<<<<< HEAD
export async function searchProducts(searchTerm, categoryId = null) {
    let baseSql = `
        select p.*, s.shopName, s.sellerRating, u.userName, u.avatar as sellerAvatar, u.reputationScore, c.categoryName
        from Product p
        join Supplier s on p.supplierId = s.supplierId
        join User u on s.supplierId = u.userId
        left join Category c on p.categoryId = c.categoryId
        where p.status = 'Active'
    `;
    
    const params = [];
    
    if (searchTerm && searchTerm.trim() !== '') {
        baseSql += ` and (p.productName like ? or u.userName like ? or c.categoryName like ?)`;
        const likeTerm = `%${searchTerm}%`;
        params.push(likeTerm, likeTerm, likeTerm);
    }
    
    if (categoryId) {
        baseSql += ` and p.categoryId = ?`;
        params.push(categoryId);
    }
    
    const finalSql = `
        select wrapped.*
        from (
            select base.*, coalesce(inv.totalQuantity, 0) as totalQuantity
            from (
                ${baseSql}
            ) as base
            left join (
                select productId, sum(quantity) as totalQuantity
                from Store
                group by productId
            ) inv on inv.productId = base.productId
        ) wrapped
        where wrapped.totalQuantity > 0
        order by wrapped.productId desc
    `;
    
    const [rows] = await pool.query(finalSql, params);
=======
export async function uploadImage(productId, imagePath) {
    await pool.query(`
        update Product
        set imageURL = ? 
        where productId = ?
        `, [imagePath, productId]);
}

export async function searchProducts(searchTerm) {
    const sql = `
        select p.*, s.shopName, u.userName 
        from Product p
        join Supplier s on p.supplierId = s.supplierId
        join User u on s.supplierId = u.userId
        where 
            (p.productName like ? or u.userName like ?)
            and p.status = 'Active'
    `;
    
    const likeTerm = `%${searchTerm}%`;
    
    const [rows] = await pool.query(sql, [likeTerm, likeTerm]);
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
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

<<<<<<< HEAD
    if (updateData.imageURL !== undefined) {
        fields.push("imageURL = ?");
        params.push(updateData.imageURL || null);
    }

=======
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
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

export async function updateProductStatus(productId, supplierId, status) {
    const sql = `
        update Product 
        set status = ?
        where productId = ? and supplierId = ? 
    `;

    await pool.query(sql, [status, productId, supplierId]);
}

export async function deleteProduct(productId, supplierId) {
    const sql = `
        delete from Product 
        where productId = ? and supplierId = ?
    `;
    
    await pool.query(sql, [productId, supplierId]);
<<<<<<< HEAD
}

export async function getProductById(productId) {
    const [products] = await pool.query(`
        select 
            p.*, 
            s.shopName, 
            s.sellerRating,
            u.userName, 
            u.avatar as sellerAvatar, 
            u.reputationScore,
            u.phone,
            u.address,
            c.categoryName
        from Product p
        join Supplier s on p.supplierId = s.supplierId
        join User u on s.supplierId = u.userId
        left join Category c on p.categoryId = c.categoryId
        where p.productId = ? and p.status = 'Active'
    `, [productId]);

    if (products.length === 0) {
        return null;
    }

    const product = products[0];

    const [stocks] = await pool.query(`
        select st.productId, st.warehouseId, st.quantity, w.warehouseName
        from Store st
        join Warehouse w on st.warehouseId = w.warehouseId
        where st.productId = ?
    `, [productId]);

    const [totalRows] = await pool.query(`
        select coalesce(sum(quantity), 0) as totalQuantity
        from Store
        where productId = ?
    `, [productId]);

    const seller = {
        supplierId: product.supplierId,
        shopName: product.shopName,
        sellerRating: product.sellerRating,
        userName: product.userName,
        avatar: product.sellerAvatar,
        reputationScore: product.reputationScore,
        phone: product.phone,
        address: product.address
    };

    delete product.sellerAvatar;

    return {
        ...product,
        seller,
        stores: stocks,
        totalQuantity: totalRows[0]?.totalQuantity || 0
    };
}

export async function activateProduct(productId) {
    await pool.query(`
        update Product
        set status = 'Active'
        where productId = ?
    `, [productId]);
}
=======
}
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
