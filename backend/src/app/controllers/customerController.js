import * as customerService from '../services/customerService.js';

export async function updateClass(req, res) {
    const id = req.params.id;
    const { newClass } = req.body;

    await customerService.updateClass(id, newClass);
    res.json({
        success: true,
        message: 'Cập nhật lớp người dùng thành công!',
    });
}

export async function updateTotalPurchasedOrders(req, res) {
    const id = req.params.id;
    const { amount } = req.body;

    await customerService.updateTotalPurchasedOrders(id, amount);
    res.json({
        success: true,
        message: 'Cập nhập số lượng hàng đã mua thành công!'
    });
}

export async function updateReputationScore(req, res){
    const id = req.params.id;
    const {amount} = req.body;

    await customerService.updateReputationScore(id, amount);
    res.json({
        success: true,
        message: 'Cập nhật điểm uy tín thành công!'
    });
}

export async function updateGreenCredit(req, res){
    const id = req.params.id;
    const {amount} = req.body;

    await customerService.updateGreenCredit(id, amount);
    res.json({
        success: true,
        message: 'Cập nhật Green Credit thành công!'
    });
}

export async function updateGreenStatus(req, res){
    const id = req.params.id;
    const {status} = req.body; // true or false

    await customerService.updateGreenStatus(id, status);
    res.json({
        success: true,
        message: 'Cập nhật trạng thái Green thành công!'
    });
}