'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Image from 'next/image';

import {
  Shield, Gift, UserCircle, MapPin, Phone, CalendarDays,
  Save, KeyRound, Loader2, Camera,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import {
  uploadUserAvatar,
  updateUserProfile,
  resetPasswordAPI,
  getUserDashboard,
  buildAvatarUrl,
  updateUserDateOfBirth,
  adjustReputationScore,
  adjustGreenCredit,
} from '../../lib/api';

// ===================== Dashboard =====================
export default function DashboardPage() {
  const { user, token, setUser } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    fullName: user?.fullName || '',
    userName: user?.userName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    dateOfBirth: user?.dateOfBirth || '',
    avatar: buildAvatarUrl(user?.avatar),
  });

  const [scoreDelta, setScoreDelta] = useState({ reputation: '', greenCredit: '' });

  const [passwordFields, setPasswordFields] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordError, setPasswordError] = useState('');

  // ===================== Load Dashboard =====================
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName: user.fullName || '',
        userName: user.userName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        dateOfBirth: user.dateOfBirth || '',
        avatar: buildAvatarUrl(user.avatar),
      }));
    }

    if (user && token) {
      (async () => {
        try {
          const apiData = await getUserDashboard(token);
          setDashboardData(apiData);
          setProfileData(prev => ({
            ...prev,
            phone: apiData.phone || prev.phone,
            address: apiData.address || prev.address,
            dateOfBirth: apiData.dateOfBirth || prev.dateOfBirth,
          }));
        } catch (error) {
          toast.error('Không thể tải dữ liệu Dashboard.');
        } finally {
          setIsLoading(false);
        }
      })();
    } else setIsLoading(false);
  }, [user, token]);

  // ===================== Handlers =====================
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    if (name === 'firstName' || name === 'lastName') {
      const newFirstName = name === 'firstName' ? value : profileData.firstName;
      const newLastName = name === 'lastName' ? value : profileData.lastName;
      setProfileData(prev => ({
        ...prev,
        [name]: value,
        fullName: `${newFirstName} ${newLastName}`.trim(),
      }));
    } else {
      setProfileData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateUserProfile({
        userName: profileData.userName,
        phone: profileData.phone,
        address: profileData.address,
      });

      if (profileData.dateOfBirth) {
        await updateUserDateOfBirth(profileData.dateOfBirth);
      }

      const updatedUser = { ...user, ...profileData };
      localStorage.setItem('pmarket_user', JSON.stringify(updatedUser));
      if (setUser) setUser(updatedUser);

      toast.success('Cập nhật hồ sơ thành công!');
    } catch (error) {
      toast.error(error.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await uploadUserAvatar(file, token);
      const imagePathFromApi = result?.imagePath || result?.data?.avatar;
      const newAvatarUrl = buildAvatarUrl(imagePathFromApi || profileData.avatar);

      setProfileData(prev => ({ ...prev, avatar: newAvatarUrl }));

      const updatedUser = { ...user, avatar: newAvatarUrl };
      localStorage.setItem('pmarket_user', JSON.stringify(updatedUser));
      if (setUser) setUser(updatedUser);

      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (error) {
      toast.error(error.message || 'Tải ảnh thất bại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordFields(prev => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordFields.newPassword !== passwordFields.confirmPassword) {
      setPasswordError('Mật khẩu mới không khớp.');
      toast.error('Mật khẩu mới không khớp.');
      return;
    }
    if (passwordFields.newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await resetPasswordAPI({
        currentPassword: passwordFields.currentPassword,
        newPassword: passwordFields.newPassword,
      });
      toast.success(res.message || 'Đổi mật khẩu thành công!');
      setPasswordFields({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordError(error.message || 'Đổi mật khẩu thất bại.');
      toast.error(error.message || 'Đổi mật khẩu thất bại!');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleScoreInput = (type, value) => {
    setScoreDelta(prev => ({ ...prev, [type]: value }));
  };

  const handleScoreAdjust = async (type) => {
    const value = Number(scoreDelta[type]);
    if (!value && value !== 0) {
      toast.error('Nhập số hợp lệ');
      return;
    }
    try {
      if (type === 'reputation') {
        await adjustReputationScore(value);
        setDashboardData(prev => ({ ...prev, reputation: (prev?.reputation ?? 0) + value }));
      } else {
        await adjustGreenCredit(value);
        setDashboardData(prev => ({ ...prev, greenCredit: (prev?.greenCredit ?? 0) + value }));
      }
      setScoreDelta(prev => ({ ...prev, [type]: '' }));
      toast.success('Cập nhật thành công');
    } catch (error) {
      toast.error(error.message || 'Không cập nhật được');
    }
  };

  // ===================== Render =====================
  if (isLoading || !user) {
    return (
      <div className="text-center py-10">
        <p>{!user ? 'Vui lòng đăng nhập.' : 'Đang tải hồ sơ...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trang cá nhân</h1>

      {/* Hồ sơ cá nhân */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle size={24} /> Hồ sơ cá nhân
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSaveProfile}>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="relative w-16 h-16">
                <Image
                  src={profileData.avatar}
                  alt="User Avatar"
                  fill
                  className="rounded-full object-cover"
                  sizes="64px"
                />
              </div>
              <label className="relative cursor-pointer bg-gray-200 hover:bg-gray-300 transition px-3 py-1 rounded-md text-gray-700 flex items-center gap-1">
                <Camera size={16} /> {isUploading ? 'Đang tải...' : 'Đổi ảnh'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </label>
            </div>

            <p><strong>Họ và Tên:</strong> {profileData.fullName}</p>
            <p><strong>Email:</strong> {profileData.email}</p>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Username</label>
              <Input
                type="text"
                name="userName"
                value={profileData.userName}
                onChange={handleProfileChange}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                <Phone size={16} className="inline mr-1" /> Số điện thoại
              </label>
              <Input
                type="tel"
                name="phone"
                value={profileData.phone}
                onChange={handleProfileChange}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                <MapPin size={16} className="inline mr-1" /> Địa chỉ
              </label>
              <Input
                type="text"
                name="address"
                value={profileData.address}
                onChange={handleProfileChange}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <CalendarDays size={16} /> Ngày sinh
              </label>
              <Input
                type="date"
                name="dateOfBirth"
                value={profileData.dateOfBirth ? profileData.dateOfBirth.slice(0, 10) : ''}
                onChange={handleProfileChange}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" size="sm" disabled={isSavingProfile}>
              {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Đổi mật khẩu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={24} /> Đổi mật khẩu
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleChangePassword}>
          <CardContent className="space-y-4">
            <Input
              type="password"
              name="currentPassword"
              placeholder="Mật khẩu cũ"
              value={passwordFields.currentPassword}
              onChange={handlePasswordChange}
              required
            />
            <Input
              type="password"
              name="newPassword"
              placeholder="Mật khẩu mới"
              value={passwordFields.newPassword}
              onChange={handlePasswordChange}
              required
            />
            <Input
              type="password"
              name="confirmPassword"
              placeholder="Xác nhận mật khẩu mới"
              value={passwordFields.confirmPassword}
              onChange={handlePasswordChange}
              required
            />
            {passwordError && (
              <p className="text-sm text-red-600 text-center">{passwordError}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" variant="secondary" disabled={isChangingPassword}>
              {isChangingPassword ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
              {isChangingPassword ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Tổng quan + Điều chỉnh điểm */}
      {dashboardData && (
        <Card>
          <CardHeader>
            <CardTitle>Tổng quan</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Shield size={40} className="text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Điểm uy tín</p>
                  <p className="text-3xl font-bold">{dashboardData.reputation}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={scoreDelta.reputation}
                  onChange={(e) => handleScoreInput('reputation', e.target.value)}
                  placeholder="+/- điểm"
                  className="w-32"
                />
                <Button size="sm" onClick={() => handleScoreAdjust('reputation')}>
                  Cập nhật
                </Button>
              </div>
            </div>

            <div className="p-6 bg-green-50 border border-green-200 rounded-lg flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Gift size={40} className="text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Green Credit</p>
                  <p className="text-3xl font-bold">{dashboardData.greenCredit}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={scoreDelta.greenCredit}
                  onChange={(e) => handleScoreInput('greenCredit', e.target.value)}
                  placeholder="+/- credit"
                  className="w-32"
                />
                <Button size="sm" onClick={() => handleScoreAdjust('greenCredit')}>
                  Cập nhật
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}