'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Sprout, Award, ShieldCheck, TrendingUp, Loader2 } from 'lucide-react';
import { fetchGreenCreditSummary, requestGreenCreditSync } from '../../../lib/api';

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(value);
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    : 'Chưa có dữ liệu';

export default function GreenCreditPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState({ status: 'idle', message: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchGreenCreditSummary();
        setSummary(data);
      } catch (err) {
        setError(err.message || 'Không thể tải dữ liệu green credit.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSync = async () => {
    try {
      setSyncState({ status: 'loading', message: '' });
      const response = await requestGreenCreditSync('Manual sync from dashboard');
      setSyncState({
        status: 'success',
        message: `Đã xếp lịch ghi on-chain vào ${formatDateTime(response?.scheduledFor)}`,
      });
    } catch (err) {
      setSyncState({ status: 'error', message: err.message || 'Không thể gửi yêu cầu.' });
    }
  };

  const perks = summary?.perks || [];
  const audits = summary?.audits || [];
  const contributions = summary?.contributions || [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-emerald-600 font-semibold">P-Market → Blockchain readiness</p>
        <h1 className="text-2xl font-bold">Green Credit &amp; Bền vững</h1>
        <p className="text-sm text-gray-600">
          Điểm xanh của bạn sẽ được đồng bộ sang HScoin để làm bằng chứng minh bạch khi tham gia escrow, staking hay nhận ưu đãi.
        </p>
      </header>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-emerald-600">
              <Sprout size={18} />
              <span className="text-sm font-semibold uppercase">Điểm hiện tại</span>
            </div>
            <div>
              <p className="text-4xl font-bold text-gray-900">
                {loading ? '…' : formatNumber(summary?.score ?? 0)}
              </p>
              <p className="text-sm text-gray-600">Hạng: {summary?.tier || 'Đang tải...'}</p>
              <p className="text-xs text-gray-500 mt-1">
                Đồng bộ gần nhất: {formatDateTime(summary?.lastSyncedAt)}
              </p>
              <p className="text-xs text-gray-500">
                Cửa sổ tiếp theo: {formatDateTime(summary?.nextWindow)}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSync}
              disabled={syncState.status === 'loading'}
            >
              {syncState.status === 'loading' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Đang gửi yêu cầu…
                </span>
              ) : (
                'Đề nghị ghi on-chain'
              )}
            </Button>
            {syncState.message && (
              <p className={`text-xs ${syncState.status === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                {syncState.message}
              </p>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Ưu đãi sắp mở khóa</p>
              {loading ? (
                <p className="text-sm text-gray-500">Đang tải…</p>
              ) : (
                <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                  {perks.map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center gap-2 text-emerald-600">
            <ShieldCheck size={18} />
            <span className="font-semibold text-sm uppercase">Lộ trình kiểm định</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500">Đang tải audit events…</p>
            ) : (
              audits.map((event) => (
                <div key={event.id} className="border border-emerald-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-600">{event.detail}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        event.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : event.status === 'In-progress'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-2 text-emerald-600">
          <TrendingUp size={18} />
          <span className="font-semibold text-sm uppercase">Hoạt động gần đây</span>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Đang tải log hoạt động…</p>
          ) : (
            contributions.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-gray-100 pb-3"
              >
                <div>
                  <p className="font-semibold text-gray-900">{entry.type}</p>
                  <p className="text-xs text-gray-500">Mã theo dõi: {entry.id}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-600 font-semibold">
                    {entry.carbon > 0 ? `+${entry.carbon}` : `${entry.carbon}`}kg CO₂
                  </span>
                  <span className="text-primary font-semibold">
                    {entry.tokens > 0 ? `+${entry.tokens}` : `${entry.tokens}`} HSC
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2 text-emerald-600">
          <Award size={18} />
          <span className="font-semibold text-sm uppercase">Kết nối userflow</span>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>• Liên kết với luồng <strong>Đăng bán</strong>: người bán đính kèm chứng nhận ngay khi tạo sản phẩm.</p>
          <p>• Liên kết với luồng <strong>Mua bán</strong>: điểm được cộng sau mỗi đơn escrow hoàn tất.</p>
          <p>• Liên kết với luồng <strong>Green Credit</strong>: dữ liệu ở đây sẽ được đưa lên smart contract HScoin.</p>
        </CardContent>
      </Card>
    </div>
  );
}
