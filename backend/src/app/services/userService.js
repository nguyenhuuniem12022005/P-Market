import bcrypt from 'bcrypt';
import pool from '../../configs/mysql.js';

export async function createUser({ firstName, lastName, userName, email, password }) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const queryText = `
        insert into User (firstName, lastName, userName, email, passwordHash)
        values (?, ?, ?, ?, ?)
    `;
    const [results] = await pool.query(queryText, [firstName, lastName, userName, email, passwordHash]);
    // luon tra ve 1 mang [resultsObject, fieldsObject]

    const insertId = results.insertId;
    const [rows] = await pool.query(`
        select userId, firstName, lastName, userName, email
        from User where userId = ?`
        , [insertId]);
    // tra ve 1 mang [rowsArray, fieldsObject]

    return rows[0];
}

export async function resetPassword(email, password) {
    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash(password, salt);

    await pool.query(`
        update User
        set passwordHash = ?
        where email = ? 
        `, [newPassword, email]);
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
        set reputationScore = least(100, greatest(0, reputationScore + ?))
        where userId = ?
        `, [amount, userId]);
}

export async function updateGreenCredit(userId, amount) {
    await pool.query(`
        update User
        set greenCredit = greatest(0, greenCredit + ?)
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