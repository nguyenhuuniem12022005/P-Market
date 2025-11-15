'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import ReviewCard from '../../../components/product/ReviewCard';
import { ShoppingCart, Star, ShieldCheck, Handshake, MessageCircle, Loader2 } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { useWallet } from '../../../context/WalletContext';
import { getProductById, getReviewsByProductId, buildAvatarUrl, executeSimpleToken } from '../../../lib/api';
import { resolveProductImage } from '../../../lib/image';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import toast from 'react-hot-toast';

const FALLBACK_IMAGE = 'https://placehold.co/600x400/eee/31343C?text=P-Market';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useCart();
  const { isConnected, connectWallet, walletAddress } = useWallet();
  const [isEscrowProcessing, setIsEscrowProcessing] = useState(false);

  // --- Fetch dữ liệu ---
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      if (params.id) {
        setIsLoading(true);
        try {
          const productData = await getProductById(params.id);
          const reviewsData = await getReviewsByProductId(params.id);
          if (isMounted) {
            setProduct(productData);
            setReviews(reviewsData);
          }
        } catch (error) {
          console.error("Lỗi khi tải chi tiết sản phẩm:", error);
          if (isMounted) setProduct(null);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [params.id]);

  const title = product?.productName || product?.title || 'Sản phẩm';
  const description = product?.description || 'Không có mô tả';
  const priceValue = product?.unitPrice ?? product?.price ?? 0;
  const totalQuantity = product?.totalQuantity ?? 0;
  const sellerName = product?.seller?.userName || product?.seller?.shopName || product?.userName || product?.shopName || 'Người bán ẩn danh';
  const sellerReputation = product?.seller?.reputationScore ?? product?.reputationScore ?? 'Chưa có';
  const sellerAvatar = buildAvatarUrl(product?.seller?.avatar);
  const productImage = resolveProductImage(product, FALLBACK_IMAGE);

  // --- Các handler ---
  const handleWriteReview = () => alert("Chức năng đánh giá sẽ có sau khi mua hàng thành công!");
  const handleAddToCart = () => { 
    if (!product) return;

    const cartProduct = {
      id: product.productId || product.id,
      productId: product.productId || product.id,
      productName: product.productName || product.title,
      title: product.productName || product.title,
      unitPrice: Number(product.unitPrice ?? product.price ?? 0),
      imageURL: product.imageURL,
      thumbnail: product.thumbnail
    };

    addToCart(cartProduct);
    alert(`Đã thêm "${cartProduct.productName || cartProduct.title}" vào giỏ hàng!`);
  };
  
  const handleContactSeller = () => {
    // Chuyển đến trang chat với người bán
    router.push(`/chat?product=${params.id}`);
  };
  
  const handleDirectPurchase = () => {
    // Mua trực tiếp = liên hệ với người bán
    handleContactSeller();
  };
  
  const handleEscrowPurchase = async () => {
    if (!isConnected || !walletAddress) {
      toast.error('Vui lòng kết nối ví HScoin trước khi mua!');
      connectWallet();
      return;
    }
    const burnAmount = Math.max(1, Math.round(Number(priceValue) || 1));
    setIsEscrowProcessing(true);
    try {
      await executeSimpleToken({
        caller: walletAddress,
        method: 'burn',
        args: [walletAddress, burnAmount],
        value: 0,
      });
      toast.success('Đã khóa HScoin cho giao dịch escrow!');
      // TODO: gọi API tạo đơn hàng thật sau khi tích hợp hoàn chỉnh
    } catch (error) {
      console.error('Escrow burn error:', error);
      toast.error(error.message || 'Không thể thực hiện giao dịch HScoin.');
    } finally {
      setIsEscrowProcessing(false);
    }
  };

  // --- Loading Skeleton ---
  if (isLoading) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Cột trái */}
          <div className="lg:col-span-2 space-y-8">
            <Card><CardContent className="p-0"><Skeleton height={400} /></CardContent></Card>
            <Card><CardContent className="p-6"><Skeleton count={4} /></CardContent></Card>
            <Card><CardContent className="p-6"><Skeleton height={30} width="60%" style={{ marginBottom: '1rem' }}/><Skeleton count={2} height={80}/></CardContent></Card>
            <Card><CardContent className="p-4"><Skeleton circle height={40} width={40} inline style={{ marginRight: '1rem' }}/><Skeleton width="150px"/></CardContent></Card>
          </div>
          {/* Cột phải */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="sticky top-24"><CardContent className="p-6 space-y-4">
              <Skeleton height={30} width="70%" />
              <Skeleton height={40} width="40%" />
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
            </CardContent></Card>
          </div>
        </div>
      </div>
    );
  }

  // --- Không tìm thấy sản phẩm ---
  if (!product) {
    return (
      <div className="py-8 px-4 text-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8">
            <p className="text-lg text-gray-600 mb-4">Không tìm thấy sản phẩm.</p>
            <Button onClick={() => router.push('/home')}>Quay lại trang chủ</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Nội dung chính ---
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* === Cột Trái === */}
        <div className="lg:col-span-2 space-y-8">
          {/* Ảnh sản phẩm */}
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-lg">
              <div className="relative w-full">
                <Image
                  src={productImage}
                  alt={title}
                  width={1200}
                  height={675}
                  className="w-full h-auto object-cover aspect-video md:aspect-[16/9]"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                />
              </div>
            </CardContent>
          </Card>

          {/* Mô tả từ người bán */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Mô tả sản phẩm</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {description}
              </p>
            </CardContent>
          </Card>

          {/* Đánh giá & Bình luận */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Đánh giá & Bình luận</h2>
                <Button variant="outline" size="sm" onClick={handleWriteReview}>
                  <Star size={16} className="mr-2" /> Viết đánh giá
                </Button>
              </div>
              
              {/* Hiển thị số sao trung bình */}
              {reviews.length > 0 && (
                <div className="mb-6 pb-6 border-b">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold">
                      {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={20}
                            className={i < Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">{reviews.length} đánh giá</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Danh sách đánh giá */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-2">Chưa có đánh giá nào cho sản phẩm này.</p>
                    <p className="text-sm text-gray-500">Hãy là người đầu tiên đánh giá sau khi mua hàng!</p>
                  </div>
                ) : (
                  reviews.map((review) => (<ReviewCard key={review.id} review={review} />))
                )}
              </div>
            </CardContent>
          </Card>

          {/* --- Thông tin người bán --- */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Thông tin người bán</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar src={sellerAvatar} size="lg" />
                  <div>
                    <h4 className="font-semibold text-lg">{sellerName}</h4>
                    <p className="text-sm text-gray-600">
                      Điểm uy tín: <span className="font-medium text-primary">{sellerReputation}</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleContactSeller}
                  className="flex items-center gap-2"
                >
                  <MessageCircle size={18} />
                  Liên hệ 
                </Button>
              </div>
            </CardContent>
          </Card>

          {product?.stores?.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-2">
                <h3 className="text-lg font-semibold">Kho hàng</h3>
                <p className="text-sm text-gray-600">
                  Sản phẩm đang có tại {product.stores.length} kho:
                </p>
                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                  {product.stores.map((store) => (
                    <li key={`${store.warehouseId}-${store.productId}`}>
                      {store.warehouseName}: <span className="font-semibold">{store.quantity}</span> sản phẩm
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* === Cột Phải (Phần mua hàng) === */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-24 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <h1 className="text-2xl font-bold leading-tight">{title}</h1>
              <p className="text-3xl text-primary font-semibold">
                {Number(priceValue) === 0
                  ? 'Miễn phí'
                  : `${Number(priceValue).toLocaleString('vi-VN')} ₫`}
              </p>
              <p className="text-sm text-gray-600">
                Số lượng còn lại:{' '}
                <span className="font-semibold">
                  {totalQuantity > 0 ? totalQuantity : 'Đang cập nhật'}
                </span>
              </p>

              {/* Nút Mua an toàn với Escrow */}
              <Button
                size="lg"
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 focus:ring-green-500"
                onClick={handleEscrowPurchase}
                disabled={isEscrowProcessing}
              >
                {isEscrowProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Đang ký quỹ...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} /> Mua an toàn (Escrow)
                  </>
                )}
              </Button>

              {/* Nút Mua trực tiếp = Liên hệ người bán */}
              <Button
                size="lg"
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleDirectPurchase}
              >
                <Handshake size={20} /> Mua trực tiếp
              </Button>

              {/* Nút Thêm vào giỏ hàng */}
              <Button
                size="lg"
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleAddToCart}
              >
                <ShoppingCart size={20} /> Thêm vào giỏ hàng
              </Button>

              {/* Nút Liên hệ người bán */}
              <div className="pt-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-center gap-2 text-primary hover:bg-primary/10"
                  onClick={handleContactSeller}
                >
                  <MessageCircle size={20} /> Chat 
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
