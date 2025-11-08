import authRouter from './authRouter';
import userRouter from './userRouter';
import customerRouter from './customerRouter';
import supplierRouter from './supplierRouter';
import productRouter from './productRouter';

function route(app){
    app.use('/users/', userRouter);
    app.use('/auth/', authRouter);
    app.use('/customers/', customerRouter);
    app.use('/suppliers/', supplierRouter);
    app.use('/products/', productRouter);
}

export default route;