import * as authService from '../services/authService.js';
import * as userService from '../services/userService.js';

// ======================= ĐĂNG KÝ =======================
export async function register(req, res) {
  try {
    const newUser = await authService.register(req.body);
    const tokenInfo = authService.authToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Đăng ký người dùng thành công!',
      user: {
        userId: newUser.userId,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        fullName: `${newUser.firstName || ''} ${newUser.lastName || ''}`.trim(),
        userName: newUser.userName,
        email: newUser.email,
        phone: newUser.phone || '', // Thêm phone
        address: newUser.address || '', // Thêm address
        avatar: newUser.avatar || '/avatar.png',
        referralToken: newUser.referralToken,
        referredByToken: newUser.referredByToken || '',
      },
      token: tokenInfo,
    });
  } catch (error) {
    console.error('[Register Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Đăng ký thất bại!',
    });
  }
}

// ======================= ĐĂNG NHẬP (ĐÃ SỬA) =======================
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const validLogin = await authService.checkValidLogin(email, password);

    if (!validLogin) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng!',
      });
    }

    const tokenInfo = authService.authToken(validLogin);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      user: {
        userId: validLogin.userId,
        firstName: validLogin.firstName,
        lastName: validLogin.lastName,
        fullName: `${validLogin.firstName || ''} ${validLogin.lastName || ''}`.trim(),
        userName: validLogin.userName,
        email: validLogin.email,
        // ✅ THÊM CÁC TRƯỜNG PHONE VÀ ADDRESS
        phone: validLogin.phone || '', 
        address: validLogin.address || '', 
        avatar: validLogin.avatar || '/avatar.png',
        referralToken: validLogin.referralToken,
        referredByToken: validLogin.referredByToken || '',
      },
      token: tokenInfo,
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Đăng nhập thất bại!',
    });
  }
}

// ======================= ĐĂNG XUẤT =======================
export async function logout(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (token) authService.blockToken(token);

    res.json({
      success: true,
      message: 'Thoát đăng nhập thành công!',
    });
  } catch (error) {
    console.error('[Logout Error]', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đăng xuất!',
    });
  }
}

// ======================= ĐỔI MẬT KHẨU =======================
export async function resetPassword(req, res) {
  try {
    const { email } = req.params;
    const { password } = req.body;

    await userService.resetPassword(email, password);

    res.json({
      success: true,
      message: 'Thay đổi mật khẩu thành công!',
    });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Không thể thay đổi mật khẩu!',
    });
  }
}
