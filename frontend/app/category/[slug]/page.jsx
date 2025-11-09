'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import ProductCard from '../../../components/product/ProductCard';
import { Card, CardContent } from '../../../components/ui/Card';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { searchProducts, fetchCategories } from '../../../lib/api';
import toast from 'react-hot-toast';

const getCategoryName = (slug) => {
  const categoryMap = {
    'books': 'Sách vở',
    'electronics': 'Đồ điện tử',
    'housing': 'Phòng trọ',
    'fashion': 'Thời trang'
  };
  return categoryMap[slug] || 'Danh mục';
};

// THÊM function mapping slug sang categoryId
const getCategoryId = (slug) => {
  const categoryMap = {
    'books': 1,           // Sách & Văn phòng phẩm
    'electronics': 2,     // Đồ điện tử
    'fashion': 3,         // Thời trang
    'housing': 4,         // Đồ gia dụng / Phòng trọ
    'sports': 5,          // Thể thao
    'other': 6            // Khác
  };
  return categoryMap[slug] || null;
};

export default function CategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const searchQuery = searchParams.get('q');
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState(getCategoryName(slug));

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        let result;
        
        if (searchQuery) {
          // Tìm kiếm theo từ khóa
          result = await searchProducts({ searchTerm: searchQuery });
          setCategoryName(`Kết quả tìm kiếm: "${searchQuery}"`);
        } else {
          // Tìm kiếm theo categoryId (ĐÃ SỬA)
          const categoryId = getCategoryId(slug);
          result = await searchProducts({ categoryId: categoryId });
          setCategoryName(getCategoryName(slug));
        }

        if (result && result.success) {
          setProducts(result.items || []);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Error loading products:', error);
        toast.error('Không thể tải sản phẩm!');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [slug, searchQuery]);

  if (loading) {
    return (
      <div className="py-8 px-4 flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">{categoryName}</h1>

        {products.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-gray-500">
              Hiện chưa có sản phẩm nào.
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Tìm thấy {products.length} sản phẩm
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {products.map((product) => (
                <ProductCard 
                  key={product.productId} 
                  product={{
                    id: product.productId,
                    title: product.productName,
                    price: product.unitPrice,
                    imageUrl: product.imageUrl || 'https://placehold.co/600x400/e9d5ff/31343C?text=Product',
                    seller: {
                      name: product.userName || 'Người bán'
                    }
                  }} 
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}