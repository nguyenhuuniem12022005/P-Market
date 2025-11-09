import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export const buildAvatarUrl = (src) => {
  if (!src || typeof src !== "string") return "/avatar.png";
  const trimmed = src.trim();
  if (/^(https?:|data:)/i.test(trimmed) || trimmed.startsWith("//")) return trimmed;

  const cleaned = trimmed.replace(/^public\//i, "").replace(/^\/+/, "");
  const base = API_URL.replace(/\/$/, "");
  return `${base}/${cleaned}`;
};

// ===================== TOKEN QUẢN LÝ =====================
/**
 * Lưu token vào localStorage.
 */
export const setAuthToken = (token) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("pmarket_token", token);
  }
};

/**
 * Lấy token từ localStorage.
 */
export const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("pmarket_token");
  }
  return null;
};

/**
 * Xóa token và user data khỏi localStorage (khi đăng xuất).
 */
export const removeAuthToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("pmarket_token");
    localStorage.removeItem("pmarket_user");
  }
};

// === HEADER TỰ ĐỘNG THÊM TOKEN ===
/**
 * Tự động tạo header Authorization nếu có token.
 */
function authHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ===================== XỬ LÝ LỖI AXIOS CHUNG =====================
/**
 * Xử lý lỗi tập trung cho các request axios.
 */
function handleAxiosError(error) {
  if (error.response) {
    const message =
      error.response.data.message || `Lỗi API (${error.response.status})`;
    throw new Error(message);
  }
  throw new Error("Yêu cầu mạng thất bại hoặc lỗi không xác định.");
}

// ===================== AUTH API =====================

/**
 * ✅ Đăng ký
 */
export async function registerUser(formData) {
  try {
    const res = await axios.post(`${API_URL}/auth/register`, formData);
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * ✅ Đăng nhập
 * [ĐÃ SỬA] Tự động lưu token và user info vào localStorage.
 */
export async function loginUser(email, password) {
  try {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    const data = res.data;

    if (data.success && data.token) {
      const tokenString = data.token.access_token;
      const userInfo = data.user;
      setAuthToken(tokenString);
      if (typeof window !== "undefined") {
        localStorage.setItem("pmarket_user", JSON.stringify(userInfo));
      }
    }
    return data;
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * ✅ Đăng xuất
 * [ĐÃ SỬA] Tự động xóa token và user info khỏi localStorage.
 */
export async function logoutUser() {
  try {
    const res = await axios.post(
      `${API_URL}/auth/logout`,
      {},
      { headers: authHeader() }
    );
    removeAuthToken();
    return res.data;
  } catch (error) {
    removeAuthToken();
    handleAxiosError(error);
  }
}

// ===================== USER API =====================

/**
 * ✅ Upload avatar
 */
export async function uploadUserAvatar(file) {
  try {
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await axios.patch(
      `${API_URL}/users/me/upload-avatar`,
      formData,
      {
        headers: {
          ...authHeader(),
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * ✅ Cập nhật thông tin người dùng (userName, phone, address)
 */
export async function updateUserProfile(profileData = {}) {
  try {
    const userName = profileData.userName || "";
    const phone = profileData.phone || "";
    const address = profileData.address || "";

    const headers = {
      ...authHeader(),
      "Content-Type": "application/json",
    };

    const results = [];

    if (userName.trim() !== "") {
      const res = await axios.patch(
        `${API_URL}/users/me/update-userName`,
        { userName },
        { headers }
      );
      results.push(res.data);
    }

    if (phone.trim() !== "") {
      const res = await axios.patch(
        `${API_URL}/users/me/update-phone`,
        { phone },
        { headers }
      );
      results.push(res.data);
    }

    if (address.trim() !== "") {
      const res = await axios.patch(
        `${API_URL}/users/me/update-address`,
        { address },
        { headers }
      );
      results.push(res.data);
    }

    if (results.length === 0) {
      return { success: false, message: "Không có dữ liệu nào để cập nhật." };
    }

    return {
      success: true,
      message: "Cập nhật thông tin cá nhân thành công!",
      results,
    };
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * ✅ Đổi mật khẩu
 */
export async function resetPasswordAPI(newPassword) {
  try {
    const res = await axios.patch(
      `${API_URL}/users/me/update-password`,
      { password: newPassword },
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== PRODUCT API =====================
export async function fetchCategories() {
  try {
    const res = await axios.get(`${API_URL}/products/categories`);
    return res.data.data || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function createProduct(productData) {
  try {
    const res = await axios.post(
      `${API_URL}/products/new-product`,
      productData,
      {
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
      },
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getAllProducts(params = {}) {
  try {
    const res = await axios.get(`${API_URL}/products`, { params });
    return {
      items: res.data.data || [],
      meta: res.data.meta || {},
    };
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function searchProducts(params = {}) {
  return getAllProducts(params);
}

export async function getProductById(id) {
  try {
    const res = await axios.get(`${API_URL}/products/${id}`);
    return res.data.product;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function getReviewsByProductId() {
  // Backend chưa có API review -> tạm trả mảng trống
  return [];
}

export async function getUserDashboard() {
  return { reputation: 85, greenCredit: 20 };
}
export async function updateUserDateOfBirth(dateOfBirth) {
  try {
    const res = await axios.patch(
      `${API_URL}/users/me/update-date-of-birth`,
      { dateOfBirth },
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function adjustReputationScore(amount) {
  try {
    const res = await axios.patch(
      `${API_URL}/users/me/update-reputation-score`,
      { amount },
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function adjustGreenCredit(amount) {
  try {
    const res = await axios.patch(
      `${API_URL}/users/me/update-green-credit`,
      { amount },
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}
