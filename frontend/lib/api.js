import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// ===================== CATEGORY HELPERS =====================
const removeAccents = (str = "") =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const sanitizeSlug = (str = "") =>
  removeAccents(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "category";

export function buildCategorySlug(category) {
  if (!category) return "";
  const idPart = category.categoryId || category.id || "";
  const slugPart = sanitizeSlug(category.categoryName || category.name || "");
  return `${idPart}-${slugPart}`.replace(/^-/, "");
}

export function extractCategoryIdFromSlug(slug) {
  if (!slug) return null;
  const match = String(slug).match(/^\d+/);
  return match ? Number(match[0]) : null;
}

export const buildAvatarUrl = (src) => {
  if (!src || typeof src !== "string") return "/avatar.png";
  const trimmed = src.trim();
  if (/^(https?:|data:)/i.test(trimmed) || trimmed.startsWith("//")) return trimmed;

  const cleaned = trimmed.replace(/^public\//i, "").replace(/^\/+/, "");
  const base = API_URL.replace(/\/$/, "");
  return `${base}/${cleaned}`;
};

// ===================== TOKEN QUẢN LÝ =====================
export const setAuthToken = (token) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("pmarket_token", token);
  }
};

export const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("pmarket_token");
  }
  return null;
};

export const removeAuthToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("pmarket_token");
    localStorage.removeItem("pmarket_user");
  }
};

function authHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ===================== XỬ LÝ LỖI AXIOS =====================
function handleAxiosError(error) {
  if (error.response) {
    const message = error.response.data.message || `Lỗi API (${error.response.status})`;
    throw new Error(message);
  }
  throw new Error("Yêu cầu mạng thất bại hoặc lỗi không xác định.");
}

// ===================== AUTH API =====================
export async function registerUser(formData) {
  try {
    const res = await axios.post(`${API_URL}/auth/register`, formData);
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

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

export async function logoutUser() {
  try {
    const res = await axios.post(`${API_URL}/auth/logout`, {}, { headers: authHeader() });
    removeAuthToken();
    return res.data;
  } catch (error) {
    removeAuthToken();
    handleAxiosError(error);
  }
}

// ===================== USER API =====================
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

export async function resetPasswordAPI(passwordData) {
  try {
    const res = await axios.patch(
      `${API_URL}/users/me/update-password`,
      passwordData,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
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

export async function getUserDashboard() {
  try {
    const res = await axios.get(
      `${API_URL}/users/me/dashboard`,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== PRODUCT API =====================
export async function getAllProducts(limit = 50) {
  try {
    const res = await axios.get(`${API_URL}/products`);
    const products = res.data.products || [];
    return products.slice(0, limit);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

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

export async function getReviewsByProductId(productId) {
  return [
    {
      id: 1,
      userName: 'Nguyễn Văn A',
      rating: 5,
      comment: 'Sản phẩm rất tốt, đúng như mô tả!',
      createdAt: '2024-01-15',
      avatar: '/avatar.png'
    },
    {
      id: 2,
      userName: 'Trần Thị B',
      rating: 4,
      comment: 'Chất lượng ổn, giao hàng nhanh.',
      createdAt: '2024-01-10',
      avatar: '/avatar.png'
    }
  ];
}

export async function createProduct(productData) {
  try {
    const isFormData = typeof FormData !== "undefined" && productData instanceof FormData;
    const res = await axios.post(
      `${API_URL}/products/new-product`,
      productData,
      { 
        headers: {
          ...authHeader(),
          ...(isFormData ? {} : { "Content-Type": "application/json" })
        }
      }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

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

export async function updateProduct(productId, productData) {
  try {
    const isFormData = typeof FormData !== "undefined" && productData instanceof FormData;
    const res = await axios.put(
      `${API_URL}/products/${productId}/update-product`,
      productData,
      { 
        headers: {
          ...authHeader(),
          ...(isFormData ? {} : { "Content-Type": "application/json" })
        }
      }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

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

// ===================== STORE API =====================
export async function addProductToStore(storeData) {
  try {
    const res = await axios.post(
      `${API_URL}/stores/add-store`,
      storeData,
      {
        headers: {
          ...authHeader(),
          "Content-Type": "application/json"
        }
      }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== WAREHOUSE API =====================
export async function fetchWarehouses() {
  try {
    const res = await axios.get(
      `${API_URL}/warehouses`,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== DIAGNOSTIC API =====================
export async function fetchDataOverview() {
  try {
    const res = await axios.get(
      `${API_URL}/reports/data-overview`,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== CHAT API =====================
export async function createChatRoomForProduct(productId) {
  try {
    const res = await axios.post(
      `${API_URL}/chatrooms/by-product`,
      { productId },
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchChatMessages(chatRoomId) {
  try {
    const res = await axios.get(
      `${API_URL}/chatrooms/${chatRoomId}/messages`,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function sendChatMessage(chatRoomId, content) {
  try {
    const res = await axios.post(
      `${API_URL}/chatrooms/${chatRoomId}/messages`,
      { content },
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function fetchChatRooms() {
  try {
    const res = await axios.get(
      `${API_URL}/chatrooms`,
      { headers: authHeader() }
    );
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== CART API =====================
export async function fetchCartItems() {
  try {
    const res = await axios.get(`${API_URL}/cart`, {
      headers: authHeader()
    });
    return res.data.items || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function addProductToCart(productId, quantity = 1) {
  try {
    const res = await axios.post(
      `${API_URL}/cart`,
      { productId, quantity },
      { headers: { ...authHeader() } }
    );
    return res.data.items || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function updateCartItemQuantity(productId, quantity) {
  try {
    const res = await axios.patch(
      `${API_URL}/cart/${productId}`,
      { quantity },
      { headers: { ...authHeader() } }
    );
    return res.data.items || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function removeCartItem(productId) {
  try {
    const res = await axios.delete(`${API_URL}/cart/${productId}`, {
      headers: authHeader()
    });
    return res.data.items || [];
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function clearCartItems() {
  try {
    const res = await axios.delete(`${API_URL}/cart`, {
      headers: authHeader()
    });
    return res.data;
  } catch (error) {
    handleAxiosError(error);
  }
}

// ===================== CATEGORY API =====================
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
        { categoryId: 1, categoryName: 'Sách & Văn phòng phẩm' },
        { categoryId: 2, categoryName: 'Đồ điện tử' },
        { categoryId: 3, categoryName: 'Thời trang' },
        { categoryId: 4, categoryName: 'Đồ gia dụng' },
        { categoryId: 5, categoryName: 'Thể thao & Sức khỏe' },
        { categoryId: 6, categoryName: 'Khác' }
      ]
    };
  }
}
