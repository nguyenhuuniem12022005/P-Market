import { Router } from 'express';
import pool from '../configs/mysql.js';
import requireAuthentication from '../app/middleware/common/require-authentication.js';

const categoryRouter = Router();

// Lấy tất cả danh mục
categoryRouter.get('/', requireAuthentication, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Category ORDER BY categoryName');
    res.json({
      success: true,
      categories: rows
    });
  } catch (error) {
    next(error);
  }
});

export default categoryRouter;
