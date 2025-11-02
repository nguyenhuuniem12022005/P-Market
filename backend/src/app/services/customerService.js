import pool from "../../configs/mysql";

export async function createCustomer(id, customerClass = 'D23CQCE04-B') {
    await pool.query(`
        insert into Customer(id, class, totalPurchasedOrders, reputationScore, greenCredit, isGreenSeller)
        values (?, ?, default, default, default, default)
        `, [id, customerClass]);
}

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

export async function updateReputationScore(id, amount) {
    await pool.query(`
        update Customer 
        set reputationScore = least(100, greatest(0, reputationScore + ?))
        where id = ?
        `, [amount, id]);
}

export async function updateGreenCredit(id, amount) {
    await pool.query(`
        update Customer
        set greenCredit = greatest(0, greenCredit + ?)
        where id = ?
        `, [amount, id]);
}

export async function updateGreenStatus(id, status) {
    await pool.query(`
        update Customer
        set isGreenSeller = ?
        where id = ?
        `, [status, id]);
}