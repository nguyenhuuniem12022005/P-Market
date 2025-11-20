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
  SellerConfirmed: 'LOCKED',
  BuyerConfirmed: 'LOCKED',
  Completed: 'RELEASED',
  Cancelled: 'REFUNDED',
};

const SIMPLE_TOKEN_ADDRESS = (process.env.HSCOIN_SIMPLE_TOKEN_ADDRESS || '').trim().toLowerCase();
const HSCOIN_CONTRACT_ENDPOINT =
  (process.env.HSCOIN_CONTRACT_ENDPOINT || '/contracts').trim() || '/contracts';
const HSCOIN_MAX_RETRY = Math.max(1, Number(process.env.HSCOIN_MAX_RETRY || 5) || 5);
const HSCOIN_RETRY_DELAY_MS = Math.max(5_000, Number(process.env.HSCOIN_RETRY_DELAY_MS || 60_000) || 60_000);
const HSCOIN_WORKER_INTERVAL_MS = Math.max(5_000, Number(process.env.HSCOIN_WORKER_INTERVAL_MS || 60_000) || 60_000);
const HSCOIN_ALLOWED_CALLERS = (process.env.HSCOIN_ALLOWED_CALLERS || '')
  .split(',')
  .map((addr) => addr.trim().toLowerCase())
  .filter(Boolean);

function resolveHscoinContractEndpoint(address) {
  const normalizedAddress = normalizeAddress(address || '');
  if (!normalizedAddress) {
    throw ApiError.badRequest('Thiếu contract address');
  }

  const configured = HSCOIN_CONTRACT_ENDPOINT;
  if (configured.includes('{address}')) {
    return configured.replace('{address}', normalizedAddress);
  }
  if (configured.includes('{contractAddress}')) {
    return configured.replace('{contractAddress}', normalizedAddress);
  }
  const base = configured.replace(/\/$/, '');
  return `${base}/${normalizedAddress}/execute`;
}

let hscoinTokenCache = { token: null, expiresAt: 0 };
let chainCache = { blocks: [], fetchedAt: 0 };
let hasHscoinCallTable = false;
let hscoinWorkerTimer = null;
let hasHscoinAlertTable = false;

const SIMPLE_TOKEN_FUNCTIONS = {
  burn: {
    selector: '0x42966c68', // burn(uint256)
    inputs: ['uint256'],
  },
  mint: {
    selector: '0x40c10f19', // mint(address,uint256)
    inputs: ['address', 'uint256'],
  },
  transfer: {
    selector: '0xa9059cbb', // transfer(address,uint256)
    inputs: ['address', 'uint256'],
  },
};

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

function encodeUint256(value) {
  try {
    const normalized = BigInt(value);
    if (normalized < 0n) {
      throw new Error('Giá trị uint256 phải không âm');
    }
    return normalized.toString(16).padStart(64, '0');
  } catch (error) {
    throw ApiError.badRequest('Tham số kiểu uint256 không hợp lệ');
  }
}

function encodeAddressParam(value) {
  const normalized = normalizeAddress(value);
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) {
    throw ApiError.badRequest('Tham số địa chỉ không hợp lệ');
  }
  return normalized.replace(/^0x/, '').padStart(64, '0');
}

function encodeBoolParam(value) {
  return (value ? '1' : '0').padStart(64, '0');
}

function encodeParameterByType(type, value) {
  const normalizedType = String(type || '').toLowerCase();
  if (normalizedType.startsWith('uint') || normalizedType.startsWith('int')) {
    return encodeUint256(value);
  }
  if (normalizedType === 'address') {
    return encodeAddressParam(value);
  }
  if (normalizedType === 'bool') {
    return encodeBoolParam(Boolean(value));
  }
  throw ApiError.badRequest(`Không hỗ trợ encode tham số kiểu ${type}`);
}

