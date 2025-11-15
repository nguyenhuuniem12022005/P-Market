import crypto from 'crypto';
import pool from '../../configs/mysql.js';

const greenLedgerStore = new Map();

function defaultLedger() {
  return {
    score: 65,
    tier: 'Seedling',
    perks: [
      'Giảm 2% phí escrow khi hoàn tất 3 đơn xanh',
      'Ưu tiên trong danh mục Sản phẩm bền vững',
    ],
    audits: [
      {
        id: 1,
        title: 'Đối soát chuỗi cung ứng',
        detail: 'Đã đính kèm giấy tờ chuỗi cung ứng.',
        status: 'Approved',
      },
      {
        id: 2,
        title: 'Vận chuyển xanh',
        detail: 'Đơn vị vận chuyển phát thải thấp đang xử lý lô hàng.',
        status: 'In-progress',
      },
      {
        id: 3,
        title: 'Chứng nhận on-chain',
        detail: 'Chuẩn bị ký dữ liệu green credit lên HScoin.',
        status: 'Pending',
      },
    ],
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    nextWindow: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
  };
}

async function buildContributions(userId) {
  const [rows] = await pool.query(
    `
    select so.salesOrderId, so.totalAmount, so.orderDate, so.status
    from SalesOrder so
    where so.customerId = ?
    order by so.orderDate desc
    limit 5
    `,
    [userId]
  );

  if (rows.length === 0) {
    return [
      {
        id: 'SIM-001',
        type: 'Tham gia đào tạo HScoin',
        carbon: -0.2,
        tokens: 2,
      },
    ];
  }

  return rows.map((row) => ({
    id: `ORD-${row.salesOrderId}`,
    type: row.status === 'Completed' ? 'Đơn escrow hoàn tất' : 'Đơn escrow đang khóa',
    carbon: row.status === 'Completed' ? -1 : -0.3,
    tokens: Math.max(1, Math.round(Number(row.totalAmount || 0) / 100000)),
    orderDate: row.orderDate,
  }));
}

function ensureLedger(userId) {
  if (!greenLedgerStore.has(userId)) {
    greenLedgerStore.set(userId, defaultLedger());
  }
  return greenLedgerStore.get(userId);
}

function parseOrigins(rawOrigins) {
  if (!rawOrigins) return [];
  if (Array.isArray(rawOrigins)) return rawOrigins;
  try {
    const parsed = JSON.parse(rawOrigins);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return String(rawOrigins)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeOrigins(origins = []) {
  return JSON.stringify(origins);
}

function mapDeveloperApp(row) {
  return {
    id: row.appId,
    name: row.name,
    quota: row.quotaPerDay,
    origins: parseOrigins(row.origins),
    status: row.status,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    apiKey: row.apiKey,
  };
}

function generateApiKey() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

function generateApiSecret() {
  return crypto.randomBytes(24).toString('hex').toUpperCase();
}

function resolveTier(score) {
  if (score >= 90) return 'Green Legend';
  if (score >= 75) return 'Green Pioneer';
  if (score >= 60) return 'Seedling';
  return 'Newcomer';
}

export async function getGreenCreditSummary(userId = 'demo-user') {
  const ledger = ensureLedger(userId);
  const contributions = await buildContributions(userId);
  const dynamicScore = ledger.score + contributions.length * 2;
  return {
    userId,
    ...ledger,
    score: dynamicScore,
    tier: resolveTier(dynamicScore),
    contributions,
  };
}

export async function requestGreenCreditSync(userId = 'demo-user', reason = '') {
  const ledger = ensureLedger(userId);
  ledger.lastSyncedAt = new Date().toISOString();
  ledger.nextWindow = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString();
  return {
    userId,
    reason,
    scheduledFor: ledger.nextWindow,
    status: 'Queued',
  };
}

export async function getDeveloperApps(ownerId) {
  if (!ownerId) return [];
  const [rows] = await pool.query(
    `
    select *
    from DeveloperApp
    where ownerId = ?
    order by createdAt desc
    `,
    [ownerId]
  );
  return rows.map(mapDeveloperApp);
}

export async function registerDeveloperApp({ ownerId, name, quota, origins }) {
  if (!ownerId) {
    throw new Error('Thiếu thông tin ownerId');
  }

  const apiKey = generateApiKey();
  const apiSecret = generateApiSecret();
  const normalizedQuota = Number(quota) || 1000;
  const [result] = await pool.query(
    `
    insert into DeveloperApp (ownerId, name, origins, quotaPerDay, apiKey, apiSecret, status)
    values (?, ?, ?, ?, ?, ?, 'PENDING')
    `,
    [ownerId, name, serializeOrigins(origins), normalizedQuota, apiKey, apiSecret]
  );

  const [rows] = await pool.query('select * from DeveloperApp where appId = ?', [result.insertId]);
  return rows.length ? mapDeveloperApp(rows[0]) : null;
}

export async function getDeveloperMetrics(ownerId) {
  if (!ownerId) {
    return {
      escrowTransactions: 0,
      walletRpcCalls: 0,
      smartContractEvents: 0,
      lastDeploymentAt: null,
    };
  }

  const [rows] = await pool.query(
    `
    select
      sum(dm.escrowTransactions) as escrowTransactions,
      sum(dm.walletRpcCalls) as walletRpcCalls,
      sum(dm.smartContractEvents) as smartContractEvents,
      max(dm.day) as lastDay,
      max(da.createdAt) as lastCreated
    from DeveloperApp da
    left join DeveloperMetric dm on dm.appId = da.appId
    where da.ownerId = ?
    `,
    [ownerId]
  );

  const row = rows[0] || {};
  return {
    escrowTransactions: Number(row.escrowTransactions) || 0,
    walletRpcCalls: Number(row.walletRpcCalls) || 0,
    smartContractEvents: Number(row.smartContractEvents) || 0,
    lastDeploymentAt: row.lastDay || row.lastCreated || null,
  };
}

const HSCOIN_CONTRACT_ADDRESS = '0x0137ac70725cfa67af4f5180c41e0c60f36e9118';
const HSCOIN_NETWORK = 'HScoin Devnet';
const ESCROW_STATUS_MAP = {
  Pending: 'LOCKED',
  Completed: 'RELEASED',
  Cancelled: 'REFUNDED',
};

function pseudoHash(orderId = 0) {
  const normalized = Number(orderId) || 0;
  return `0x${(normalized * 987654321 + 123456)
    .toString(16)
    .padStart(40, '0')
    .slice(-40)}`;
}

export function getEscrowSnapshot({ orderId, status = 'Pending', amount = 0 }) {
  const canonicalStatus = ESCROW_STATUS_MAP[status] || 'LOCKED';
  const blockNumber = 500 + Number(orderId || 0);
  return {
    orderId,
    status: canonicalStatus,
    txHash: pseudoHash(orderId),
    network: HSCOIN_NETWORK,
    contractAddress: HSCOIN_CONTRACT_ADDRESS,
    blockNumber,
    gasUsed: canonicalStatus === 'RELEASED' ? 105000 : 48000,
    timestamp: new Date(Date.now() - blockNumber * 1000).toISOString(),
    amount: Number(amount) || 0,
  };
}
