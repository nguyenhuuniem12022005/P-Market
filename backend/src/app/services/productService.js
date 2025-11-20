import pool from "../../configs/mysql.js";
import ApiError from "../../utils/classes/api-error.js";
import * as userService from './userService.js';
import * as supplierService from './supplierService.js';

const MAX_PRODUCT_EDITS = 3;
const MIN_SELLER_REPUTATION = Number(process.env.MIN_SELLER_REPUTATION || 65);
const GREEN_CREDIT_REWARD_GREEN_PRODUCT = Number(
  process.env.GREEN_CREDIT_REWARD_GREEN_PRODUCT || 25
);
let hasEnsuredStatusEnum = false;
let hasEnsuredGreenCertificationLog = false;
let hasEnsuredReviewFlagTable = false;

async function ensureProductStatusEnum() {
    if (hasEnsuredStatusEnum) return;
    const [rows] = await pool.query(
        `
        select column_type
        from information_schema.columns
        where table_schema = database()
          and table_name = 'Product'
          and column_name = 'status'
        limit 1
        `
    );
    const columnType = rows[0]?.column_type?.toLowerCase?.() || rows[0]?.COLUMN_TYPE?.toLowerCase?.() || '';
    if (!columnType.includes("'draft'") || !columnType.includes("'pending'")) {
        await pool.query(
            `
            alter table Product
            modify column status enum('Draft','Pending','Active','Sold') not null default 'Draft'
            `
        );
    }
    hasEnsuredStatusEnum = true;
}

async function ensureProductOwner(productId, supplierId) {
    const [rows] = await pool.query(
        `
        select productId
        from Product
        where productId = ? and supplierId = ?
        `,
        [productId, supplierId]
    );
    if (rows.length === 0) {
        throw ApiError.forbidden('Bạn không có quyền thao tác sản phẩm này');
    }
}


async function ensureProductNotTransacted(productId) {
    const [rows] = await pool.query(
        `
        select
            exists(
                select 1
                from OrderDetail od
                join SalesOrder so on so.salesOrderId = od.salesOrderId
                where od.productId = ? and so.status <> 'Cancelled'
            ) as hasOrders,
            exists(
                select 1
                from Review r
                join OrderDetail od2 on od2.orderDetailId = r.orderDetailId
                where od2.productId = ?
            ) as hasReviews
        `,
        [productId, productId]
    );
    const { hasOrders = 0, hasReviews = 0 } = rows[0] || {};
    if (hasOrders || hasReviews) {
        throw ApiError.badRequest('Sản phẩm đã có giao dịch hoặc phản hồi, không thể chỉnh sửa hay xóa.');
    }
}

async function ensureGreenCertificationLog() {
    if (hasEnsuredGreenCertificationLog) return;
    await pool.query(`
        create table if not exists GreenCertificationLog (
            logId int auto_increment primary key,
            productId int not null unique,
            supplierId int not null,
            credit int not null,
            createdAt timestamp default current_timestamp
        )
    `);
    hasEnsuredGreenCertificationLog = true;
}

async function ensureReviewFlagTable() {
    if (hasEnsuredReviewFlagTable) return;
    await pool.query(`
        create table if not exists ReviewFlag (
            flagId int auto_increment primary key,
            reviewId int not null,
            reporterId int not null,
            reason text null,
            createdAt timestamp default current_timestamp
        )
    `);
    hasEnsuredReviewFlagTable = true;
}

async function ensureEditAvailability(productId, supplierId) {
    const [rows] = await pool.query(
        `
        select coalesce(editCount, 0) as editCount
        from Product
        where productId = ? and supplierId = ?
        `,
        [productId, supplierId]
    );
    if (rows.length === 0) {
        throw ApiError.forbidden('Bạn không có quyền thao tác sản phẩm này');
    }
    const editCount = Number(rows[0].editCount || 0);
    if (editCount >= MAX_PRODUCT_EDITS) {
        throw ApiError.badRequest('Bạn đã đạt giới hạn 3 lần chỉnh sửa cho sản phẩm này');
    }
    return editCount;
}

