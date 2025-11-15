import pool from '../../configs/mysql.js';
import ApiError from '../../utils/classes/api-error.js';
import { handleReferralAfterOrderCompleted } from './referralAutomationService.js';
import { getEscrowSnapshot } from './blockchainService.js';

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

async function recordEscrowLedger(orderId, status, amount) {
  const snapshot = getEscrowSnapshot({ orderId, status, amount });
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
      ledger.createdAt as ledgerCreatedAt
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

  return Array.from(map.values()).map((order) => ({
    ...order,
    orderDate: order.orderDate instanceof Date ? order.orderDate.toISOString() : order.orderDate,
    escrow:
      order.ledger ||
      getEscrowSnapshot({
        orderId: order.orderId,
        status: order.status,
        amount: order.totalAmount,
      }),
  }));
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