function buildSimpleTokenCalldata(method, args = []) {
  const fn = SIMPLE_TOKEN_FUNCTIONS[method?.toLowerCase()];
  if (!fn) {
    throw ApiError.badRequest(`Hàm ${method} chưa được hỗ trợ trên SimpleToken`);
  }
  if (args.length !== fn.inputs.length) {
    throw ApiError.badRequest(
      `Sai số lượng tham số cho hàm ${method}. Mong đợi ${fn.inputs.length}, nhận ${args.length}`
    );
  }
  const encodedArgs = fn.inputs.map((type, idx) => encodeParameterByType(type, args[idx] ?? 0));
  return fn.selector + encodedArgs.join('');
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
  if (!userId) return [];
  const [rows] = await pool.query(
    `
    select *
    from (
      select distinct
        so.salesOrderId,
        so.totalAmount,
        so.orderDate,
        so.status,
        'BUYER' as role
      from SalesOrder so
      where so.customerId = ?
      union all
      select distinct
        so.salesOrderId,
        so.totalAmount,
        so.orderDate,
        so.status,
        'SELLER' as role
      from SalesOrder so
      join OrderDetail od on od.salesOrderId = so.salesOrderId
      join Product p on p.productId = od.productId
      where p.supplierId = ?
    ) combined
    order by combined.orderDate desc
    limit 5
    `,
    [userId, userId]
  );

  if (rows.length === 0) {
    return [];
  }

  return rows.map((row) => {
    const normalizedAmount = Number(row.totalAmount) || 0;
    const role = row.role === 'SELLER' ? 'SELLER' : 'BUYER';
    const divisor = role === 'SELLER' ? 350000 : 250000;
    const baseCarbon = normalizedAmount > 0 ? normalizedAmount / divisor : 0.5;
    const carbon = -Number(baseCarbon.toFixed(2));
    const orderDate =
      row.orderDate instanceof Date ? row.orderDate.toISOString() : row.orderDate;

    return {
      id: `${role === 'SELLER' ? 'SLR' : 'ORD'}-${row.salesOrderId}`,
      orderId: row.salesOrderId,
      type:
        role === 'SELLER'
          ? row.status === 'Completed'
            ? 'Shop giao thành công'
            : 'Shop đang xử lý'
          : row.status === 'Completed'
          ? 'Đơn escrow hoàn tất'
          : 'Đơn escrow đang khóa',
      status: row.status,
      role,
      carbon,
      tokens: Math.max(1, Math.round(normalizedAmount / 100000)),
      amount: normalizedAmount,
      orderDate,
    };
  });
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

const GREEN_PERK_LEVELS = [
  {
    min: 500,
    perks: [
      'Giảm 5% phí escrow khi tạo hợp đồng xanh',
      'Whitelist ưu tiên cho các chương trình HScoin',
    ],
  },
  {
    min: 250,
    perks: [
      'Giảm 3% phí escrow cho các đơn mua bền vững',
      'Được đề xuất trong danh mục Người bán Xanh',
    ],
  },
  {
    min: 100,
    perks: [
      'Giảm 1% phí escrow',
      'Ưu tiên xét duyệt sản phẩm có chứng nhận tái chế',
    ],
  },
];

function resolveGreenPerks(score, fallback = []) {
  for (const tier of GREEN_PERK_LEVELS) {
    if (score >= tier.min) {
      return tier.perks;
    }
  }
  return fallback;
}

function buildAuditTimeline(contributions = [], fallbackAudits = []) {
  if (!contributions.length) {
    return fallbackAudits;
  }
  const completed = contributions.filter((item) => item.status === 'Completed').length;
  const inProgress = contributions.length - completed;
  return [
    {
      id: 'audit-completed',
      title: 'Đơn escrow đã hoàn tất',
      detail: `${completed} đơn đã xác nhận kết quả và burn phí HScoin.`,
      status: completed > 0 ? 'Approved' : 'Pending',
    },
    {
      id: 'audit-progress',
      title: 'Đơn đang theo dõi',
      detail: `${inProgress} đơn đang khóa escrow hoặc chuẩn bị giao.`,
      status: inProgress > 0 ? 'In-progress' : 'Approved',
    },
    {
      id: 'audit-sync',
      title: 'Đồng bộ HScoin',
      detail: 'Đợi kỳ đồng bộ kế tiếp để ghi nhận green credit on-chain.',
      status: 'Pending',
    },
  ];
}

function sortContributions(contributions = []) {
  return [...contributions].sort((a, b) => {
    const aTime = a?.orderDate ? new Date(a.orderDate).getTime() : 0;
    const bTime = b?.orderDate ? new Date(b.orderDate).getTime() : 0;
    return bTime - aTime;
  });
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
    console.error('[HScoin] API error', {
      url,
      method,
      status: response.status,
      response: data,
      raw: text,
    });
    const error = new Error(message);
    error.response = data;
    error.status = response.status;
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

export async function getGreenCreditSummary(userId) {
  if (!userId) {
    throw ApiError.badRequest('Thiếu thông tin người dùng');
  }
  const ledger = ensureLedger(userId);
  const profile = await fetchUserProfile(userId);
  if (!profile) {
    throw ApiError.notFound('Không tìm thấy người dùng');
  }

  const [orderContributions, donationFeed] = await Promise.all([
    buildContributionsFromOrders(userId),
    fetchDonationFeed(),
  ]);

  const remoteContributions =
    donationFeed?.donations?.length && profile?.email
      ? mapDonationsToContributions(donationFeed.donations, profile)
      : [];

  const contributions = sortContributions([
    ...orderContributions,
    ...remoteContributions,
  ]).slice(0, 5);

  const score = Number(profile.greenCredit) || 0;

  return {
    userId,
    score,
    tier: resolveTier(score),
    perks: resolveGreenPerks(score, ledger.perks),
    audits: buildAuditTimeline(contributions, ledger.audits),
    contributions,
    lastSyncedAt: contributions[0]?.orderDate || ledger.lastSyncedAt,
    nextWindow: ledger.nextWindow,
    hscoinStats: donationFeed?.stats || null,
  };
}

export async function requestGreenCreditSync(userId, reason = '') {
  if (!userId) {
    throw ApiError.badRequest('Thiếu thông tin người dùng');
  }
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
  if (method?.toLowerCase() === 'burn') {
    const amount = Number(normalizedArgs[0]) || 0;
    finalArgs = [amount];
  }

  const encodedInput = buildSimpleTokenCalldata(method, finalArgs);

  const requestPayload = {
    caller: normalizedCaller,
    inputData: encodedInput,
    value: Number(value) || 0,
  };

  const callId = await recordHscoinContractCall({
    method,
    caller: normalizedCaller,
    payload: {
      contractAddress: SIMPLE_TOKEN_ADDRESS,
      body: requestPayload,
      originalCall: { method, args: normalizedArgs },
    },
  });

  try {
    const response = await invokeHscoinContract({
      contractAddress: SIMPLE_TOKEN_ADDRESS,
      body: requestPayload,
    });
    await markHscoinCallSuccess(callId, response);
    return {
      callId,
      status: 'SUCCESS',
      result: response?.data || response,
    };
  } catch (error) {
    const retryable = shouldRetryHscoinError(error);
    await markHscoinCallFailure(callId, error, {
      retryable,
      currentRetries: 0,
      maxRetries: HSCOIN_MAX_RETRY,
    });
    if (retryable) {
      const apiError = ApiError.serviceUnavailable(
        'HScoin đang tạm gián đoạn. Yêu cầu burn đã được xếp hàng để thử lại tự động.'
      );
      apiError.hscoinCallId = callId;
      apiError.hscoinStatus = 'QUEUED';
      throw apiError;
    }
    const apiError = ApiError.badRequest(error.message || 'Không thể thực thi hợp đồng HScoin.');
    apiError.hscoinCallId = callId;
    apiError.hscoinStatus = 'FAILED';
    throw apiError;
  }
}

export async function listHscoinContractCalls({ caller, limit = 20 }) {
  if (!caller) {
    throw ApiError.badRequest('Thiếu caller');
  }
  const normalizedCaller = normalizeAddress(caller);
  await ensureHscoinCallTable();
  const [rows] = await pool.query(
    `
    select callId, method, callerAddress, status, retries, maxRetries, lastError, lastResponse, nextRunAt, createdAt, updatedAt
    from HscoinContractCall
    where callerAddress = ?
    order by createdAt desc
    limit ?
    `,
    [normalizedCaller, Math.max(1, Math.min(Number(limit) || 20, 100))]
  );
  return rows.map((row) => ({
    ...row,
    callerAddress: row.callerAddress?.toLowerCase(),
    nextRunAt: row.nextRunAt ? new Date(row.nextRunAt).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  }));
}

export async function listHscoinAdminCalls({ status, limit = 50 }) {
  await ensureHscoinCallTable();
  const params = [];
  let where = '';
  if (status) {
    where = 'where status = ?';
    params.push(status);
  }
  params.push(Math.max(1, Math.min(Number(limit) || 50, 200)));
  const [rows] = await pool.query(
    `
    select callId, method, callerAddress, status, retries, maxRetries, lastError, nextRunAt, createdAt, updatedAt, orderId
    from HscoinContractCall
    ${where}
    order by createdAt desc
    limit ?
    `,
    params
  );
  return rows.map((row) => ({
    ...row,
    callerAddress: row.callerAddress?.toLowerCase(),
    nextRunAt: row.nextRunAt ? new Date(row.nextRunAt).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  }));
}
export async function listHscoinAlerts({ severity, limit = 50 }) {
  await ensureHscoinAlertTable();
  const params = [];
  let where = '';
  if (severity) {
    where = 'where severity = ?';
    params.push(severity);
  }
  params.push(Math.max(1, Math.min(Number(limit) || 50, 200)));
  const [rows] = await pool.query(
    `
    select alertId, callId, severity, message, metadata, acknowledged, createdAt
    from HscoinAlertLog
    ${where}
    order by createdAt desc
    limit ?
    `,
    params
  );
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    metadata: row.metadata ? safeJsonParse(row.metadata) : null,
  }));
}

