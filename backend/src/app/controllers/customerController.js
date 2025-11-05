import * as customerService from '../services/customerService.js';

export async function updateClass(req, res) {
    const id = req.user.id;
    const { newClass } = req.body;

    await customerService.updateClass(id, newClass);
    res.json({
        success: true,
        message: 'Cập nhật lớp người dùng thành công!',
    });
}

export async function updateTotalPurchasedOrders(req, res) {
    const id = req.user.id;
    const { amount } = req.body;

    await customerService.updateTotalPurchasedOrders(id, amount);
    res.json({
        success: true,
        message: 'Cập nhập số lượng hàng đã mua thành công!'
    });
}