import authRouter from './authRouter.js';
import userRouter from './userRouter.js';
import customerRouter from './customerRouter.js';
import productRouter from './productRouter.js';

function route(app){
    app.use('/users/', userRouter);
    app.use('/auth/', authRouter);
    app.use('/customers/', customerRouter);
    app.use('/products/', productRouter);
}

export default route;
