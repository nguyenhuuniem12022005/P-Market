'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container } from '../../components/ui/Container';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  buildAvatarUrl,
  createChatRoomForProduct,
  fetchChatMessages,
  fetchChatRooms,
  sendChatMessage
} from '../../lib/api';

export default function ChatPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const productId = searchParams.get('product');
  const roomParam = searchParams.get('room');

  const [linkedProduct, setLinkedProduct] = useState(null);
  const [chatRoom, setChatRoom] = useState(null);
  const [chatRooms, setChatRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const counterpartInfo = useMemo(() => {
    if (!chatRoom || !user) return null;
    const isCustomer = chatRoom.customerId === user.userId;
    return isCustomer
      ? { name: chatRoom.supplierName, avatar: chatRoom.supplierAvatar, label: 'Người bán' }
      : { name: chatRoom.customerName, avatar: chatRoom.customerAvatar, label: 'Người mua' };
  }, [chatRoom, user]);

  const headerAvatar = buildAvatarUrl(counterpartInfo?.avatar || linkedProduct?.seller?.avatar);
  const headerName =
    counterpartInfo?.name ||
    linkedProduct?.seller?.userName ||
    linkedProduct?.seller?.shopName ||
    linkedProduct?.shopName ||
    'Đối tác';

  const loadMessages = useCallback(async (roomId) => {
    setIsLoadingChat(true);
    try {
      const response = await fetchChatMessages(roomId);
      setChatRoom(response.chatRoom);
      setMessages(response.messages || []);
      setLinkedProduct(null);
    } catch (error) {
      toast.error(error.message || 'Không tải được cuộc trò chuyện.');
    } finally {
      setIsLoadingChat(false);
    }
  }, []);

  const loadRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const response = await fetchChatRooms();
      setChatRooms(response.chatRooms || []);
    } catch (error) {
      toast.error(error.message || 'Không tải được danh sách chat.');
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    let ignore = false;

    async function prepareChatByProduct() {
      if (!productId) return;
      setIsLoadingChat(true);
      try {
        const response = await createChatRoomForProduct(Number(productId));
        if (ignore) return;
        setLinkedProduct(response.product);
        setChatRoom(response.chatRoom);
        const messageResponse = await fetchChatMessages(response.chatRoom.chatRoomId);
        if (!ignore) {
          setMessages(messageResponse.messages || []);
        }
        loadRooms();
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || 'Không thể mở phòng chat.');
        }
      } finally {
        if (!ignore) setIsLoadingChat(false);
      }
    }

    if (productId) {
      prepareChatByProduct();
    }

    return () => {
      ignore = true;
    };
  }, [productId, loadRooms]);

  useEffect(() => {
    if (roomParam) {
      loadMessages(Number(roomParam));
    }
  }, [roomParam, loadMessages]);

  const handleSelectRoom = async (roomId) => {
    await loadMessages(roomId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatRoom?.chatRoomId) {
      toast.error('Chưa xác định phòng chat.');
      return;
    }
    if (newMessage.trim() === '' || isSending) return;

    setIsSending(true);
    try {
      const response = await sendChatMessage(chatRoom.chatRoomId, newMessage.trim());
      setMessages((prev) => [...prev, response.message]);
      setNewMessage('');
      loadRooms();
    } catch (error) {
      toast.error(error.message || 'Không gửi được tin nhắn.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Container className="py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-col gap-4 border-b">
          <div className="flex flex-row items-center gap-3">
            <Avatar src={headerAvatar} alt={headerName} />
            <div className="flex flex-col">
              <CardTitle>Trò chuyện với {headerName}</CardTitle>
              {counterpartInfo && (
                <span className="text-sm text-gray-500">{counterpartInfo.label}</span>
              )}
              {linkedProduct?.productName && (
                <span className="text-sm text-gray-500">
                  Sản phẩm: {linkedProduct.productName}
                </span>
              )}
            </div>
          </div>

          <div className="w-full">
            <p className="text-sm font-semibold mb-2">Cuộc trò chuyện của bạn</p>
            {isLoadingRooms ? (
              <p className="text-xs text-gray-500">Đang tải danh sách...</p>
            ) : chatRooms.length === 0 ? (
              <p className="text-xs text-gray-500">Bạn chưa có cuộc trò chuyện nào.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {chatRooms.map((room) => {
                  const isCustomer = room.customerId === user?.userId;
                  const counterpartName = isCustomer ? room.supplierName : room.customerName;
                  const isActive = chatRoom?.chatRoomId === room.chatRoomId;
                  return (
                    <button
                      key={room.chatRoomId}
                      type="button"
                      onClick={() => handleSelectRoom(room.chatRoomId)}
                      className={`px-3 py-1 rounded-full border text-xs ${
                        isActive ? 'bg-primary text-white border-primary' : 'border-gray-300'
                      }`}
                    >
                      {counterpartName || `Chat #${room.chatRoomId}`}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 h-96 overflow-y-auto space-y-4">
          {isLoadingChat ? (
            <div className="text-center text-gray-500">Đang tải hội thoại...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500">Chưa có tin nhắn nào.</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.messageId || msg.id}
                className={`flex ${
                  msg.senderId === user?.userId ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`p-3 rounded-lg max-w-[70%] ${
                    msg.senderId === user?.userId
                      ? 'bg-primary text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-[10px] opacity-70 mt-1">
                    {msg.userName || (msg.senderId === user?.userId ? 'Bạn' : 'Đối tác')}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
        <CardFooter className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex w-full gap-2">
            <Input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-grow"
              disabled={isSending || isLoadingChat}
            />
            <Button type="submit" size="sm" disabled={isSending || isLoadingChat}>
              <Send size={18} />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </Container>
  );
}
