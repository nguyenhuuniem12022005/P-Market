import pool from '../../configs/mysql.js';
import ApiError from '../../utils/classes/api-error.js';
import { handleReferralAfterOrderCompleted } from './referralAutomationService.js';
import { getEscrowSnapshot, executeSimpleToken, attachOrderToHscoinCall } from './blockchainService.js';

const ESCROW_FEE_PERCENT = Number(process.env.ESCROW_FEE_PERCENT || 0.01); // 1% mặc định
const ESCROW_FEE_MIN = Number(process.env.ESCROW_FEE_MIN || 1000); // tối thiểu 1.000 HScoin

async function getOrderById(orderId) {
  const [rows] = await pool.query(
    `
    select salesOrderId, customerId, shipperId, status, totalAmount, shippingAddress, orderDate, deliveryDate
    from SalesOrder
    where salesOrderId = ?
    limit 1
    `,
    [orderId]
  );
  return rows[0] || null;
}

async function updateOrderStatus(orderId, status) {
  const [result] = await pool.query(
    `
    update SalesOrder
    set status = ?
    where salesOrderId = ?
    `,
    [status, orderId]
  );
  if (result.affectedRows === 0) {
    throw ApiError.notFound('Không tìm thấy đơn hàng');
  }
  return getOrderById(orderId);
}

export async function createEscrowOrder({
  customerId,
  productId,
  quantity = 1,
  walletAddress,
  shippingAddress,
}) {
  if (!customerId) {
    throw ApiError.badRequest('Thiếu thông tin người mua');
  }
  if (!walletAddress) {
    throw ApiError.badRequest('Vui lòng kết nối ví HScoin trước khi đặt hàng');
  }
  const qty = Math.max(1, Number(quantity) || 1);
  const [products] = await pool.query(
    `
    select productId, supplierId, productName, unitPrice, status, discount, imageURL
    from Product
    where productId = ?
    limit 1
    `,
    [productId]
  );
  const product = products[0];
  if (!product) {
    throw ApiError.notFound('Không tìm thấy sản phẩm');
  }
  if (product.status !== 'Active') {
    throw ApiError.badRequest('Sản phẩm chưa sẵn sàng để đặt hàng');
  }

  const [users] = await pool.query(
    `
    select address
    from User
    where userId = ?
    limit 1
    `,
    [customerId]
  );
  const resolvedAddress = (shippingAddress || users[0]?.address || '').trim();
  if (!resolvedAddress) {
    throw ApiError.badRequest('Vui lòng cập nhật địa chỉ giao hàng trước khi đặt hàng.');
  }

  const unitPrice = Number(product.unitPrice) || 0;
  const totalAmount = unitPrice * qty;
  const burnAmount = Math.max(
    ESCROW_FEE_MIN,
    Math.round(totalAmount * ESCROW_FEE_PERCENT)
  );

  let burnCallId = null;
  let burnStatus = 'SUCCESS';
  try {
    const burnResult = await executeSimpleToken({
      caller: walletAddress,
      method: 'burn',
      args: [burnAmount],
      value: 0,
    });
    burnCallId = burnResult?.callId || null;
    burnStatus = burnResult?.status || 'SUCCESS';
  } catch (error) {
    if (error.statusCode === 503 && error.hscoinCallId) {
      burnCallId = error.hscoinCallId;
      burnStatus = 'QUEUED';
    } else {
      throw error;
    }
  }

  const paymentMethodId = 1;
  const [orderResult] = await pool.query(
    `
    insert into SalesOrder (customerId, shipperId, paymentMethodId, feeShipping, shippingAddress, status, totalAmount)
    values (?, null, ?, 0, ?, 'Pending', ?)
    `,
    [customerId, paymentMethodId, resolvedAddress, totalAmount]
  );
  const orderId = orderResult.insertId;

  await pool.query(
    `
    insert into OrderDetail (productId, salesOrderId, discount, weightPerItem, quantity, unitPrice)
    values (?, ?, ?, ?, ?, ?)
    `,
    [product.productId, orderId, Number(product.discount) || 0, null, qty, unitPrice]
  );

  if (burnCallId) {
    await attachOrderToHscoinCall(burnCallId, orderId);
  }

  await recordEscrowLedger(orderId, 'Pending', totalAmount);

  return {
    orderId,
    status: 'Pending',
    totalAmount,
    quantity: qty,
    hscoinCallId: burnCallId,
    hscoinStatus: burnStatus,
    product: {
      productId: product.productId,
      productName: product.productName,
      imageURL: product.imageURL,
    },
  };
}

async function recordEscrowLedger(orderId, status, amount) {
  const snapshot = await getEscrowSnapshot({ orderId, status, amount });
  await pool.query(
    `
    insert into EscrowLedger (salesOrderId, txHash, blockNumber, gasUsed, network, status)
    values (?, ?, ?, ?, ?, ?)
    `,
    [orderId, snapshot.txHash, snapshot.blockNumber, snapshot.gasUsed, snapshot.network, snapshot.status]
  );
}

export async function markOrderCompleted(orderId, { triggerReferral = true } = {}) {
  const order = await updateOrderStatus(orderId, 'Completed');
  if (triggerReferral) {
    await handleReferralAfterOrderCompleted(orderId);
  }
  await recordEscrowLedger(orderId, 'Completed', order.totalAmount);
  return order;
}

