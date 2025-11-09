import pool from '../../configs/mysql.js';

const DEFAULT_LIMIT = 20;

// ======================= Helpers =======================
function buildSearchConditions({
  searchTerm = '',
  categoryId,
  status,
}) {
  let where = '1 = 1';
  const params = [];

  if (searchTerm) {
    where += ' AND (p.productName LIKE ? OR p.description LIKE ?)';
    const likeTerm = `%${searchTerm}%`;
    params.push(likeTerm, likeTerm);
  }

  if (categoryId) {
    where += ' AND p.categoryId = ?';
    params.push(categoryId);
  }

  if (status) {
    where += ' AND p.status = ?';
    params.push(status);
  }

  return { where, params };
}

function mapProductRow(row) {
  if (!row) return null;
  return {
    productId: row.productId,
    supplierId: row.supplierId,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    productName: row.productName,
    description: row.description,
    unitPrice: row.unitPrice,
    size: row.size,
    status: row.status,
    discount: row.discount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    shopName: row.shopName,
    sellerRating: row.sellerRating,
  };
}

// ======================= Services =======================
export async function getCategories() {
  const [rows] = await pool.query(
    `
      SELECT categoryId, categoryName, description
      FROM Category
      ORDER BY categoryName ASC
    `,
  );

  return rows;
}

export async function createProduct(productData, supplierId) {
  const {
    productName,
    description,
    unitPrice,
    categoryId,
    size,
    status,
    discount,
  } = productData;

  const sql = `
    INSERT INTO Product (
      supplierId,
      categoryId,
      productName,
      description,
      unitPrice,
      size,
      status,
      discount
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [results] = await pool.query(sql, [
    supplierId,
    categoryId,
    productName,
    description || null,
    unitPrice,
    size || null,
    status || 'Active',
    discount || 0,
  ]);

  const [rows] = await pool.query(
    `
      SELECT p.*, c.categoryName, s.shopName, s.sellerRating
      FROM Product p
      LEFT JOIN Category c ON c.categoryId = p.categoryId
      LEFT JOIN Supplier s ON s.supplierId = p.supplierId
      WHERE p.productId = ?
    `,
    [results.insertId],
  );

  return mapProductRow(rows[0]);
}

export async function findAllProducts({
  searchTerm = '',
  categoryId,
  status = 'Active',
  page = 1,
  limit = DEFAULT_LIMIT,
} = {}) {
  const safePage = Number.isNaN(Number(page)) ? 1 : Number(page);
  const safeLimit = Number.isNaN(Number(limit)) ? DEFAULT_LIMIT : Math.min(Number(limit), 100);
  const offset = (safePage - 1) * safeLimit;

  const { where, params } = buildSearchConditions({ searchTerm, categoryId, status });

  const [items] = await pool.query(
    `
      SELECT
        p.productId,
        p.productName,
        p.description,
        p.unitPrice,
        p.size,
        p.status,
        p.discount,
        p.categoryId,
        p.createdAt,
        p.updatedAt,
        c.categoryName,
        p.supplierId,
        s.shopName,
        s.sellerRating
      FROM Product p
      LEFT JOIN Category c ON c.categoryId = p.categoryId
      LEFT JOIN Supplier s ON s.supplierId = p.supplierId
      WHERE ${where}
      ORDER BY p.createdAt DESC
      LIMIT ? OFFSET ?
    `,
    [...params, safeLimit, offset],
  );

  const [[{ total }]] = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM Product p
      WHERE ${where}
    `,
    params,
  );

  return {
    items: items.map(mapProductRow),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

export async function findProductById(productId) {
  const [rows] = await pool.query(
    `
      SELECT
        p.*,
        c.categoryName,
        s.shopName,
        s.sellerRating
      FROM Product p
      LEFT JOIN Category c ON c.categoryId = p.categoryId
      LEFT JOIN Supplier s ON s.supplierId = p.supplierId
      WHERE p.productId = ?
      LIMIT 1
    `,
    [productId],
  );

  return mapProductRow(rows[0]);
}

export async function findProductsBySupplier(supplierId) {
  const [rows] = await pool.query(
    `
      SELECT
        p.productId,
        p.productName,
        p.description,
        p.unitPrice,
        p.size,
        p.status,
        p.discount,
        p.categoryId,
        p.createdAt,
        p.updatedAt,
        c.categoryName
      FROM Product p
      LEFT JOIN Category c ON c.categoryId = p.categoryId
      WHERE p.supplierId = ?
      ORDER BY p.createdAt DESC
    `,
    [supplierId],
  );

  return rows.map(mapProductRow);
}

export async function updateProduct(productId, supplierId, updateData) {
  const fields = [];
  const params = [];

  if (updateData.productName !== undefined) {
    fields.push('productName = ?');
    params.push(updateData.productName);
  }

  if (updateData.description !== undefined) {
    fields.push('description = ?');
    params.push(updateData.description || null);
  }

  if (updateData.unitPrice !== undefined) {
    fields.push('unitPrice = ?');
    params.push(updateData.unitPrice);
  }

  if (updateData.size !== undefined) {
    fields.push('size = ?');
    params.push(updateData.size || null);
  }

  if (updateData.status !== undefined) {
    fields.push('status = ?');
    params.push(updateData.status);
  }

  if (updateData.discount !== undefined) {
    fields.push('discount = ?');
    params.push(updateData.discount);
  }

  if (updateData.categoryId !== undefined) {
    fields.push('categoryId = ?');
    params.push(updateData.categoryId);
  }

  if (fields.length === 0) {
    return;
  }

  params.push(productId, supplierId);

  const sql = `
    UPDATE Product
    SET ${fields.join(', ')}
    WHERE productId = ? AND supplierId = ?
  `;

  await pool.query(sql, params);
}

export async function deleteProduct(productId, supplierId) {
  await pool.query(
    `
      DELETE FROM Product
      WHERE productId = ? AND supplierId = ?
    `,
    [productId, supplierId],
  );
}
