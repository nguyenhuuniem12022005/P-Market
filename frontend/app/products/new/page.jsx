'use client';
import { useState, useEffect } from 'react';
import { Container } from '../../../components/ui/Container';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import ConnectWalletButton from '../../../components/blockchain/ConnectWalletButton';
import { useWallet } from '../../../context/WalletContext';
import { Leaf, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { createProduct, fetchCategories } from '../../../lib/api';

export default function CreateProductPage() {
  const { isConnected } = useWallet();
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('Mới (Chưa sử dụng)');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isGiveAway = condition.toLowerCase().includes('cho tặng');

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await fetchCategories();
        setCategories(data);
        if (data.length > 0) {
          setCategory(String(data[0].categoryId));
        }
      } catch (error) {
        toast.error(error.message || 'Không tải được danh mục.');
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (isGiveAway) {
      setPrice('0');
    }
  }, [isGiveAway]);

  // --- Validation ---
  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Tên sản phẩm không được để trống.';
    if (!price.trim()) newErrors.price = 'Giá không được để trống.';
    else if (isNaN(Number(price)) || Number(price) < 0) newErrors.price = 'Giá phải là số không âm.';
    if (!quantity.trim()) newErrors.quantity = 'Số lượng không được để trống.';
    else if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) newErrors.quantity = 'Số lượng phải là số nguyên dương.';
    if (description.trim().length > 0 && description.trim().length < 10) newErrors.description = 'Mô tả nên dài ít nhất 10 ký tự.';
    if (!category) newErrors.category = 'Vui lòng chọn danh mục.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin.');
      return;
    }

    if (!isConnected) {
      toast.error('Vui lòng liên kết ví trước khi đăng bài.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        productName: title.trim(),
        categoryId: Number(category),
        description: condition
          ? `Tình trạng: ${condition}\n${description.trim()}`
          : description.trim(),
        unitPrice: Number(price),
        quantity: Number(quantity),
        status: 'Active',
        discount: 0,
        size: null,
      };

      await createProduct(payload);
      toast.success('Đăng bài thành công!');
      router.push('/home');
    } catch (error) {
      toast.error(error.message || 'Không thể đăng bài.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-8">
      <form onSubmit={handleSubmit}>
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader><CardTitle>Đăng bán / Cho tặng</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="title">Tên sản phẩm</label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1 ${errors.title ? 'border-red-500' : ''}`} />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
              </div>
              {/* Category & Condition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category">Danh mục</label>
                  <Select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1"
                    disabled={isLoadingCategories || categories.length === 0}
                  >
                    {categories.map((cat) => (
                      <option key={cat.categoryId} value={cat.categoryId}>
                        {cat.categoryName}
                      </option>
                    ))}
                  </Select>
                  {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
                </div>
                <div>
                  <label htmlFor="condition">Tình trạng</label>
                  <Select
                    id="condition"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="mt-1"
                  >
                    {[
                      'Mới (Chưa sử dụng)',
                      'Đã qua sử dụng (Còn tốt)',
                      'Thanh lý / Cho tặng',
                    ].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              {/* Green Credit Notice */}
              {isGiveAway && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2 text-green-700 text-sm">
                  <Leaf size={20} /> Cho tặng sẽ giúp bạn nhận thêm Green Credit và điểm uy tín.
                </div>
              )}
              {/* Description */}
              <div>
                <label htmlFor="description">Mô tả</label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className={`mt-1 ${errors.description ? 'border-red-500' : ''}`} />
                 {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
              </div>
              {/* Price & Quantity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="price">Giá (VNĐ)</label>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      readOnly={isGiveAway}
                      className={`mt-1 ${errors.price ? 'border-red-500' : ''}`}
                    />
                    {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
                 </div>
                 <div>
                    <label htmlFor="quantity">Số lượng</label>
                    <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`mt-1 ${errors.quantity ? 'border-red-500' : ''}`} />
                     {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>}
                 </div>
              </div>
              {/* Image Upload */}
              <div> {/* ... (Image upload UI) ... */} </div>
            </div>
            <hr />
            {/* Wallet Connection */}
            <div className="space-y-4">
              <ConnectWalletButton />
              {!isConnected && (
                <p className="text-sm text-gray-500">
                  Bạn cần liên kết ví để hoàn tất việc đăng bài. Điều này giúp đảm bảo an toàn giao dịch cho cả hai bên.
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" size="lg" disabled={!isConnected || isSubmitting}>
               {isSubmitting ? <Loader2 className="animate-spin mr-2" size={20}/> : null}
               {isSubmitting ? 'Đang đăng...' : (isConnected ? 'Hoàn tất & Đăng bài' : 'Đăng bài (Cần liên kết ví)')}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Container>
  );
}
