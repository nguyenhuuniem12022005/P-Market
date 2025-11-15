/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ClipboardList, MoveRight, PackageCheck, ShieldCheck, Clock, Loader2 } from 'lucide-react';
import { fetchMyProducts, requestProductAudit } from '../../../lib/api';

const statusConfig = {
  Draft: { label: 'Nháp', className: 'bg-gray-100 text-gray-700' },
  Pending: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700' },
  Active: { label: 'Đang bán', className: 'bg-emerald-100 text-emerald-700' },
  Sold: { label: 'Đã bán hết', className: 'bg-primary/10 text-primary' },
};

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const numberFormat = new Intl.NumberFormat('vi-VN');
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

const buildProductImage = (src) => {
  if (!src) return '/placeholder.png';
  if (/^(https?:|data:)/i.test(src)) return src;
  const cleaned = src.replace(/^public\//i, '').replace(/^\/+/, '');
  return `${API_BASE}/${cleaned}`;
};

export default function MyProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await fetchMyProducts();
        setProducts(data || []);
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách sản phẩm.');
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const stats = useMemo(() => {
    const result = { total: products.length, Draft: 0, Pending: 0, Active: 0 };
    products.forEach((item) => {
      result[item.status] = (result[item.status] || 0) + 1;
    });
    return result;
  }, [products]);

  const handleSubmitForReview = async (productId) => {
    try {
      setUpdatingId(productId);
      await requestProductAudit(productId, {
        note: 'Yêu cầu kiểm duyệt từ dashboard P-Market.',
        attachments: [],
      });
      toast.success('Đã gửi yêu cầu kiểm duyệt. Đội HScoin sẽ phản hồi sớm.');
      setProducts((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? {
                ...item,
                status: 'Pending',
                latestAuditStatus: 'PENDING',
                latestAuditNote: 'Đang chờ kiểm duyệt',
                latestAuditCreatedAt: new Date().toISOString(),
              }
            : item
        )
      );
    } catch (err) {
      toast.error(err.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-primary font-semibold">Flow #2 · Đăng bán sản phẩm</p>
        <h1 className="text-2xl font-bold">Quản lý sản phẩm của bạn</h1>
        <p className="text-sm text-gray-600">
          Hoàn thiện mô tả, gửi kiểm duyệt rồi kích hoạt trên HScoin escrow marketplace. Danh sách bên dưới thể
          hiện rõ trạng thái từng bước để chuẩn bị đưa dữ liệu lên blockchain.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <ClipboardList size={18} />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Tổng sản phẩm</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '…' : stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Chờ duyệt</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '…' : stats.Pending || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Đang bán</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '…' : stats.Active || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-gray-600 flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Đang tải danh sách sản phẩm…
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">Bạn chưa đăng sản phẩm nào.</CardContent>
        </Card>
      ) : (
        products.map((product) => {
          const badge = statusConfig[product.status] || statusConfig.Draft;
          return (
            <Card key={product.productId}>
              <CardHeader className="flex flex-col gap-2 border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{product.productName}</CardTitle>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{product.categoryName || 'Chưa phân loại'}</p>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center">
                <img
                  src={buildProductImage(product.imageURL)}
                  alt={product.productName}
                  className="h-24 w-24 rounded-lg object-cover border border-gray-100"
                />
                <div className="flex-1 space-y-2">
                  <div className="text-sm text-gray-600">
                    <p>Giá niêm yết: <span className="font-semibold text-gray-900">{currency.format(product.unitPrice || 0)}</span></p>
                    <p>Kho hiện có: <span className="font-semibold">{numberFormat.format(product.totalQuantity || 0)} đơn vị</span></p>
                    <p>Đã bán: <span className="font-semibold">{numberFormat.format(product.totalSold || 0)} sản phẩm</span></p>
                    <p>Doanh thu ước tính: <span className="font-semibold text-primary">{currency.format(product.totalRevenue || 0)}</span></p>
                  </div>
                  {product.latestAuditStatus && (
                    <div className="text-xs rounded-md border border-dashed border-gray-200 p-3 text-gray-600 bg-gray-50">
                      <p className="font-semibold text-gray-800">
                        Kiểm duyệt gần nhất:{' '}
                        <span
                          className={
                            product.latestAuditStatus === 'APPROVED'
                              ? 'text-emerald-600'
                              : product.latestAuditStatus === 'REJECTED'
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }
                        >
                          {product.latestAuditStatus}
                        </span>
                      </p>
                      {product.latestAuditNote && <p>Ghi chú: {product.latestAuditNote}</p>}
                      {product.latestAuditCreatedAt && (
                        <p>
                          Ngày gửi:{' '}
                          {new Date(product.latestAuditCreatedAt).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Mã sản phẩm #{product.productId} · Cập nhật {new Date(product.updatedAt || product.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  {product.status === 'Draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleSubmitForReview(product.productId)}
                      disabled={updatingId === product.productId}
                    >
                      {updatingId === product.productId ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} /> Đang gửi…
                        </span>
                      ) : (
                        <>
                          <MoveRight size={14} className="mr-1" /> Gửi kiểm duyệt
                        </>
                      )}
                    </Button>
                  )}
                  {product.status === 'Pending' && (
                    <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                      Đội HScoin đang kiểm duyệt giấy tờ của bạn. Hãy chuẩn bị sẵn chứng nhận để đẩy on-chain.
                    </div>
                  )}
                  {product.status === 'Active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSubmitForReview(product.productId, 'Draft')}
                      disabled={updatingId === product.productId}
                    >
                      {updatingId === product.productId ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} /> Đang xử lý…
                        </span>
                      ) : (
                        <>
                          <PackageCheck size={14} className="mr-1" /> Tạm ngưng bán
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
