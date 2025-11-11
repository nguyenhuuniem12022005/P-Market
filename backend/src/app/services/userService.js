import bcrypt from 'bcrypt';
import ApiError from '../../utils/classes/api-error.js';
import pool from '../../configs/mysql.js';

export async function createUser({ firstName, lastName, userName, email, password }) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const queryText = `
        insert into User (firstName, lastName, userName, email, passwordHash)
        values (?, ?, ?, ?, ?)
    `;
    const [results] = await pool.query(queryText, [firstName, lastName, userName, email, passwordHash]);

    const insertId = results.insertId;
    const [rows] = await pool.query(`
        select userId, firstName, lastName, userName, email
        from User where userId = ?`
        , [insertId]);

    return rows[0];
}

export async function changePassword(userId, currentPassword, newPassword) {
    const [rows] = await pool.query(`
        select userId, passwordHash
        from User
        where userId = ?
    `, [userId]);

    if (rows.length === 0) {
        throw ApiError.notFound('Không tìm thấy người dùng');
    }

    const { passwordHash: existingHash } = rows[0];
    const isMatch = await bcrypt.compare(currentPassword, existingHash);

    if (!isMatch) {
        throw ApiError.badRequest('Mật khẩu hiện tại không chính xác');
    }

    const isSamePassword = await bcrypt.compare(newPassword, existingHash);
    if (isSamePassword) {
        throw ApiError.badRequest('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    const salt = await bcrypt.genSalt(10);
    const nextHash = await bcrypt.hash(newPassword, salt);

    await pool.query(`
        update User 
        set passwordHash = ?
        where userId = ?
    `, [nextHash, userId]);
}

export async function resetPassword(email, password) {
    const [rows] = await pool.query(`
        select userId
        from User
        where email = ?
    `, [email]);

    if (rows.length === 0) {
        throw ApiError.notFound('Không tìm thấy người dùng');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await pool.query(`
        update User 
        set passwordHash = ?
        where email = ?
    `, [passwordHash, email]);
}

export async function updateUserName(userId, userName) {
    await pool.query(`
        update User 
        set userName = ?
        where userId = ?    
        `, [userName, userId]);
}

export async function updatePhone(userId, phone) {
    await pool.query(`
        update User 
        set phone = ?
        where userId = ?    
        `, [phone, userId]);
}

export async function updateAddress(userId, address) {
    await pool.query(`
        update User 
        set address = ?
        where userId = ?    
        `, [address, userId]);
}

export async function uploadAvatar(userId, imagePath) {
    await pool.query(`
        update User 
        set avatar = ?
        where userId = ?    
        `, [imagePath, userId]);
}

export async function updateReputationScore(userId, amount) {
    await pool.query(`
        update User 
        set reputationScore = reputationScore + ?
        where userId = ?    
        `, [amount, userId]);
}

export async function updateGreenCredit(userId, amount) {
    await pool.query(`
        update User 
        set greenCredit = greenCredit + ?
        where userId = ?    
        `, [amount, userId]);
}

export async function updateDateOfBirth(userId, dateOfBirth) {
    await pool.query(`
        update User 
        set dateOfBirth = ?
        where userId = ?    
        `, [dateOfBirth, userId]);
}

// THÊM HÀM MỚI: Lấy thông tin dashboard
export async function getUserDashboardData(userId) {
    // Lấy thông tin user
    const [userRows] = await pool.query(`
        SELECT u.*, 
               (SELECT COUNT(*) FROM Customer WHERE customerId = u.userId) as isCustomer,
               (SELECT COUNT(*) FROM Supplier WHERE supplierId = u.userId) as isSupplier
        FROM User u
        WHERE u.userId = ?
    `, [userId]);
    
    const user = userRows[0];
    const isPTIT = user.email.endsWith('@stu.ptit.edu.vn') || user.email.endsWith('@ptit.edu.vn');
    
    // Lấy sản phẩm đã bán (nếu là Supplier)
    const [soldProducts] = await pool.query(`
        SELECT p.*, od.quantity, od.unitPrice, so.orderDate, so.status,
               c.class as customerClass, u.email as customerEmail
        FROM Product p
        JOIN OrderDetail od ON p.productId = od.productId
        JOIN SalesOrder so ON od.salesOrderId = so.salesOrderId
        JOIN Customer c ON so.customerId = c.customerId
        JOIN User u ON c.customerId = u.userId
        WHERE p.supplierId = ?
        ORDER BY so.orderDate DESC
    `, [userId]);
    
    // Lấy sản phẩm đã mua (nếu là Customer)
    let purchasedProducts = [];
    if (isPTIT && user.isCustomer > 0) {
        const [purchased] = await pool.query(`
            SELECT p.*, od.quantity, od.unitPrice, so.orderDate, so.status,
                   s.shopName, u.userName as sellerName, u.email as sellerEmail
            FROM SalesOrder so
            JOIN OrderDetail od ON so.salesOrderId = od.salesOrderId
            JOIN Product p ON od.productId = p.productId
            JOIN Supplier s ON p.supplierId = s.supplierId
            JOIN User u ON s.supplierId = u.userId
            WHERE so.customerId = ?
            ORDER BY so.orderDate DESC
        `, [userId]);
        purchasedProducts = purchased;
    }
    
    return {
        user: {
            userId: user.userId,
            userName: user.userName,
            email: user.email,
            reputationScore: user.reputationScore,
            greenCredit: user.greenCredit,
            isPTIT,
            isCustomer: user.isCustomer > 0,
            isSupplier: user.isSupplier > 0
        },
        soldProducts,
        purchasedProducts
        
    };
}
