import crypto from 'crypto';
import pool from '../../configs/mysql.js';
import ApiError from '../../utils/classes/api-error.js';

const greenLedgerStore = new Map();

const HSCOIN_BASE_URL = (process.env.HSCOIN_API_BASE_URL || 'https://hsc-w3oq.onrender.com/api').replace(/\/$/, '');
const HSCOIN_API_KEY = process.env.HSCOIN_API_KEY;
const HSCOIN_ADMIN_EMAIL = process.env.HSCOIN_ADMIN_EMAIL;
const HSCOIN_ADMIN_PASSWORD = process.env.HSCOIN_ADMIN_PASSWORD;

const HSCOIN_CONTRACT_ADDRESS = '0x0137ac70725cfa67af4f5180c41e0c60f36e9118';
const HSCOIN_NETWORK = 'HScoin Devnet';
const ESCROW_STATUS_MAP = {
  Pending: 'LOCKED',
  Completed: 'RELEASED',
  Cancelled: 'REFUNDED',
};

const SIMPLE_TOKEN_ADDRESS = (process.env.HSCOIN_SIMPLE_TOKEN_ADDRESS || '').trim().toLowerCase();
const HSCOIN_ALLOWED_CALLERS = (process.env.HSCOIN_ALLOWED_CALLERS || '')
  .split(',')
  .map((addr) => addr.trim().toLowerCase())
  .filter(Boolean);

let hscoinTokenCache = { token: null, expiresAt: 0 };
let chainCache = { blocks: [], fetchedAt: 0 };

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

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

