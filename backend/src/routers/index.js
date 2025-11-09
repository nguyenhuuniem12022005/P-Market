import authRouter from './authRouter.js';
import userRouter from './userRouter.js';
import productRouter from './productRouter.js';
import categoryRouter from './categoryRouter.js';
import customerRouter from './customerRouter.js';
import supplierRouter from './supplierRouter.js';
import storeRouter from './storeRouter.js';
import warehouseRouter from './warehouseRouter.js';

function route(app){
    app.use('/auth', authRouter);
    app.use('/users', userRouter);
    app.use('/products', productRouter);
    app.use('/categories', categoryRouter);
    app.use('/customers', customerRouter);
    app.use('/suppliers', supplierRouter);
    app.use('/stores', storeRouter);
    app.use('/warehouses', warehouseRouter);
    
}

export default route;
