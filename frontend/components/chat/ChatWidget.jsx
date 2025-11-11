'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  fetchChatRooms,
  fetchChatMessages,
  sendChatMessage,
  buildAvatarUrl
} from '../../lib/api';
import toast from 'react-hot-toast';

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    setRoomsLoading(true);
    try {
      const response = await fetchChatRooms();
      setRooms(response?.chatRooms || []);
    } catch (error) {
      toast.error(error.message || 'Không tải được danh sách chat.');
    } finally {
      setRoomsLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(
    async (chatRoomId) => {
      setMessagesLoading(true);
      try {
        const response = await fetchChatMessages(chatRoomId);
        setSelectedRoom(response.chatRoom);
        setMessages(response.messages || []);
      } catch (error) {
        toast.error(error.message || 'Không tải được hội thoại.');
      } finally {
        setMessagesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      loadRooms();
    }
  }, [isOpen, loadRooms]);

  const counterpartInfo = useMemo(() => {
    if (!selectedRoom || !user) return null;
    const isCustomer = selectedRoom.customerId === user.userId;
    return isCustomer
      ? { name: selectedRoom.supplierName, avatar: selectedRoom.supplierAvatar }
      : { name: selectedRoom.customerName, avatar: selectedRoom.customerAvatar };
  }, [selectedRoom, user]);

  const handleSelectRoom = async (room) => {
    await loadMessages(room.chatRoomId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedRoom?.chatRoomId) {
      toast.error('Hãy chọn một cuộc trò chuyện.');
      return;
    }
    if (!newMessage.trim()) return;
    setIsSending(true);
    try {
      const response = await sendChatMessage(selectedRoom.chatRoomId, newMessage.trim());
      setMessages((prev) => [...prev, response.message]);
      setNewMessage('');
      loadRooms();
    } catch (error) {
      toast.error(error.message || 'Không gửi được tin nhắn.');
    } finally {
      setIsSending(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full shadow-lg hover:bg-primary/90 transition"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <MessageCircle size={20} />
        Chat
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-6 z-40 w-[360px] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-white">
            <div>
              <p className="text-sm font-semibold">Hộp thoại</p>
              <p className="text-xs text-white/80">Nhắn tin với người mua/bán</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white/20 transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 border-b">
            <div className="border-r max-h-64 overflow-y-auto">
              {roomsLoading ? (
                <p className="text-xs text-gray-500 p-4">Đang tải...</p>
              ) : rooms.length === 0 ? (
                <p className="text-xs text-gray-500 p-4">Chưa có cuộc trò chuyện nào.</p>
              ) : (
                rooms.map((room) => {
                  const isCustomer = room.customerId === user.userId;
                  const counterpartName = isCustomer ? room.supplierName : room.customerName;
                  const isActive = selectedRoom?.chatRoomId === room.chatRoomId;
                  return (
                    <button
                      key={room.chatRoomId}
                      onClick={() => handleSelectRoom(room)}
                      className={`w-full text-left px-3 py-2 border-b text-sm ${
                        isActive ? 'bg-primary/10 font-semibold' : 'hover:bg-gray-50'
                      }`}
                    >
                      <p className="truncate">{counterpartName || `Chat #${room.chatRoomId}`}</p>
                      <p className="text-[11px] text-gray-500">
                        Vai trò: {isCustomer ? 'Người bán' : 'Người mua'}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex flex-col max-h-64 overflow-y-auto">
              {messagesLoading ? (
                <p className="text-xs text-gray-500 p-4 text-center">Đang mở hội thoại...</p>
              ) : !selectedRoom ? (
                <p className="text-xs text-gray-500 p-4 text-center">Chọn một cuộc trò chuyện.</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-gray-500 p-4 text-center">
                  Chưa có tin nhắn nào. Bắt đầu nhắn tin nhé!
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.messageId || msg.id}
                    className={`px-3 py-1 flex ${msg.senderId === user.userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 text-xs ${
                        msg.senderId === user.userId ? 'bg-primary text-white' : 'bg-gray-200'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className="text-[10px] opacity-70 mt-1">{msg.userName}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedRoom && (
            <div className="px-4 py-2 border-t">
              <div className="flex items-center gap-2 mb-2 text-sm">
                <Avatar src={buildAvatarUrl(counterpartInfo?.avatar)} size="sm" />
                <div>
                  <p className="font-semibold">{counterpartInfo?.name || 'Đối tác'}</p>
                  <p className="text-xs text-gray-500">Phòng #{selectedRoom.chatRoomId}</p>
                </div>
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  disabled={isSending}
                />
                <Button type="submit" size="icon" disabled={isSending}>
                  <Send size={16} />
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}
