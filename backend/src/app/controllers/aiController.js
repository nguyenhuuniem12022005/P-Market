import { GoogleGenerativeAI } from '@google/generative-ai';
import * as productService from '../services/productService.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function chatWithAI(req, res, next) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tin nhắn.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Chức năng AI chưa được cấu hình (thiếu API Key).',
      });
    }

    // 1. Tìm kiếm sản phẩm liên quan để làm context (đơn giản hóa: lấy 5 sản phẩm đầu tiên khớp từ khóa)
    // Trích xuất từ khóa đơn giản từ message (bỏ qua các từ nối)
    const keywords = message.split(' ').filter(w => w.length > 3).join(' ');
    let productContext = '';
    
    try {
        const products = await productService.searchProducts(keywords, null);
        if (products && products.length > 0) {
            const topProducts = products.slice(0, 5).map(p => 
                `- ${p.productName} (Giá: ${p.price} VND): ${p.description?.substring(0, 100)}...`
            ).join('\n');
            productContext = `Dưới đây là một số sản phẩm có thể liên quan từ cửa hàng P-Market:\n${topProducts}\n`;
        }
    } catch (err) {
        console.warn('AI search product error:', err);
    }

    // 2. Gọi Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
      Bạn là trợ lý mua sắm ảo thông minh của P-Market (nền tảng thương mại điện tử xanh).
      
      Nhiệm vụ của bạn:
      - Tư vấn sản phẩm cho khách hàng dựa trên nhu cầu của họ.
      - Ưu tiên giới thiệu các sản phẩm thân thiện môi trường, bền vững.
      - Trả lời ngắn gọn, thân thiện, dùng tiếng Việt.
      - Nếu có thông tin sản phẩm được cung cấp bên dưới, hãy dùng nó để trả lời. Nếu không, hãy tư vấn chung.

      ${productContext}

      Khách hàng hỏi: "${message}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({
      success: true,
      reply: text,
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Xin lỗi, trợ lý AI đang bận. Vui lòng thử lại sau.',
    });
  }
}
