import { Card, CardContent, CardHeader } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Star, ThumbsDown } from 'lucide-react';

export default function ReviewCard({ review }) {
  const rating = Number(review.rating || review.starNumber || 0);
  const displayName = review.userName || review.author || 'Người dùng';
  const createdAt = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('vi-VN')
    : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 pb-2">
        <Avatar src={review.avatar || '/avatar.png'} />
        <div>
          <h4 className="font-semibold">{displayName}</h4>
          {createdAt && <p className="text-xs text-gray-500">{createdAt}</p>}
          <div className="flex text-yellow-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} fill={i < rating ? 'currentColor' : 'none'} />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700">{review.comment || 'Người dùng không để lại nhận xét.'}</p>
        {review.isVerified === false && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
            <ThumbsDown size={16} />
            <p className="text-sm">
              <strong>Đã trừ điểm:</strong> {review.reason || 'Đánh giá không hợp lệ.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