async function buildContributionsFromOrders(userId) {
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
    // ignore parse error
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

async function fetchUserProfile(userId) {
  if (!userId) return null;
  const [rows] = await pool.query(
    `
    select userId, userName, email, greenCredit
    from User
    where userId = ?
    limit 1
    `,
    [userId]
  );
  return rows[0] || null;
}

async function loginToHscoin() {
  if (!HSCOIN_ADMIN_EMAIL || !HSCOIN_ADMIN_PASSWORD) {
    return null;
  }

  const response = await fetch(`${HSCOIN_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(HSCOIN_API_KEY ? { 'X-API-KEY': HSCOIN_API_KEY } : {}),
    },
    body: JSON.stringify({
      email: HSCOIN_ADMIN_EMAIL,
      password: HSCOIN_ADMIN_PASSWORD,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (response.ok && data?.success && data?.token) {
    hscoinTokenCache = {
      token: data.token,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
    return data.token;
  }
  throw new Error(data?.message || 'Không thể đăng nhập HScoin');
}

async function getHscoinToken() {
  if (hscoinTokenCache.token && hscoinTokenCache.expiresAt > Date.now()) {
    return hscoinTokenCache.token;
  }
  return loginToHscoin().catch((error) => {
    console.warn('[HScoin] Đăng nhập thất bại:', error.message);
    return null;
  });
}

async function callHscoin(path, { method = 'GET', body, headers = {}, requireAuth = false } = {}) {
  const url = path.startsWith('http') ? path : `${HSCOIN_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const finalHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }
  if (HSCOIN_API_KEY) {
    finalHeaders['X-API-KEY'] = HSCOIN_API_KEY;
  }

  if (requireAuth) {
    const token = await getHscoinToken();
    if (!token) {
      throw new Error('Thiếu thông tin đăng nhập HScoin');
    }
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok || data?.success === false) {
    const message = data?.message || `HScoin API ${response.status}`;
    const error = new Error(message);
    error.response = data;
    throw error;
  }

  return data;
}

async function fetchDonationFeed() {
  try {
    const [stats, donations] = await Promise.all([
      callHscoin('/donation_stats'),
      callHscoin('/all_donations'),
    ]);
    return {
      stats: stats?.stats || {},
      donations: donations?.donations || [],
    };
  } catch (error) {
    console.warn('[HScoin] Không thể tải donation feed:', error.message);
    return null;
  }
}

function mapDonationsToContributions(donations = [], profile) {
  const normalizedEmail = profile?.email?.toLowerCase();
  const filtered = normalizedEmail
    ? donations.filter((item) => item.user_email?.toLowerCase() === normalizedEmail)
    : donations;

  return filtered.slice(0, 5).map((item, idx) => ({
    id: item.transaction_id || `HSC-${idx + 1}`,
    type: item.cause || 'Giao dịch HScoin',
    carbon: item.amount >= 0 ? -Math.min(2, item.amount / 10) : Math.abs(item.amount) / 50,
    tokens: Math.max(1, Math.round(Math.abs(item.amount || 1))),
    orderDate: item.date,
    amount: item.amount,
    userEmail: item.user_email,
    txHash: item.transaction_id,
  }));
}

async function fetchHscoinApps() {
  try {
    const response = await callHscoin('/apps/list', { requireAuth: true });
    const apps = response?.apps || [];
    return apps.map((app) => ({
      id: app.app_id || app.id || app.name,
      name: app.name,
      quota: app.quota || app.quotaPerDay || 1000,
      origins: Array.isArray(app.allowed_origins)
        ? app.allowed_origins
        : parseOrigins(app.allowed_origins),
      status: app.status || 'PENDING',
      createdAt: app.created_at || null,
      apiKey: app.api_key || null,
    }));
  } catch (error) {
    console.warn('[HScoin] Không thể lấy danh sách app:', error.message);
    return null;
  }
}

async function createHscoinDeveloperApp(payload) {
  try {
    const body = {
      name: payload.name,
      allowed_origins: Array.isArray(payload.origins) ? payload.origins.join(', ') : payload.origins,
      quota: payload.quota || 1000,
    };
    const response = await callHscoin('/apps/create', {
      method: 'POST',
      body,
      requireAuth: true,
    });
    if (response?.app) {
      const app = response.app;
      return {
        id: app.app_id || app.id || app.name,
        name: app.name,
        quota: app.quota || body.quota,
        origins: Array.isArray(app.allowed_origins)
          ? app.allowed_origins
          : parseOrigins(app.allowed_origins),
        status: app.status || 'APPROVED',
        createdAt: app.created_at || new Date().toISOString(),
        apiKey: app.api_key,
      };
    }
    return null;
  } catch (error) {
    console.warn('[HScoin] Không thể tạo app mới:', error.message);
    return null;
  }
}

async function fetchChainBlocks() {
  if (chainCache.blocks.length && Date.now() - chainCache.fetchedAt < 30 * 1000) {
    return chainCache.blocks;
  }

  try {
    const response = await callHscoin('/blockchain/chain');
    chainCache = {
      blocks: response?.data || [],
      fetchedAt: Date.now(),
    };
    return chainCache.blocks;
  } catch (error) {
    console.warn('[HScoin] Không thể tải blockchain chain:', error.message);
    return [];
  }
}

async function fetchBlockchainInfo() {
  try {
    return await callHscoin('/blockchain/info');
  } catch (error) {
    console.warn('[HScoin] Không thể tải thông tin mạng:', error.message);
    return null;
  }
}

async function fetchAccounts() {
  try {
    const response = await callHscoin('/accounts');
    return response?.data || [];
  } catch (error) {
    console.warn('[HScoin] Không thể tải danh sách account:', error.message);
    return [];
  }
}

async function getDeveloperAppsFromDb(ownerId) {
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

async function registerDeveloperAppInDb({ ownerId, name, quota, origins }) {
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

async function getDeveloperMetricsFromDb(ownerId) {
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

async function buildRemoteEscrowSnapshot({ orderId, status, amount }) {
  const fallbackStatus = ESCROW_STATUS_MAP[status] || 'LOCKED';
  const blocks = await fetchChainBlocks();
  if (!blocks.length) return null;

  const index = Math.max(0, Math.min(blocks.length - 1, Number(orderId) || 0));
  const block = blocks[index] || blocks[blocks.length - 1];

  return {
    orderId,
    status: fallbackStatus,
    txHash: block.blockHash || pseudoHash(orderId),
    network: HSCOIN_NETWORK,
    contractAddress: HSCOIN_CONTRACT_ADDRESS,
    blockNumber: block.header?.number ?? 0,
    gasUsed: block.header?.gasUsed ?? (fallbackStatus === 'RELEASED' ? 105000 : 48000),
    timestamp: block.header?.timestamp
      ? new Date(block.header.timestamp * 1000).toISOString()
      : new Date().toISOString(),
    amount: Number(amount) || 0,
  };
}

function pseudoHash(orderId = 0) {
  const normalized = Number(orderId) || 0;
  return `0x${(normalized * 987654321 + 123456)
    .toString(16)
    .padStart(40, '0')
    .slice(-40)}`;
}

function buildFallbackEscrowSnapshot({ orderId, status = 'Pending', amount = 0 }) {
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

export async function getGreenCreditSummary(userId = 'demo-user') {
  const ledger = ensureLedger(userId);
  const profile = await fetchUserProfile(userId);
  const donationFeed = await fetchDonationFeed();

  let contributions = await buildContributionsFromOrders(userId);
  if (donationFeed?.donations?.length) {
    const remoteContributions = mapDonationsToContributions(donationFeed.donations, profile);
    if (remoteContributions.length > 0) {
      contributions = remoteContributions;
      ledger.lastSyncedAt = remoteContributions[0]?.orderDate || ledger.lastSyncedAt;
    }
  }

  const baselineScore = profile?.greenCredit ?? ledger.score;
  const dynamicScore = baselineScore + contributions.length * 2;
  return {
    userId,
    ...ledger,
    score: dynamicScore,
    tier: resolveTier(dynamicScore),
    contributions,
    hscoinStats: donationFeed?.stats || null,
  };
}

export async function requestGreenCreditSync(userId = 'demo-user', reason = '') {
  const ledger = ensureLedger(userId);
  ledger.lastSyncedAt = new Date().toISOString();
  ledger.nextWindow = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();

  const networkInfo = await fetchBlockchainInfo();
  return {
    userId,
    reason,
    scheduledFor: ledger.nextWindow,
    status: 'Queued',
    network: networkInfo?.data || null,
  };
}

export async function getDeveloperApps(ownerId) {
  const remoteApps = await fetchHscoinApps();
  if (remoteApps && remoteApps.length) {
    return remoteApps;
  }
  return getDeveloperAppsFromDb(ownerId);
}

export async function registerDeveloperApp(payload) {
  const remoteApp = await createHscoinDeveloperApp(payload);
  if (remoteApp) {
    return remoteApp;
  }
  return registerDeveloperAppInDb(payload);
}

export async function getDeveloperMetrics(ownerId) {
  try {
    const [info, accounts, blocks] = await Promise.all([
      fetchBlockchainInfo(),
      fetchAccounts(),
      fetchChainBlocks(),
    ]);
    const transactions = blocks.reduce(
      (sum, block) => sum + ((block.transactions || []).length || 0),
      0
    );
    const accountsLen = accounts.length || 0;
    return {
      escrowTransactions: transactions,
      walletRpcCalls: transactions + accountsLen * 2,
      smartContractEvents: blocks.filter((block) => (block.transactions || []).length > 0).length,
      lastDeploymentAt:
        blocks[0]?.header?.timestamp || info?.data?.stateRoot
          ? new Date(
              (blocks[0]?.header?.timestamp || Date.now() / 1000) * 1000
            ).toISOString()
          : null,
    };
  } catch (error) {
    console.warn('[HScoin] Không thể lấy developer metrics, dùng dữ liệu cục bộ:', error.message);
    return getDeveloperMetricsFromDb(ownerId);
  }
}

export async function getEscrowSnapshot({ orderId, status = 'Pending', amount = 0 }) {
  const fallback = buildFallbackEscrowSnapshot({ orderId, status, amount });
  const remote = await buildRemoteEscrowSnapshot({ orderId, status, amount });
  return remote || fallback;
}

export async function executeSimpleToken({ caller, method, args = [], value = 0 }) {
  if (!SIMPLE_TOKEN_ADDRESS) {
    throw ApiError.badRequest('Chưa cấu hình HSCOIN_SIMPLE_TOKEN_ADDRESS');
  }
  if (!method) {
    throw ApiError.badRequest('Thiếu tên hàm (function)');
  }

  const normalizedCaller = normalizeAddress(caller);
  if (!normalizedCaller) {
    throw ApiError.badRequest('Thiếu địa chỉ ví caller');
  }
  if (HSCOIN_ALLOWED_CALLERS.length && !HSCOIN_ALLOWED_CALLERS.includes(normalizedCaller)) {
    throw ApiError.forbidden('Địa chỉ ví không được phép thực thi hợp đồng');
  }

  const normalizedArgs = Array.isArray(args) ? args : [args];
  let finalArgs = normalizedArgs;
  if (method?.toLowerCase() === 'burn' && normalizedArgs.length === 1) {
    finalArgs = [normalizedCaller, normalizedArgs[0]];
  }

  const payload = {
    contractAddress: SIMPLE_TOKEN_ADDRESS,
    callerAddress: normalizedCaller,
    inputData: {
      function: method,
      args: finalArgs,
    },
    value: Number(value) || 0,
  };

  const response = await callHscoin('/contracts/execute', {
    method: 'POST',
    body: payload,
    requireAuth: true,
  });
  return response?.data || response;
}
