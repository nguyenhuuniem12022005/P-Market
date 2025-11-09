import Link from 'next/link';
import Image from 'next/image';
import { Card } from '../ui/Card';

const FALLBACK_IMAGE = 'https://placehold.co/600x400/eee/31343C?text=P-Market';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3001';

function resolveImage(product) {
  if (product.thumbnail) {
    const normalized = product.thumbnail.replace(/^public\//, '');
    return `${API_BASE}/${normalized}`;
  }
  if (product.imageUrl) return product.imageUrl;
  return FALLBACK_IMAGE;
}

export default function ProductCard({ product }) {
  const productId = product.productId || product.id;
  const title = product.productName || product.title || 'Sản phẩm';
  const priceValue = product.unitPrice ?? product.price ?? 0;
  const isFree = Number(priceValue) === 0;
  const imageUrl = resolveImage(product);

  return (
    <Link href={`/products/${productId}`} className="block h-full">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg flex flex-col">
        <div className="relative w-full h-40 md:h-48">
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            style={{ objectFit: 'cover' }}
          />
          {isFree && (
            <span className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
              CHO TẶNG
            </span>
          )}
        </div>
        <div className="p-2 md:p-4 flex flex-col flex-grow">
          <h3 className="text-sm md:text-base font-medium text-gray-800 line-clamp-2" title={title}>
            {title}
          </h3>
          <div className="flex-grow" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-base md:text-lg font-bold text-primary">
              {isFree ? 'Miễn phí' : `${Number(priceValue).toLocaleString('vi-VN')} ₫`}
            </span>
            <span className="text-xs text-gray-500">Cập nhật gần đây</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