export async function markOrderCancelled(orderId) {
  const order = await updateOrderStatus(orderId, 'Cancelled');
  await recordEscrowLedger(orderId, 'Cancelled', order.totalAmount);
  return order;
}

export async function getOrderDetail(orderId) {
  return getOrderById(orderId);
}

export async function listOrdersForCustomer(customerId) {
  const [rows] = await pool.query(
    `
    select
      so.salesOrderId,
      so.status,
      so.totalAmount,
      so.orderDate,
      so.shippingAddress,
      od.orderDetailId,
      od.quantity,
      od.unitPrice,
      p.productId,
      p.productName,
      p.imageURL,
      s.supplierId,
      u.userName as sellerName,
      u.avatar as sellerAvatar,
      ledger.txHash,
      ledger.blockNumber,
      ledger.gasUsed,
      ledger.network,
      ledger.status as ledgerStatus,
      ledger.createdAt as ledgerCreatedAt,
      hc.callId as hsCallId,
      hc.status as hsStatus,
      hc.retries as hsRetries,
      hc.maxRetries as hsMaxRetries,
      hc.lastError as hsLastError,
      hc.nextRunAt as hsNextRunAt,
      hc.updatedAt as hsUpdatedAt
    from SalesOrder so
    join OrderDetail od on od.salesOrderId = so.salesOrderId
    join Product p on p.productId = od.productId
    join Supplier s on p.supplierId = s.supplierId
    join User u on s.supplierId = u.userId
    left join (
      select e.*
      from EscrowLedger e
      join (
        select salesOrderId, max(createdAt) as createdAt
        from EscrowLedger
        group by salesOrderId
      ) latest on latest.salesOrderId = e.salesOrderId and latest.createdAt = e.createdAt
    ) ledger on ledger.salesOrderId = so.salesOrderId
    left join (
      select hc.*
      from HscoinContractCall hc
      join (
        select orderId, max(updatedAt) as latestUpdatedAt
        from HscoinContractCall
        where orderId is not null
        group by orderId
      ) latest on latest.orderId = hc.orderId and latest.latestUpdatedAt = hc.updatedAt
    ) hc on hc.orderId = so.salesOrderId
    where so.customerId = ?
    order by so.orderDate desc, so.salesOrderId desc
    `,
    [customerId]
  );

  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.salesOrderId)) {
      map.set(row.salesOrderId, {
        orderId: row.salesOrderId,
        status: row.status,
        totalAmount: Number(row.totalAmount) || 0,
        orderDate: row.orderDate,
        shippingAddress: row.shippingAddress,
        seller: {
          supplierId: row.supplierId,
          name: row.sellerName,
          avatar: row.sellerAvatar,
        },
        items: [],
        ledger: row.txHash
          ? {
              txHash: row.txHash,
              blockNumber: row.blockNumber,
              gasUsed: row.gasUsed,
              network: row.network,
              status: row.ledgerStatus,
              createdAt: row.ledgerCreatedAt,
            }
          : null,
        hscoinCall: row.hsCallId
          ? {
              callId: row.hsCallId,
              status: row.hsStatus,
              retries: row.hsRetries,
              maxRetries: row.hsMaxRetries,
              lastError: row.hsLastError,
              nextRunAt: row.hsNextRunAt,
              updatedAt: row.hsUpdatedAt,
            }
          : null,
      });
    }

    const order = map.get(row.salesOrderId);
    order.items.push({
      orderDetailId: row.orderDetailId,
      productId: row.productId,
      productName: row.productName,
      imageURL: row.imageURL,
      quantity: row.quantity,
      unitPrice: Number(row.unitPrice) || 0,
    });
  }

  const orders = Array.from(map.values());
  return Promise.all(
    orders.map(async (order) => ({
      ...order,
      orderDate: order.orderDate instanceof Date ? order.orderDate.toISOString() : order.orderDate,
      escrow:
        order.ledger ||
        (await getEscrowSnapshot({
          orderId: order.orderId,
          status: order.status,
          amount: order.totalAmount,
        })),
      hscoinCall: order.hscoinCall
        ? {
            ...order.hscoinCall,
            updatedAt:
              order.hscoinCall.updatedAt instanceof Date
                ? order.hscoinCall.updatedAt.toISOString()
                : order.hscoinCall.updatedAt,
            nextRunAt:
              order.hscoinCall.nextRunAt instanceof Date
                ? order.hscoinCall.nextRunAt.toISOString()
                : order.hscoinCall.nextRunAt,
          }
        : null,
    }))
  );
}

export async function listEscrowEventsForUser(customerId) {
  const [rows] = await pool.query(
    `
    select
      el.*,
      so.totalAmount,
      so.orderDate,
      so.status as orderStatus
    from EscrowLedger el
    join SalesOrder so on so.salesOrderId = el.salesOrderId
    where so.customerId = ?
    order by el.createdAt desc
    `,
    [customerId]
  );

  return rows.map((row) => ({
    orderId: row.salesOrderId,
    status: row.orderStatus,
    totalAmount: Number(row.totalAmount) || 0,
    orderDate: row.orderDate instanceof Date ? row.orderDate.toISOString() : row.orderDate,
    escrow: {
      txHash: row.txHash,
      blockNumber: row.blockNumber,
      gasUsed: row.gasUsed,
      network: row.network,
      status: row.status,
      timestamp: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    },
  }));
}
