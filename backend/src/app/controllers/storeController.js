import * as storeService from '../services/storeService.js';
<<<<<<< HEAD
import * as productService from '../services/productService.js';
=======
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29

export async function createStore(req, res) {
    const { productId, warehouseId, quantity } = req.body;

<<<<<<< HEAD
    const store = await storeService.createStore({
        productId: Number(productId),
        warehouseId: Number(warehouseId),
        quantity: Number(quantity)
    });

    await productService.activateProduct(Number(productId));
=======
    const store = await storeService.createStore(productId, warehouseId, quantity);
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29

    res.json({ 
        success: true, 
        message: 'Thêm sản phẩm vào kho thành công!',
        store: store
    });
}

export async function setQuantity(req, res) {
    const { productId, warehouseId, quantity } = req.body;

    await storeService.setQuantity(productId, warehouseId, quantity);

    res.json({ 
        success: true, 
        message: 'Cập nhật số lượng (ghi đè) thành công!' 
    });
}

export async function updateQuantity(req, res) {
    const { productId, warehouseId, amount } = req.body;

    await storeService.updateQuantity(productId, warehouseId, amount);

    res.json({ 
        success: true, 
        message: 'Điều chỉnh số lượng thành công!' 
    });
}

export async function deleteStore(req, res) {
    const { productId, warehouseId } = req.body;

    await storeService.deleteStore(productId, warehouseId);

    res.json({ 
        success: true, 
        message: 'Xóa sản phẩm khỏi kho thành công!' 
    });
}
