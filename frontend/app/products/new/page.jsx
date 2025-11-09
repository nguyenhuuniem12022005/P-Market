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
import { UploadCloud, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { createProduct } from '../../../lib/api';

export default function CreateProductPage() {
  const { isConnected } = useWallet();
  const router = useRouter();
  const [images, setImages] = useState([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('1');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [discount, setDiscount] = useState('0');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Tên sản phẩm không được để trống.';
    if (!price.trim()) newErrors.price = 'Giá không được để trống.';
    else if (isNaN(Number(price)) || Number(price) < 0) newErrors.price = 'Giá phải là số không âm.';
    if (description.trim().length > 0 && description.trim().length < 10) newErrors.description = 'Mô tả nên dài ít nhất 10 ký tự.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      toast.error('Chỉ được upload tối đa 5 ảnh!');
      return;
    }
    setImages(files);
  };

 const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Tạo FormData để gửi file
      const formData = new FormData();
      formData.append('productName', title);
      formData.append('description', description || '');
      formData.append('unitPrice', Number(price));
      formData.append('categoryId', Number(category));
      formData.append('size', size || '');
      formData.append('status', 'Active');
      formData.append('discount', Number(discount) || 0);
      
      // Thêm ảnh nếu có
      if (images.length > 0) {
        formData.append('image', images[0]); // Upload ảnh đầu tiên
      }

      const result = await createProduct(formData);
      
      if (result.success) {
        toast.success('Đăng bài thành công!');
        router.push('/home');
      } else {
        toast.error(result.message || 'Đăng bài thất bại!');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi đăng bài!');
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
              <div>
                <label htmlFor="title">Tên sản phẩm</label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className={`mt-1 ${errors.title ? 'border-red-500' : ''}`} 
                  placeholder="Nhập tên sản phẩm"
                />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category">Danh mục</label>
                  <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1">
                    <option value="1">Sách & Văn phòng phẩm</option>
                    <option value="2">Đồ điện tử</option>
                    <option value="3">Thời trang</option>
                    <option value="4">Đồ gia dụng</option>
                    <option value="5">Thể thao & Sức khỏe</option>
                    <option value="6">Khác</option>
                  </Select>
                </div>
                <div>
                  <label htmlFor="size">Kích thước (tùy chọn)</label>
                  <Input 
                    id="size" 
                    value={size} 
                    onChange={(e) => setSize(e.target.value)} 
                    className="mt-1"
                    placeholder="VD: M, L, XL..."
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description">Mô tả</label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className={`mt-1 ${errors.description ? 'border-red-500' : ''}`} 
                  placeholder="Mô tả chi tiết về sản phẩm..."
                  rows={4}
                />
                {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="price">Giá (VNĐ)</label>
                  <Input 
                    id="price" 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    className={`mt-1 ${errors.price ? 'border-red-500' : ''}`} 
                    placeholder="0"
                  />
                  {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
                </div>
                <div>
                  <label htmlFor="discount">Giảm giá (%)</label>
                  <Input 
                    id="discount" 
                    type="number" 
                    min="0"
                    max="100"
                    value={discount} 
                    onChange={(e) => setDiscount(e.target.value)} 
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  id="images"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label htmlFor="images" className="cursor-pointer">
                  <UploadCloud size={40} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    {images.length > 0 ? `Đã chọn ${images.length} ảnh` : 'Upload ảnh sản phẩm'}
                  </p>
                </label>
              </div>
            </div>
            
            <hr />
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Kết nối ví để xác thực giao dịch và bảo vệ quyền lợi người mua/bán
              </p>
              <ConnectWalletButton />
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={!isConnected || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin mr-2" size={20}/> : null}
              {isSubmitting ? 'Đang đăng...' : (isConnected ? 'Hoàn tất & Đăng bài' : 'Đăng bài (Cần liên kết ví)')}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Container>
  );
}