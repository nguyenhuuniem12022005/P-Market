/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { fetchEscrowEvents } from '../../../lib/api';
import { ShieldCheck, TrendingUp, History, Loader2, Copy, Wallet as WalletIcon } from 'lucide-react';
import { useWallet } from '../../../context/WalletContext';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export default function WalletPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isConnected, walletAddress, connectWallet, disconnectWallet, isLoadingWallet } = useWallet();

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchEscrowEvents();
        setEvents(data || []);
      } catch (err) {
        setError(err.message || 'Không thể tải dữ liệu ví HScoin.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
    </div>
  );
}
