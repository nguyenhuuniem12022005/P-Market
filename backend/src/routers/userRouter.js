import { Router } from 'express';
import * as userController from '../app/controllers/userController.js';
import requireAuthentication from '../app/middleware/common/require-authentication.js';
import validate from '../app/middleware/common/validate.js';
import * as userRequest from '../app/requests/userRequest.js';
import { upload } from '../app/middleware/uploadMiddleware.js';

const userRouter = Router();

userRouter.use(requireAuthentication);

userRouter.post(
    '/me/reset-password',
    validate(userRequest.resetPassword),
    userController.resetPassword
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
<<<<<<< HEAD
    '/me/upload-avatar',
    upload.single('avatar'),
    userController.uploadAvatar
=======
    '/me/update-date-of-birth',
    validate(userRequest.updateDateOfBirth),
    userController.updateDateOfBirth
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29
);

userRouter.patch(
    '/me/update-reputation-score',
    validate(userRequest.updateReputationScore),
    userController.updateReputationScore
);

userRouter.patch(
    '/me/update-green-credit',
    validate(userRequest.updateGreenCredit),
    userController.updateGreenCredit
);
<<<<<<< HEAD

userRouter.patch(
    '/me/update-date-of-birth',
    validate(userRequest.updateDateOfBirth),
    userController.updateDateOfBirth
);

// THÊM ROUTE MỚI
userRouter.get(
    '/me/dashboard',
    userController.getDashboardData
);
=======
>>>>>>> 06406b659bff6749c8c68af1c8cdb76f71717a29

export default userRouter;