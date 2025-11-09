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

// ===================== TOKEN QUáº¢N LĂ =====================
/**
 * LÆ°u token vĂ o localStorage.
 */
export const setAuthToken = (token) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("pmarket_token", token);
  }
};

/**
 * Láº¥y token tá»« localStorage.
 */
export const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("pmarket_token");
  }
  return null;
};

/**
 * XĂ³a token vĂ  user data khá»i localStorage (khi Ä‘Äƒng xuáº¥t).
 */
export const removeAuthToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("pmarket_token");
    localStorage.removeItem("pmarket_user");
  }
};

// === HEADER Tá»° Äá»˜NG THĂM TOKEN ===
/**
 * Tá»± Ä‘á»™ng táº¡o header Authorization náº¿u cĂ³ token.
 */
function authHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ===================== Xá»¬ LĂ Lá»–I AXIOS CHUNG =====================
/**
 * Xá»­ lĂ½ lá»—i táº­p trung cho cĂ¡c request axios.
 */
function handleAxiosError(error) {
  if (error.response) {
    const message =
      error.response.data.message || `Lá»—i API (${error.response.status})`;
    throw new Error(message);
  }
  throw new Error("YĂªu cáº§u máº¡ng tháº¥t báº¡i hoáº·c lá»—i khĂ´ng xĂ¡c Ä‘á»‹nh.");
}

// ===================== AUTH API =====================

/**
 * âœ… ÄÄƒng kĂ½
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
 * âœ… ÄÄƒng nháº­p
 * [ÄĂƒ Sá»¬A] Tá»± Ä‘á»™ng lÆ°u token vĂ  user info vĂ o localStorage.
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
 * âœ… ÄÄƒng xuáº¥t
 * [ÄĂƒ Sá»¬A] Tá»± Ä‘á»™ng xĂ³a token vĂ  user info khá»i localStorage.
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
 * âœ… Upload avatar
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
 * âœ… Cáº­p nháº­t thĂ´ng tin ngÆ°á»i dĂ¹ng (userName, phone, address)
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
      return { success: false, message: "KhĂ´ng cĂ³ dá»¯ liá»‡u nĂ o Ä‘á»ƒ cáº­p nháº­t." };
    }

    return {
      success: true,
      message: "Cáº­p nháº­t thĂ´ng tin cĂ¡ nhĂ¢n thĂ nh cĂ´ng!",
      results,
    };
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * âœ… Äá»•i máº­t kháº©u
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

/**
 * L?y t?t c? s?n ph?m (g?n đây nh?t)
 */

/**
 * L?y chi ti?t s?n ph?m theo ID
 */
export async function getProductById(productId) {
  try {
    const res = await axios.get(
      `${API_URL}/products/${productId}`,
      { headers: authHeader() }
    );
    return res.data.product || null;
  } catch (error) {
    console.error('Error fetching product details:', error);
    return null;
  }
}

/**
 * L?y danh sách đánh giá c?a s?n ph?m (mock data - s? tích h?p API th?c sau)
 */
export async function getReviewsByProductId(productId) {
  // TODO: Tích h?p API th?c khi backend có endpoint reviews
  return [
    {
      id: 1,
      userName: 'Nguy?n Văn A',
      rating: 5,
      comment: 'S?n ph?m r?t t?t, đúng như mô t?!',
      createdAt: '2024-01-15',
      avatar: '/avatar.png'
    },
    {
      id: 2,
      userName: 'Tr?n Th? B',
      rating: 4,
      comment: 'Ch?t lư?ng ?n, giao hàng nhanh.',
      createdAt: '2024-01-10',
      avatar: '/avatar.png'
    }
  ];
}
export async function getAllProducts(limit = 50) {
  try {
    // API công khai - không c?n token
    const res = await axios.get(`${API_URL}/products`);
    
    const products = res.data.products || [];
    // Gi?i h?n s? lư?ng s?n ph?m hi?n th?
    return products.slice(0, limit);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
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

// ===================== PRODUCT API =====================

/**
 * Táº¡o sáº£n pháº©m má»›i (ÄÄƒng bĂ i)
 */
export async function createProduct(productData) {
  try {
    const res = await axios.post(
      `${API_URL}/products/new-product`,
      productData,  // FormData s? đư?c g?i tr?c ti?p
      { 
        headers: {
          ...authHeader(),
          // Không set Content-Type, đ? browser t? đ?ng set cho FormData
        }
      }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * TĂ¬m kiáº¿m sáº£n pháº©m
 */
export async function searchProducts(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (params.searchTerm) queryParams.append('searchTerm', params.searchTerm);
    if (params.q) queryParams.append('searchTerm', params.q);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);

    const res = await axios.get(
      `${API_URL}/products?${queryParams.toString()}`,
      { headers: authHeader() }
    );
    
    return {
      success: res.data.success,
      items: res.data.products || [],
      message: res.data.message
    };
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * Cáº­p nháº­t sáº£n pháº©m
 */
export async function updateProduct(productId, productData) {
  try {
    const res = await axios.put(
      `${API_URL}/products/${productId}/update-product`,
      productData,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

/**
 * XĂ³a sáº£n pháº©m
 */
export async function deleteProduct(productId) {
  try {
    const res = await axios.delete(
      `${API_URL}/products/${productId}/delete-product`,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== CATEGORY API =====================

/**
 * Láº¥y danh sĂ¡ch táº¥t cáº£ danh má»¥c
 */
export async function fetchCategories() {
  try {
    const res = await axios.get(`${API_URL}/categories`, {
      headers: authHeader()
    });
    return res.data;
  } catch (error) {
    console.warn('fetchCategories error:', error.message);
    return {
      success: true,
      categories: [
        { categoryId: 1, categoryName: 'SĂ¡ch & VÄƒn phĂ²ng pháº©m' },
        { categoryId: 2, categoryName: 'Äá»“ Ä‘iá»‡n tá»­' },
        { categoryId: 3, categoryName: 'Thá»i trang' },
        { categoryId: 4, categoryName: 'Äá»“ gia dá»¥ng' },
        { categoryId: 5, categoryName: 'Thá»ƒ thao & Sá»©c khá»e' },
        { categoryId: 6, categoryName: 'KhĂ¡c' }
      ]
    };
  }
}







