import authRouter from './authRouter';
import userRouter from './userRouter';
import customerRouter from './customerRouter';

function route(app){
    app.use('/users/', userRouter);
    app.use('/auth/', authRouter);
    app.use('/customer/', customerRouter);
}

export default route;