function safeJsonParse(payload) {
  if (!payload) return null;
  if (typeof payload === 'object') return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function findOrderIdForCall(callId) {
  const [rows] = await pool.query(
    `
    select orderId
    from HscoinContractCall
    where callId = ?
    limit 1
    `,
    [callId]
  );
  return rows[0]?.orderId || null;
}

async function getOrderParticipants(orderId) {
  const [rows] = await pool.query(
    `
    select so.customerId, p.supplierId as sellerId
    from SalesOrder so
    join OrderDetail od on od.salesOrderId = so.salesOrderId
    join Product p on p.productId = od.productId
    where so.salesOrderId = ?
    limit 1
    `,
    [orderId]
  );
  return rows[0] || null;
}

async function insertNotificationEntry({ userId, content, relatedId }) {
  if (!userId || !content) return;
  await pool.query(
    `
    insert into Notification (userId, content, type, isRead, relatedId)
    values (?, ?, 'hscoin', 0, ?)
    `,
    [userId, content, relatedId || null]
  );
}

async function notifyHscoinParticipants(orderId, status, { callId, error } = {}) {
  if (!orderId) return;
  const participants = await getOrderParticipants(orderId);
  if (!participants) return;
  const baseMessage =
    status === 'SUCCESS'
      ? `Đơn #${orderId}: phí HScoin đã được burn thành công.`
      : `Đơn #${orderId}: burn HScoin thất bại. ${error ? `Chi tiết: ${error}` : ''}`;
  await Promise.all(
    [participants.customerId, participants.sellerId].filter(Boolean).map((userId) =>
      insertNotificationEntry({ userId, content: baseMessage, relatedId: orderId })
    )
  );
}

export async function attachOrderToHscoinCall(callId, orderId) {
  if (!callId || !orderId) return;
  await ensureHscoinCallTable();
  await pool.query(
    `
    update HscoinContractCall
    set orderId = ?
    where callId = ?
    `,
    [orderId, callId]
  );
}

async function ensureHscoinCallTable() {
  if (hasHscoinCallTable) return;
  await pool.query(
    `
    create table if not exists HscoinContractCall (
      callId int primary key auto_increment,
      method varchar(64) not null,
      callerAddress varchar(66) not null,
      payload longtext not null,
      status enum('PENDING','PROCESSING','SUCCESS','FAILED','QUEUED') not null default 'PENDING',
      retries int not null default 0,
      maxRetries int not null default ${HSCOIN_MAX_RETRY},
      lastError text null,
      lastResponse longtext null,
      nextRunAt datetime null,
      orderId int null,
      createdAt timestamp default current_timestamp,
      updatedAt timestamp default current_timestamp on update current_timestamp
    ) engine=InnoDB
    `
  );
  await pool
    .query(
      `
      alter table HscoinContractCall
      add column orderId int null
      `
    )
    .catch((error) => {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    });
  hasHscoinCallTable = true;
}

async function ensureHscoinAlertTable() {
  if (hasHscoinAlertTable) return;
  await pool.query(
    `
    create table if not exists HscoinAlertLog (
      alertId int primary key auto_increment,
      callId int null,
      severity enum('info','warning','critical') not null default 'info',
      message text not null,
      metadata json null,
      acknowledged tinyint(1) not null default 0,
      createdAt timestamp default current_timestamp
    ) engine=InnoDB
    `
  );
  hasHscoinAlertTable = true;
}

async function recordHscoinAlert({ callId, severity, message, metadata }) {
  await ensureHscoinAlertTable();
  await pool.query(
    `
    insert into HscoinAlertLog (callId, severity, message, metadata)
    values (?, ?, ?, ?)
    `,
    [callId || null, severity || 'info', message, metadata ? JSON.stringify(metadata) : null]
  );
}

async function recordHscoinContractCall({ method, caller, payload }) {
  await ensureHscoinCallTable();
  const [result] = await pool.query(
    `
    insert into HscoinContractCall (method, callerAddress, payload, status, maxRetries)
    values (?, ?, ?, 'PROCESSING', ?)
    `,
    [method, caller, JSON.stringify(payload), HSCOIN_MAX_RETRY]
  );
  return result.insertId;
}

async function markHscoinCallSuccess(callId, response, { orderId } = {}) {
  await pool.query(
    `
    update HscoinContractCall
    set status = 'SUCCESS',
        lastResponse = ?
    where callId = ?
    `,
    [response ? JSON.stringify(response) : null, callId]
  );
  const resolvedOrderId = orderId || (await findOrderIdForCall(callId));
  if (resolvedOrderId) {
    await notifyHscoinParticipants(resolvedOrderId, 'SUCCESS', {
      callId,
    });
  }
}

function shouldRetryHscoinError(error) {
  if (!error) return true;
  const retryableStatus = new Set([0, 405, 408, 425, 429, 500, 502, 503, 504]);
  if (error.status == null) return true;
  return retryableStatus.has(Number(error.status));
}

function computeRetryDelayMs(attempt) {
  const capped = Math.min(Number(attempt) || 1, 5);
  return HSCOIN_RETRY_DELAY_MS * Math.pow(2, capped - 1);
}

async function markHscoinCallFailure(
  callId,
  error,
  { retryable, currentRetries, maxRetries = HSCOIN_MAX_RETRY, orderId } = {}
) {
  const message = error?.message || 'HScoin contract call failed';
  const nextRetryCount = (Number(currentRetries) || 0) + 1;
  const retryLimit = Math.max(1, Number(maxRetries) || HSCOIN_MAX_RETRY);
  const canRetry = retryable && nextRetryCount < retryLimit;
  const nextRunAt = canRetry ? new Date(Date.now() + computeRetryDelayMs(nextRetryCount)) : null;
  await pool.query(
    `
    update HscoinContractCall
    set status = ?,
        retries = ?,
        lastError = ?,
        nextRunAt = ?
    where callId = ?
    `,
    [canRetry ? 'QUEUED' : 'FAILED', nextRetryCount, message, nextRunAt, callId]
  );

  if (!canRetry) {
    await recordHscoinAlert({
      callId,
      severity: 'critical',
      message: `HScoin call #${callId} thất bại hoàn toàn: ${message}`,
      metadata: { retries: nextRetryCount, errorStatus: error?.status ?? null },
    });
    const resolvedOrderId = orderId || (await findOrderIdForCall(callId));
    if (resolvedOrderId) {
      await notifyHscoinParticipants(resolvedOrderId, 'FAILED', {
        callId,
        error: message,
      });
    }
  } else if (nextRetryCount === retryLimit - 1) {
    await recordHscoinAlert({
      callId,
      severity: 'warning',
      message: `HScoin call #${callId} sắp vượt ngưỡng retry (${nextRetryCount}/${retryLimit})`,
      metadata: { nextRunAt, error: message },
    });
  }
}

async function invokeHscoinContract({ contractAddress, body }) {
  const endpoint = resolveHscoinContractEndpoint(contractAddress);
  return callHscoin(endpoint, {
    method: 'POST',
    body,
    requireAuth: true,
  });
}

async function fetchPendingHscoinCalls(limit = 5) {
  await ensureHscoinCallTable();
  const [rows] = await pool.query(
    `
    select *
    from HscoinContractCall
    where status in ('PENDING','QUEUED')
      and retries < maxRetries
      and (nextRunAt is null or nextRunAt <= now())
    order by createdAt asc
    limit ?
    `,
    [limit]
  );
  return rows;
}

async function processHscoinQueueBatch() {
  const jobs = await fetchPendingHscoinCalls();
  for (const job of jobs) {
    const [lock] = await pool.query(
      `
      update HscoinContractCall
      set status = 'PROCESSING'
      where callId = ? and status in ('PENDING','QUEUED')
      `,
      [job.callId]
    );
    if (lock.affectedRows === 0) {
      continue;
    }

    let payload;
    try {
      payload = JSON.parse(job.payload);
    } catch {
      payload = null;
    }

    if (!payload || !payload.contractAddress || !payload.body) {
      await markHscoinCallFailure(job.callId, new Error('Payload không hợp lệ'), {
        retryable: false,
        currentRetries: job.retries,
        maxRetries: job.maxRetries,
      });
      continue;
    }

    try {
      const response = await invokeHscoinContract(payload);
      await markHscoinCallSuccess(job.callId, response, { orderId: job.orderId });
    } catch (error) {
      const retryable = shouldRetryHscoinError(error);
      await markHscoinCallFailure(job.callId, error, {
        retryable,
        currentRetries: job.retries,
        maxRetries: job.maxRetries,
        orderId: job.orderId,
      });
    }
  }
}

function startHscoinQueueWorker() {
  if (hscoinWorkerTimer || HSCOIN_WORKER_INTERVAL_MS <= 0) {
    return;
  }
  const runner = async () => {
    try {
      await processHscoinQueueBatch();
    } catch (error) {
      console.error('[HScoin] Queue worker error:', error);
    }
  };
  hscoinWorkerTimer = setInterval(runner, HSCOIN_WORKER_INTERVAL_MS);
  if (typeof hscoinWorkerTimer.unref === 'function') {
    hscoinWorkerTimer.unref();
  }
  runner().catch((error) => console.error('[HScoin] Initial queue run error:', error));
}

startHscoinQueueWorker();
