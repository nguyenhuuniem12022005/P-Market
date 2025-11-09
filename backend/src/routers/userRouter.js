import { Router } from 'express';
import * as userController from '../app/controllers/userController.js';
import * as userRequest from '../app/requests/userRequest.js';
import validate from '../app/middleware/common/validate.js';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import { upload } from '../app/middleware/uploadMiddleware.js';

const userRouter = Router();

userRouter.use(requireAuthentication);

userRouter.patch(
    '/me/update-password',
    validate(userRequest.resetPassword),
    userController.resetPassword
);

userRouter.patch(
    '/me/upload-avatar',
    upload.single('avatar'),
    userController.uploadAvatar
);

userRouter.patch(
    '/me/update-username',
    validate(userRequest.updateUserName),
    userController.updateUserName
);

userRouter.patch(
    '/me/update-phone',
    validate(userRequest.updatePhone),
    userController.updatePhone
);

userRouter.patch(
    '/me/update-address',
    validate(userRequest.updateAddress),
    userController.updateAddress
);

userRouter.patch(
    '/me/update-date-of-birth',
    validate(userRequest.updateDateOfBirth),
    userController.updateDateOfBirth
);

userRouter.patch(
    '/me/update-reputation-score',
    validate(userRequest.updateAmount),
    userController.updateReputationScore
);

userRouter.patch(
    '/me/update-green-credit',
    validate(userRequest.updateAmount),
    userController.updateGreenCredit
);

export default userRouter;