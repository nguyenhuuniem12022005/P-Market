/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  fetchEscrowEvents,
  fetchUserContracts,
  saveUserContract,
  deployContract,
  mintSelfToken,
  fetchTokenBalance,
} from '../../../lib/api';
import { fetchUserBalance } from '../../../lib/api';
import { ShieldCheck, TrendingUp, History, Loader2, Copy, Wallet as WalletIcon } from 'lucide-react';
import { useWallet } from '../../../context/WalletContext';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export default function WalletPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isConnected, walletAddress, connectWallet, disconnectWallet, isLoadingWallet } = useWallet();
  const [contracts, setContracts] = useState([]);
  const defaultContractEnv =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_HSCOIN_SIMPLE_TOKEN_ADDRESS) || '';
  const [contractName, setContractName] = useState('PMarket');
  const [contractAddress, setContractAddress] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [savingContract, setSavingContract] = useState(false);
  const [mintAmount, setMintAmount] = useState('1000');
  const [tokenBalance, setTokenBalance] = useState(null);
  const [loadingTokenBalance, setLoadingTokenBalance] = useState(false);
  const [balance, setBalance] = useState({ availableBalance: 0, lockedBalance: 0 });
  const [sourceCode, setSourceCode] = useState(`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PMarketTokenEscrow
 * @dev Token nội bộ + escrow. Mint tự do để test trên devnet.
 */
contract PMarketTokenEscrow {
    string public name = "PMarket Token";
    string public symbol = "PMK";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;

    enum Status { None, Deposited, Released, Refunded }
    struct Order {
        address buyer;
        address seller;
        uint256 amount;
        Status status;
        uint256 createdAt;
    }
    mapping(uint256 => Order) public orders;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Deposited(uint256 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event Released(uint256 indexed orderId, address indexed seller, uint256 amount);
    event Refunded(uint256 indexed orderId, address indexed buyer, uint256 amount);

    // Mint cho chính mình (devnet)
    function mintSelf(uint256 _value) external returns (bool) {
        require(_value > 0, "Amount=0");
        totalSupply += _value;
        balanceOf[msg.sender] += _value;
        emit Mint(msg.sender, _value);
        emit Transfer(address(0), msg.sender, _value);
        return true;
    }

    // Mint cho người khác (devnet)
    function mint(address _to, uint256 _value) public returns (bool) {
        require(_to != address(0), "Invalid address");
        require(_value > 0, "Amount=0");
        totalSupply += _value;
        balanceOf[_to] += _value;
        emit Mint(_to, _value);
        emit Transfer(address(0), _to, _value);
        return true;
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_to != address(0), "Invalid address");
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function deposit(uint256 orderId, address seller, uint256 amount) external {
        require(orders[orderId].status == Status.None, "Order exists");
        require(seller != address(0) && seller != msg.sender, "Bad seller");
        require(amount > 0, "Amount=0");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[address(this)] += amount;

        orders[orderId] = Order({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            status: Status.Deposited,
            createdAt: block.timestamp
        });

        emit Transfer(msg.sender, address(this), amount);
        emit Deposited(orderId, msg.sender, seller, amount);
    }

    function release(uint256 orderId) external {
        Order storage o = orders[orderId];
        require(o.status == Status.Deposited, "Not deposited");
        require(msg.sender == o.seller, "Not seller");

        o.status = Status.Released;
        balanceOf[address(this)] -= o.amount;
        balanceOf[o.seller] += o.amount;

        emit Transfer(address(this), o.seller, o.amount);
        emit Released(orderId, o.seller, o.amount);
    }

    function refund(uint256 orderId) external {
        Order storage o = orders[orderId];
        require(o.status == Status.Deposited, "Not deposited");
        require(msg.sender == o.buyer, "Not buyer");

        o.status = Status.Refunded;
        balanceOf[address(this)] -= o.amount;
        balanceOf[o.buyer] += o.amount;

        emit Transfer(address(this), o.buyer, o.amount);
        emit Refunded(orderId, o.buyer, o.amount);
    }

    function getOrder(uint256 orderId) external view returns (
        address buyer,
        address seller,
        uint256 amount,
        Status status,
        uint256 createdAt
    ) {
        Order storage o = orders[orderId];
        return (o.buyer, o.seller, o.amount, o.status, o.createdAt);
    }

    function getContractBalance() external view returns (uint256) {
        return balanceOf[address(this)];
    }
}`);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchEscrowEvents();
        setEvents(data || []);
        const cons = await fetchUserContracts();
        setContracts(cons || []);
        const def = (cons || []).find((c) => c.isDefault);
        if (def) {
          setContractAddress(def.address || '');
          setContractName(def.name || 'PMarket');
          setIsDefault(def.isDefault || false);
       
        } else if (defaultContractEnv) {
          setContractAddress(defaultContractEnv.toLowerCase());
          setContractName('PMarket');
          setIsDefault(true);
        }
        // Load off-chain balance
        try {
          const bal = await fetchUserBalance();
          if (bal) setBalance(bal);
        } catch (e) {
          // ignore lấy số dư thất bại
        }
      } catch (err) {
        setError(err.message || 'Không thể tải dữ liệu ví HScoin.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const loadTokenBalance = useCallback(async () => {
    if (!walletAddress || !contractAddress) {
      setTokenBalance(null);
      setLoadingTokenBalance(false);
      return;
    }
    setLoadingTokenBalance(true);
    try {
      const tokenBal = await fetchTokenBalance({
        contractAddress,
        walletAddress,
      });
      setTokenBalance(tokenBal ?? null);
    } catch {
      setTokenBalance(null);
    } finally {
      setLoadingTokenBalance(false);
    }
  }, [walletAddress, contractAddress]);

  useEffect(() => {
    loadTokenBalance();
  }, [loadTokenBalance]);

  const toWei = (amount) => {
    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 0) return null;
    try {
      // tránh lỗi float: val * 1e18 = (val * 1e6) * 1e12
      return (BigInt(Math.round(val * 1e6)) * 10n ** 12n).toString();
    } catch {
      return null;
    }
  };

  const handleMintSelf = async () => {
    if (!walletAddress) {
      toast.error('Vui lòng kết nối ví HScoin trước khi mint.');
      connectWallet();
      return;
    }
    if (!contractAddress) {
      toast.error('Vui lòng nhập hoặc lưu contract HScoin trước khi mint.');
      return;
    }
    const wei = toWei(mintAmount);
    if (!wei) {
      toast.error('Số lượng mint không hợp lệ.');
      return;
    }
    try {
      await mintSelfToken({
        amountWei: wei,
        caller: walletAddress,
        contractAddress,
      });
      toast.success(`Đã mint ${mintAmount} PMK vào ví.`);
      await loadTokenBalance();
    } catch (err) {
      toast.error(err.message || 'Mint thất bại.');
    }
  };

  const stats = useMemo(() => {
    const base = { locked: 0, released: 0, refunded: 0 };
    events.forEach((event) => {
      if (event.escrow?.status === 'RELEASED') base.released += Number(event.totalAmount || 0);
      else if (event.escrow?.status === 'REFUNDED') base.refunded += Number(event.totalAmount || 0);
      else base.locked += Number(event.totalAmount || 0);
    });
    return base;
  }, [events]);


  const copyHash = async (hash) => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      toast.success('Đã sao chép TxHash');
    } catch {
      toast.error('Không thể sao chép');
    }
  };

  const handleSaveContract = async () => {
    if (!contractAddress.trim()) {
      toast.error('Vui lòng nhập contract address');
      return;
    }
    setSavingContract(true);
    try {
      const data = await saveUserContract({
        name: contractName || 'PMarket',
        address: contractAddress,
        isDefault,
      });
      toast.success('Đã lưu contract mặc định');
      const list = await fetchUserContracts();
      setContracts(list || []);
    } catch (err) {
      toast.error(err.message || 'Không thể lưu contract');
    } finally {
      setSavingContract(false);
    }
  };

  const handleAutoDeploy = async () => {
    if (!isConnected || !walletAddress) {
      toast.error('Vui lòng liên kết ví HScoin trước khi deploy.');
      connectWallet();
      return;
    }
    setDeploying(true);
    try {
      const data = await deployContract({
        sourceCode,
        contractName,
      });
      const addr =
        data?.contractAddress ||
        data?.address;
      if (addr) {
        setContractAddress(addr);
        toast.success(`Deploy thành công: ${addr}`);
        const list = await fetchUserContracts();
        setContracts(list || []);
      } else {
        toast.success('Deploy thành công');
      }
    } catch (err) {
      toast.error(err.message || 'Không thể deploy contract');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-emerald-600 font-semibold">Ví HScoin giả lập</p>
        <h1 className="text-2xl font-bold">Dòng tiền escrow của bạn</h1>
        <p className="text-sm text-gray-600">
          Toàn bộ giao dịch mua bán trên P-Market đều đi qua hợp đồng escrow HScoin. Trang này giúp bạn theo dõi trạng thái
          lock/release trước khi đồng bộ lên mạng blockchain thật.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase text-emerald-600 font-semibold">Trạng thái ví HScoin</p>
            {isConnected && walletAddress ? (
              <div>
                <p className="text-sm text-gray-600">Địa chỉ đã liên kết:</p>
                <p className="font-mono text-sm text-gray-900 break-all">{walletAddress}</p>
                {tokenBalance !== null && (
                  <div className="mt-2 text-sm text-gray-700 space-y-1">
                    <p>
                      Số dư PMK:{' '}
                      <span className="font-semibold">
                        {((Number(tokenBalance) || 0) / 1e18).toLocaleString('vi-VN', {
                          maximumFractionDigits: 6,
                        })}
                      </span>{' '}
                      PMK
                    </p>
                    <p className="text-xs text-gray-500">
                      Ước tính:{' '}
                      {tokenBalance
                        ? `${((Number(tokenBalance) / 1e18) * 2170).toLocaleString('vi-VN')} đ`
                        : '—'}
                    </p>
                  </div>
                )}
                {loadingTokenBalance && (
                  <p className="text-xs text-gray-500 mt-1">Đang tải số dư...</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Bạn chưa liên kết ví HScoin. Liên kết ví để thực hiện ký quỹ escrow và xem số dư blockchain.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {isConnected ? (
              <>
                <Button variant="secondary" onClick={connectWallet}>
                  Thay đổi ví
                </Button>
                <Button variant="ghost" onClick={disconnectWallet}>
                  Hủy liên kết
                </Button>
              </>
            ) : (
              <Button onClick={connectWallet} disabled={isLoadingWallet}>
                <WalletIcon size={16} className="mr-2" />
                {isLoadingWallet ? 'Đang kiểm tra…' : 'Liên kết ví HScoin'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Đang khóa</p>
              <p className="text-2xl font-bold text-gray-900">{currency.format(stats.locked || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Off-chain: {currency.format(balance.lockedBalance || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Đã giải phóng</p>
              <p className="text-2xl font-bold text-gray-900">{currency.format(stats.released || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <History size={18} />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Hoàn trả</p>
              <p className="text-2xl font-bold text-gray-900">{currency.format(stats.refunded || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử escrow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Đang tải lịch sử giao dịch…
            </p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có giao dịch nào.</p>
          ) : (
            events.map((event) => (
              <div
                key={event.orderId}
                className="border border-gray-100 rounded-lg p-4 grid gap-2 md:grid-cols-4 md:items-center"
              >
                <div>
                  <p className="text-xs text-gray-500 uppercase">Mã đơn</p>
                  <p className="font-semibold text-gray-900">#{event.orderId}</p>
                  <p className="text-xs text-gray-500">
                    {event.orderDate ? new Date(event.orderDate).toLocaleString('vi-VN') : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Giá trị</p>
                  <p className="font-semibold text-primary">{currency.format(event.totalAmount || 0)}</p>
                  <p className="text-xs text-gray-500">Trạng thái: {event.escrow?.status || 'LOCKED'}</p>
                </div>
                <div className="font-mono text-xs text-gray-700 break-all">
                  <p className="text-gray-500 uppercase">TxHash</p>
                  <button
                    type="button"
                    onClick={() => copyHash(event.escrow?.txHash)}
                    className="inline-flex items-center gap-1 text-primary font-semibold"
                  >
                    {event.escrow?.txHash}
                    <Copy size={12} />
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  <p>Block #{event.escrow?.blockNumber}</p>
                  <p>Gas: {event.escrow?.gasUsed}</p>
                  <p>Mạng: {event.escrow?.network}</p>
                  {event.escrow?.timestamp && (
                    <p>
                      Thời gian:{' '}
                      {new Date(event.escrow.timestamp).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hợp đồng HScoin của bạn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Tên hợp đồng</label>
            <input
              type="text"
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="PMarket"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Địa chỉ contract</label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="w-full rounded-md border px-3 py-2 font-mono text-xs"
              placeholder="0x..."
            />
            <p className="text-xs text-gray-500">
              Mỗi user dùng 1 contract. Nếu chưa có, hãy deploy trên HScoin rồi nhập địa chỉ vào đây.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4"
            />
            Đặt làm contract mặc định
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={handleSaveContract} disabled={savingContract}>
              {savingContract ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Lưu contract
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAutoDeploy}
              disabled={deploying}
            >
              {deploying ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Deploy tự động (PMarket)
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Source code</label>
            <textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              rows={12}
              className="w-full rounded-md border px-3 py-2 font-mono text-xs"
            />
            <p className="text-xs text-gray-500">
              Nếu chưa có contract, bấm &quot;Deploy tự động&quot; để biên dịch + deploy PMarket bằng ví đã liên kết. Contract PMarket có sẵn Escrow (deposit/release/refund) cho mua bán và burn để đăng sản phẩm.
            </p>
          </div>

          {contracts.length > 0 && (
            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <p className="font-semibold">Contract đã lưu (tối đa 5 gần nhất):</p>
              {contracts.slice(0, 5).map((c) => (
                <div
                  key={c.contractId}
                  className="rounded-md border px-3 py-2 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="font-mono text-xs break-all">{c.address}</p>
                    <p className="text-xs text-gray-500">{c.network || 'HScoin Devnet'}</p>
                  </div>
                  {c.isDefault && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                      Mặc định
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 border rounded-lg space-y-3">
            <h3 className="font-semibold text-gray-800">Mint PMK (devnet test)</h3>
            <p className="text-xs text-gray-600">
              Mint token nội bộ vào ví hiện tại để thử escrow bằng PMK.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                className="w-32 rounded border px-3 py-2 text-sm"
              />
              <Button size="sm" onClick={handleMintSelf} disabled={!walletAddress}>
                Mint vào ví
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
