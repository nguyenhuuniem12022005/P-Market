'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProductCard from '../../../components/product/ProductCard';
import { Card, CardContent } from '../../../components/ui/Card';
import { fetchCategories, searchProducts } from '../../../lib/api';

const slugify = (text = '') =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug;
  const [categoryName, setCategoryName] = useState('Đang tải...');
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const categories = await fetchCategories();
        const matched = categories.find(
          (category) => slugify(category.categoryName) === slug,
        );

        if (matched) {
          setCategoryName(matched.categoryName);
          const { items } = await searchProducts({ categoryId: matched.categoryId });
          setProducts(items);
        } else {
          setCategoryName('Kết quả tìm kiếm');
          const { items } = await searchProducts({ q: slug });
          setProducts(items);
        }
      } catch (error) {
        console.error(error);
        setCategoryName('Danh mục');
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [slug]);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Danh mục: {categoryName}</h1>

        {isLoading ? (
          <Card>
            <CardContent className="p-10 text-center text-gray-500">
              Đang tải sản phẩm...
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-gray-500">
              Hiện chưa có sản phẩm nào trong danh mục này.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {products.map((product) => (
              <ProductCard key={product.productId || product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
