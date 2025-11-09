import * as userService from '../services/userService.js';

export async function createUser(req, res) {
    const newUser = await userService.createUser(req.body);

    res.status(201).json({
        success: true,
        message: 'Tạo người dùng thành công!',
        user: {
            fullName: newUser.lastName + " " + newUser.firstName,
            userName: newUser.userName,
        }
    });
}

export async function resetPassword(req, res) {
    const email = req.user.email;
    const { password } = req.body;
    await userService.resetPassword(email, password);

    res.json({
        success: true,
        message: 'Thay đổi mật khẩu thành công!'
    });
}

export async function updateUserName(req, res) {
    await userService.updateUserName(req.user.userId, req.body.userName);

    res.json({
        success: true,
        message: 'Cập nhật UserName thành công!'
    })
}

export async function updatePhone(req, res) {
    await userService.updatePhone(req.user.userId, req.body.phone);

    res.json({
        success: true,
        message: 'Cập nhật số điện thoại thành công!'
    });
}

export async function updateAddress(req, res) {
    await userService.updateAddress(req.user.userId, req.body.address);

    res.json({
        success: true,
        message: 'Cập nhật địa chỉ thành công!'
    })
}

export async function uploadAvatar(req, res) {
  const userId = req.user.userId;
  const imagePath = `public/uploads/${req.file.filename}`;
  await userService.uploadAvatar(userId, imagePath);

  const cleanPath = imagePath.replace(/^public\//, '');
  res.json({
    success: true,
    message: 'Cập nhật ảnh thành công!',
    data: { avatar: cleanPath },
    imagePath: cleanPath, // nếu muốn giữ key cũ ở frontend
  });
}

export async function updateReputationScore(req, res) {
    const userId = req.user.userId;
    const { amount } = req.body;

    await userService.updateReputationScore(userId, amount);
    res.json({
        success: true,
        message: 'Cập nhật điểm uy tín thành công!'
    });
}

export async function updateGreenCredit(req, res) {
    const userId = req.user.userId;
    const { amount } = req.body;

    await userService.updateGreenCredit(userId, amount);
    res.json({
        success: true,
        message: 'Cập nhật Green Credit thành công!'
    });
}

export async function updateDateOfBirth(req, res) {
    const userId = req.user.userId;
    const { dateOfBirth } = req.body;

    await userService.updateDateOfBirth(userId, dateOfBirth);
    res.json({
        success: true,
        message: 'Cập nhật ngày tháng năm sinh thành công!'
    });
}