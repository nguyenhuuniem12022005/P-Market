/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card';
import { fetchMyOrders } from '../../../lib/api';
import { Package, Truck, ExternalLink, Loader2, Shield, AlertTriangle } from 'lucide-react';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const HSCOIN_CONTRACT_URL = 'https://hsc-w3oq.onrender.com/auth/contract.html';
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

const statusBadge = {
  Pending: 'bg-amber-100 text-amber-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-gray-100 text-gray-600',
};

const buildProductImage = (src) => {
  if (!src) return '/placeholder.png';
  if (/^(https?:|data:)/i.test(src)) return src;
  const cleaned = src.replace(/^public\//i, '').replace(/^\/+/, '');
  return `${API_BASE}/${cleaned}`;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchMyOrders();
        setOrders(data || []);
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách đơn hàng.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const copyHash = async (hash) => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      toast.success('Đã sao chép mã giao dịch');
    } catch {
      toast.error('Không thể sao chép mã giao dịch');
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-primary font-semibold">Flow #3 · Escrow &amp; giao dịch</p>
        <h1 className="text-2xl font-bold">Đơn mua của bạn</h1>
        <p className="text-sm text-gray-600">
          Mỗi đơn hàng đều giữ tiền trong escrow HScoin cho tới khi bạn xác nhận. Xem hash, block và hợp đồng ngay bên dưới.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-gray-600 flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Đang tải danh sách đơn hàng…
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">Bạn chưa có đơn hàng nào.</CardContent>
        </Card>
      ) : (
        orders.map((order) => {
          const badgeClass = statusBadge[order.status] || statusBadge.Pending;
          const icon =
            order.status === 'Completed' ? (
              <Package size={16} className="inline mr-1" />
            ) : (
              <Truck size={16} className="inline mr-1" />
            );
          const hscoinCall = order.hscoinCall;
          const hscoinStatus = hscoinCall?.status || order.escrow?.status || 'LOCKED';
          const nextRunText = hscoinCall?.nextRunAt
            ? new Date(hscoinCall.nextRunAt).toLocaleString('vi-VN')
            : 'Đang chờ HScoin';

          return (
            <Card key={order.orderId}>
              <CardHeader className="flex flex-col gap-2 border-b border-gray-100 pb-4">
                <div className="flex flex-wrap items-center justify-between text-sm text-gray-600 gap-2">
                  <span>
                    Mã đơn: <strong>#{order.orderId}</strong>
                  </span>
                  <span>
                    Ngày đặt:{' '}
                    {order.orderDate ? new Date(order.orderDate).toLocaleString('vi-VN') : 'Không xác định'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                    {icon}
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Người bán: <span className="font-semibold">{order.seller?.name || '—'}</span>
                </p>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {order.items?.map((item) => (
                  <div key={item.orderDetailId} className="flex items-center gap-4">
                    <img
                      src={buildProductImage(item.imageURL)}
                      alt={item.productName}
                      className="h-20 w-20 rounded-md object-cover border border-gray-100"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-500">
                        SL: {item.quantity} · Đơn giá: {currency.format(item.unitPrice || 0)}
                      </p>
                    </div>
                    <p className="font-semibold text-primary">
                      {currency.format((item.unitPrice || 0) * (item.quantity || 0))}
                    </p>
                  </div>
                ))}

                <div className="border-t border-gray-100 pt-4 grid gap-3 md:grid-cols-2">
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      Tổng thanh toán:{' '}
                      <span className="font-semibold text-gray-900">{currency.format(order.totalAmount || 0)}</span>
                    </p>
                    <p>Địa chỉ giao: {order.shippingAddress || 'Chưa cập nhật'}</p>
                    <Link href={`/dashboard/orders/${order.orderId}`} className="text-primary text-xs font-semibold">
                      Xem chi tiết đơn
                    </Link>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-gray-700 space-y-1">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <Shield size={14} /> Escrow HScoin
                    </div>
                    <p>
                      Trạng thái: <strong>{hscoinStatus}</strong>
                    </p>
                    {hscoinCall?.status === 'QUEUED' && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle size={12} /> Lần thử tiếp: {nextRunText}
                      </p>
                    )}
                    {hscoinCall?.status === 'FAILED' && (
                      <p className="text-xs text-rose-600 flex items-center gap-1">
                        <AlertTriangle size={12} /> Lỗi: {hscoinCall.lastError || 'HScoin từ chối giao dịch.'}
                      </p>
                    )}
                    {hscoinCall?.callId && (
                      <p className="text-xs">HScoin call ID: #{hscoinCall.callId}</p>
                    )}
                    {order.escrow?.txHash ? (
                      <>
                        <p>
                          Tx Hash:{' '}
                          <button
                            type="button"
                            onClick={() => copyHash(order.escrow?.txHash)}
                            className="font-mono text-xs text-primary underline"
                          >
                            {order.escrow?.txHash?.slice(0, 12)}…
                          </button>
                        </p>
                        <p>
                          Block #{order.escrow?.blockNumber || '—'} · {order.escrow?.network || 'HScoin'}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-600">
                        Chưa có hash on-chain. Lệnh burn sẽ tự cập nhật khi HScoin xử lý xong.
                      </p>
                    )}
                    <Link
                      href={HSCOIN_CONTRACT_URL}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Mở trên HScoin <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
