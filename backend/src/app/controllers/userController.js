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
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.user.userId, currentPassword, newPassword);

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
    });
}

export async function uploadAvatar(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Không có file ảnh nào được upload!'
    });
  }

  const imagePath = `public/uploads/${req.file.filename}`;
  await userService.uploadAvatar(req.user.userId, imagePath);

  res.json({
    success: true,
    message: 'Upload avatar thành công!',
    avatarUrl: `/uploads/${req.file.filename}`
  });
}

export async function updateReputationScore(req, res) {
    await userService.updateReputationScore(req.user.userId, req.body.amount);

    res.json({
        success: true,
        message: 'Cập nhật reputation score thành công!'
    });
}

export async function updateGreenCredit(req, res) {
    await userService.updateGreenCredit(req.user.userId, req.body.amount);

    res.json({
        success: true,
        message: 'Cập nhật green credit thành công!'
    });
}

export async function updateDateOfBirth(req, res) {
    await userService.updateDateOfBirth(req.user.userId, req.body.dateOfBirth);

    res.json({
        success: true,
        message: 'Cập nhật ngày sinh thành công!'
    });
}

// THÊM HÀM MỚI: API lấy dashboard data
export async function getDashboardData(req, res) {
    const dashboardData = await userService.getUserDashboardData(req.user.userId);

    res.json({
        success: true,
        data: dashboardData
    });
}
