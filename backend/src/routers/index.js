<<<<<<< HEAD
﻿import authRouter from './authRouter.js';
import userRouter from './userRouter.js';
import productRouter from './productRouter.js';
import categoryRouter from './categoryRouter.js';
import customerRouter from './customerRouter.js';
import supplierRouter from './supplierRouter.js';
import storeRouter from './storeRouter.js';
import warehouseRouter from './warehouseRouter.js';
import overviewRouter from './overviewRouter.js';
import chatRouter from './chatRouter.js';
import cartRouter from './cartRouter.js';

function route(app){
    app.use('/auth', authRouter);
    app.use('/users', userRouter);
    app.use('/products', productRouter);
    app.use('/categories', categoryRouter);
    app.use('/customers', customerRouter);
    app.use('/suppliers', supplierRouter);
    app.use('/stores', storeRouter);
    app.use('/warehouses', warehouseRouter);
    app.use('/reports', overviewRouter);
    app.use('/chatrooms', chatRouter);
    app.use('/cart', cartRouter);
    
=======
import authRouter from './authRouter';
import userRouter from './userRouter';
import customerRouter from './customerRouter';
import supplierRouter from './supplierRouter';
import productRouter from './productRouter';
import warehouseRouter from './warehouseRouter';
import storeRouter from './storeRouter';

function route(app){
    app.use('/users/', userRouter);
    app.use('/auth/', authRouter);
    app.use('/customers/', customerRouter);
    app.use('/suppliers/', supplierRouter);
    app.use('/products/', productRouter);
    app.use('/warehouses/', warehouseRouter);
    app.use('/stores/', storeRouter);
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
}

export default route;