async function ensureSellerEligible(supplierId) {
    if (!MIN_SELLER_REPUTATION) return;
    const [rows] = await pool.query(
        `
        select reputationScore
        from User
        where userId = ?
        limit 1
        `,
        [supplierId]
    );
    const reputation = Number(rows[0]?.reputationScore || 0);
    if (reputation < MIN_SELLER_REPUTATION) {
        throw ApiError.forbidden(
            `Bạn cần tối thiểu ${MIN_SELLER_REPUTATION} điểm uy tín để đăng sản phẩm mới. Vui lòng tích lũy thêm trước khi đăng bài.`
        );
    }
}

async function rewardGreenCertification(productId) {
    if (!GREEN_CREDIT_REWARD_GREEN_PRODUCT) {
        return;
    }
    await ensureGreenCertificationLog();
    const [existing] = await pool.query(
        `
        select logId
        from GreenCertificationLog
        where productId = ?
        limit 1
        `,
        [productId]
    );
    if (existing.length) {
        return;
    }
    const [products] = await pool.query(
        `
        select supplierId
        from Product
        where productId = ?
        limit 1
        `,
        [productId]
    );
    const supplierId = products[0]?.supplierId;
    if (!supplierId) {
        return;
    }
    await userService.updateGreenCredit(supplierId, GREEN_CREDIT_REWARD_GREEN_PRODUCT);
    await pool.query(
        `
        insert into GreenCertificationLog (productId, supplierId, credit)
        values (?, ?, ?)
        `,
        [productId, supplierId, GREEN_CREDIT_REWARD_GREEN_PRODUCT]
    );
}
// Đăng bài
export async function createProduct(productData, supplierId) {
    await ensureProductStatusEnum();
    await ensureSellerEligible(supplierId);
    const { productName, description, imageURL, unitPrice, categoryId, size, status, discount, complianceDocs } = productData;

    const sql = `
        insert into Product (
            supplierId, categoryId, productName, description, imageURL,
            unitPrice, size, status, discount, complianceDocs, editCount
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [results] = await pool.query(sql, [
        supplierId,
        categoryId,
        productName,
        description || null,
        imageURL || null,
        unitPrice,
        size || null,
        status || 'Draft',
        discount || 0,
        complianceDocs ? JSON.stringify(complianceDocs) : null,
        0
    ]);

    const insertId = results.insertId;

    const [rows] = await pool.query(`
        select * 
        from Product
        where productId = ?
    `, [insertId]);

    return rows[0];
}

export async function searchProducts(searchTerm, categoryId = null) {
    let baseSql = `
        select p.*, s.shopName, s.sellerRating, u.userName, u.avatar as sellerAvatar, u.reputationScore, c.categoryName
        from Product p
        join Supplier s on p.supplierId = s.supplierId
        join User u on s.supplierId = u.userId
        left join Category c on p.categoryId = c.categoryId
        where p.status = 'Active'
    `;
    
    const params = [];
    
    if (searchTerm && searchTerm.trim() !== '') {
        baseSql += ` and (p.productName like ? or u.userName like ? or c.categoryName like ?)`;
        const likeTerm = `%${searchTerm}%`;
        params.push(likeTerm, likeTerm, likeTerm);
    }
    
    if (categoryId) {
        baseSql += ` and p.categoryId = ?`;
        params.push(categoryId);
    }
    
    const finalSql = `
        select wrapped.*
        from (
            select base.*, coalesce(inv.totalQuantity, 0) as totalQuantity
            from (
                ${baseSql}
            ) as base
            left join (
                select productId, sum(quantity) as totalQuantity
                from Store
                group by productId
            ) inv on inv.productId = base.productId
        ) wrapped
        where wrapped.totalQuantity > 0
        order by wrapped.productId desc
    `;
    
    const [rows] = await pool.query(finalSql, params);
    return rows;
}

export async function getProductsBySupplier(supplierId) {
    const [rows] = await pool.query(
        `
        select 
            p.*,
            c.categoryName,
            coalesce(inv.totalQuantity, 0) as totalQuantity,
            coalesce(stats.totalOrders, 0) as totalOrders,
            coalesce(stats.totalSold, 0) as totalSold,
            coalesce(stats.totalRevenue, 0) as totalRevenue,
            coalesce(rev.reviewCount, 0) as reviewCount,
            latest.status as latestAuditStatus,
            latest.note as latestAuditNote,
            latest.createdAt as latestAuditCreatedAt,
            latest.reviewedAt as latestAuditReviewedAt,
            latest.reviewerId as latestAuditReviewerId
        from Product p
        left join Category c on p.categoryId = c.categoryId
        left join (
            select 
                od.productId,
                count(distinct od.salesOrderId) as totalOrders,
                sum(od.quantity) as totalSold,
                sum(od.quantity * od.unitPrice) as totalRevenue
            from OrderDetail od
            join SalesOrder so on so.salesOrderId = od.salesOrderId and so.status <> 'Cancelled'
            group by od.productId
        ) stats on stats.productId = p.productId
        left join (
            select productId, sum(quantity) as totalQuantity
            from Store
            group by productId
        ) inv on inv.productId = p.productId
        left join (
            select 
                od.productId, 
                count(distinct r.reviewId) as reviewCount
            from Review r
            join OrderDetail od on od.orderDetailId = r.orderDetailId
            group by od.productId
        ) rev on rev.productId = p.productId
        left join (
            select pa.*
            from ProductAudit pa
            join (
                select productId, max(createdAt) as createdAt
                from ProductAudit
                group by productId
            ) x on x.productId = pa.productId and x.createdAt = pa.createdAt
        ) latest on latest.productId = p.productId
        where p.supplierId = ?
        order by p.createdAt desc
        `,
        [supplierId]
    );
    return rows.map((row) => {
        const totalOrders = Number(row.totalOrders || 0);
        const reviewCount = Number(row.reviewCount || 0);
        const editCount = Number(row.editCount || 0);
        const canModify = totalOrders === 0 && reviewCount === 0;
        return {
            ...row,
            complianceDocs: row.complianceDocs ? JSON.parse(row.complianceDocs) : [],
            reviewCount,
            editCount,
            canEdit: canModify && editCount < MAX_PRODUCT_EDITS,
            canDelete: canModify,
        };
    });
}

export async function updateProduct(productId, supplierId, updateData) {
    await ensureProductOwner(productId, supplierId);
    await ensureProductNotTransacted(productId);
    await ensureEditAvailability(productId, supplierId);
    // Tạo mảng 'fields' chứa các phần của câu lệnh SET 
    const fields = [];
    // Tạo mảng 'params' chứa các giá trị tương ứng
    const params = [];

    // Duyệt qua updateData và thêm trường vào query nếu nó tồn tại (khác undefined)
    if (updateData.productName !== undefined) {
        fields.push("productName = ?");
        params.push(updateData.productName);
    }
    
    if (updateData.description !== undefined) {
        fields.push("description = ?");
        params.push(updateData.description || null);
    }

    if (updateData.unitPrice !== undefined) {
        fields.push("unitPrice = ?");
        params.push(updateData.unitPrice);
    }

    if (updateData.size !== undefined) {
        fields.push("size = ?");
        params.push(updateData.size || null);
    }

    if (updateData.status !== undefined) {
        fields.push("status = ?");
        params.push(updateData.status);
    }

    if (updateData.discount !== undefined) {
        fields.push("discount = ?");
        params.push(updateData.discount);
    }

    if (updateData.imageURL !== undefined) {
        fields.push("imageURL = ?");
        params.push(updateData.imageURL || null);
    }

    if (updateData.categoryId !== undefined){
        fields.push('categoryId = ?');
        params.push(updateData.categoryId);
    }

    // Nếu không có trường nào để cập nhật, dừng lại
    if (fields.length === 0) {
        console.log("Không có trường nào để cập nhật.");
        return;
    }
    fields.push("editCount = editCount + 1");

    // Thêm các tham số cho WHERE (productId và supplierId)
    params.push(productId);
    params.push(supplierId);

    // fields.join(', ') sẽ tự động thêm dấu phẩy
    const sql = `
        update Product 
        set
            ${fields.join(', ')} 
        where 
            productId = ? and supplierId = ? 
    `;

    await pool.query(sql, params);
}

export async function updateProductStatus(productId, supplierId, status) {
    await ensureProductStatusEnum();
    const sql = `
        update Product 
        set status = ?
        where productId = ? and supplierId = ? 
    `;

    await pool.query(sql, [status, productId, supplierId]);
}

export async function deleteProduct(productId, supplierId) {
    await ensureProductOwner(productId, supplierId);
    await ensureProductNotTransacted(productId);
    await pool.query(`delete from Store where productId = ?`, [productId]);
    const sql = `
        delete from Product 
        where productId = ? and supplierId = ?
    `;
    
    await pool.query(sql, [productId, supplierId]);
}

export async function getProductById(productId) {
    const [products] = await pool.query(`
        select 
            p.*, 
            s.shopName, 
            s.sellerRating,
            u.userName, 
            u.avatar as sellerAvatar, 
            u.reputationScore,
            u.phone,
            u.address,
            c.categoryName
        from Product p
        join Supplier s on p.supplierId = s.supplierId
        join User u on s.supplierId = u.userId
        left join Category c on p.categoryId = c.categoryId
        where p.productId = ? and p.status = 'Active'
    `, [productId]);

    if (products.length === 0) {
        return null;
    }

    const product = products[0];

    const [stocks] = await pool.query(`
        select st.productId, st.warehouseId, st.quantity, w.warehouseName
        from Store st
        join Warehouse w on st.warehouseId = w.warehouseId
        where st.productId = ?
    `, [productId]);

    const [totalRows] = await pool.query(`
        select coalesce(sum(quantity), 0) as totalQuantity
        from Store
        where productId = ?
    `, [productId]);

    const seller = {
        supplierId: product.supplierId,
        shopName: product.shopName,
        sellerRating: product.sellerRating,
        userName: product.userName,
        avatar: product.sellerAvatar,
        reputationScore: product.reputationScore,
        phone: product.phone,
        address: product.address
    };

    delete product.sellerAvatar;

    return {
        ...product,
        seller,
        stores: stocks,
        totalQuantity: totalRows[0]?.totalQuantity || 0
    };
}

export async function getProductForManagement(productId, supplierId) {
    await ensureProductOwner(productId, supplierId);
    const products = await getProductsBySupplier(supplierId);
    const product = products.find((item) => item.productId === Number(productId));
    if (!product) {
        throw ApiError.notFound('Không tìm thấy sản phẩm');
    }
    return product;
}

export async function activateProduct(productId) {
    await ensureProductStatusEnum();
    await pool.query(`
        update Product
        set status = 'Active'
        where productId = ?
    `, [productId]);
}

export async function requestProductAudit(productId, supplierId, { note = '', attachments = [] }) {
    await ensureProductStatusEnum();
    await ensureProductOwner(productId, supplierId);
    const serializedAttachments = attachments?.length ? JSON.stringify(attachments) : null;
    const [result] = await pool.query(
        `
        insert into ProductAudit (productId, status, note, attachments)
        values (?, 'PENDING', ?, ?)
        `,
        [productId, note || null, serializedAttachments]
    );

    await pool.query(
        `
        update Product
        set status = 'Pending', complianceDocs = ?
        where productId = ?
        `,
        [serializedAttachments, productId]
    );

    const [rows] = await pool.query('select * from ProductAudit where auditId = ?', [result.insertId]);
    return rows[0];
}

export async function getProductAudits(productId) {
    const [rows] = await pool.query(
        `
        select pa.*, u.userName as reviewerName
        from ProductAudit pa
        left join User u on u.userId = pa.reviewerId
        where pa.productId = ?
        order by pa.createdAt desc
        `,
        [productId]
    );
    return rows;
}

export async function reviewProductAudit(productId, auditId, reviewerId, { status, note }) {
    await ensureProductStatusEnum();
    const [audits] = await pool.query(
        `
        select *
        from ProductAudit
        where auditId = ? and productId = ?
        `,
        [auditId, productId]
    );
    if (audits.length === 0) {
        throw ApiError.notFound('Không tìm thấy yêu cầu kiểm duyệt');
    }

    await pool.query(
        `
        update ProductAudit
        set status = ?, note = coalesce(?, note), reviewerId = ?, reviewedAt = now()
        where auditId = ?
        `,
        [status, note || audits[0].note, reviewerId, auditId]
    );

    const productStatus = status === 'APPROVED' ? 'Active' : 'Draft';
  await pool.query(
    `
    update Product
    set status = ?
    where productId = ?
    `,
    [productStatus, productId]
  );

  if (status === 'APPROVED') {
    await rewardGreenCertification(productId);
  }

  return getProductAudits(productId);
}

export async function listPendingAudits() {
  const [rows] = await pool.query(
    `
    select
      pa.auditId,
      pa.productId,
      pa.status,
      pa.note,
      pa.attachments,
      pa.createdAt,
      p.productName,
      p.status as productStatus,
      p.unitPrice,
      u.userName as sellerName,
      u.email as sellerEmail
    from ProductAudit pa
    join Product p on p.productId = pa.productId
    join User u on u.userId = p.supplierId
    where pa.status = 'PENDING'
    order by pa.createdAt asc
    `
  );

  return rows.map((row) => ({
    ...row,
    attachments: row.attachments ? JSON.parse(row.attachments) : [],
  }));
}

export async function listProductReviews(productId) {
  const [rows] = await pool.query(
    `
    select
      r.reviewId,
      r.orderDetailId,
      r.starNumber,
      r.comment,
      r.createdAt,
      so.customerId,
      u.userName,
      u.avatar
    from Review r
    join OrderDetail od on od.orderDetailId = r.orderDetailId
    join SalesOrder so on so.salesOrderId = od.salesOrderId
    join User u on u.userId = so.customerId
    where od.productId = ?
    order by r.createdAt desc
    `,
    [productId]
  );

  return rows.map((row) => ({
    reviewId: row.reviewId,
    orderDetailId: row.orderDetailId,
    rating: Number(row.starNumber) || 0,
    comment: row.comment || '',
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    userName: row.userName,
    avatar: row.avatar || null,
    isVerified: true,
    reason: null,
  }));
}

export async function createProductReview(productId, orderDetailId, customerId, { rating, comment }) {
  const normalizedRating = Math.max(1, Math.min(5, Number(rating) || 1));
  const [orderRows] = await pool.query(
    `
    select
      od.orderDetailId,
      od.productId,
      so.salesOrderId,
      so.status,
      so.customerId,
      p.supplierId
    from OrderDetail od
    join SalesOrder so on so.salesOrderId = od.salesOrderId
    join Product p on p.productId = od.productId
    where od.orderDetailId = ?
    `,
    [orderDetailId]
  );

  const orderRow = orderRows[0];
  if (!orderRow || Number(orderRow.productId) !== Number(productId)) {
    await userService.updateReputationScore(customerId, -10);
    throw ApiError.forbidden('Bạn không thể đánh giá sản phẩm không thuộc đơn hàng của mình.');
  }
  if (orderRow.customerId !== customerId) {
    await userService.updateReputationScore(customerId, -10);
    throw ApiError.forbidden('Bạn không thể đánh giá đơn hàng của người khác.');
  }
  if (orderRow.status !== 'Completed') {
    throw ApiError.badRequest('Đơn hàng chưa hoàn tất hoặc chưa đủ điều kiện đánh giá.');
  }

  const [existing] = await pool.query(
    `
    select reviewId
    from Review
    where orderDetailId = ?
    limit 1
    `,
    [orderDetailId]
  );
  if (existing.length) {
    throw ApiError.badRequest('Bạn đã đánh giá sản phẩm này.');
  }

  await pool.query(
    `
    insert into Review (orderDetailId, starNumber, comment, createdAt)
    values (?, ?, ?, now())
    `,
    [orderDetailId, normalizedRating, comment || null]
  );

  if (normalizedRating <= 2) {
    await userService.updateReputationScore(orderRow.supplierId, -5);
  }
  await supplierService.updateSellerRating(orderRow.supplierId);

  return listProductReviews(productId);
}

export async function flagReview(reviewId, reporterId, reason = '') {
  await ensureReviewFlagTable();
  await pool.query(
    `
    insert into ReviewFlag (reviewId, reporterId, reason)
    values (?, ?, ?)
    `,
    [reviewId, reporterId, reason || null]
  );
  return { success: true };
}

export async function listReviewFlags(limit = 50) {
  await ensureReviewFlagTable();
  const [rows] = await pool.query(
    `
    select
      rf.flagId,
      rf.reviewId,
      rf.reporterId,
      rf.reason,
      rf.createdAt,
      r.orderDetailId,
      r.starNumber,
      r.comment,
      so.salesOrderId
    from ReviewFlag rf
    left join Review r on r.reviewId = rf.reviewId
    left join OrderDetail od on od.orderDetailId = r.orderDetailId
    left join SalesOrder so on so.salesOrderId = od.salesOrderId
    order by rf.createdAt desc
    limit ?
    `,
    [Math.max(1, Math.min(Number(limit) || 50, 200))]
  );
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  }));
}
