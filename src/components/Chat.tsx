import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { authService, firestoreService } from '../lib/firestoreService';
import { Send, Hash, MessageCircle, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { Message } from '../types';

export default function Chat({ householdId }: { householdId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = authService.getCurrentUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribeMessages = firestoreService.subscribeMessages(householdId, (data) => {
      setMessages(data);
      setLoading(false);
    });

    const unsubscribeTyping = firestoreService.subscribeTyping(householdId, (users) => {
      setTypingUsers(users);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [householdId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, typingUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Manage typing status
    firestoreService.updateTypingStatus(householdId, true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      firestoreService.updateTypingStatus(householdId, false);
    }, 2000);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-emerald-100 text-emerald-600',
      'bg-rose-100 text-rose-600',
      'bg-amber-100 text-amber-600',
      'bg-indigo-100 text-indigo-600',
      'bg-purple-100 text-purple-600',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage;
    setNewMessage('');
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    firestoreService.updateTypingStatus(householdId, false);
    
    await firestoreService.sendMessage(householdId, content);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 10, -10, 0]
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className="text-blue-400 bg-blue-50 p-6 rounded-[32px]"
      >
        <MessageCircle size={48} strokeWidth={2.5} />
      </motion.div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-[calc(100vh-220px)] sm:h-[calc(100vh-280px)] min-h-[500px]"
    >
      <header className="mb-6 flex items-center justify-between px-2">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Obrolan Keluarga 💬</h2>
          <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-[0.15em]">Koordinasi jadi lebih asik!</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Chat</span>
        </div>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-6 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-40">
             <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center mb-6">
                <MessageCircle size={48} className="text-gray-300" />
             </div>
             <p className="font-black text-xl text-gray-400 uppercase tracking-tight">Belum ada obrolan...</p>
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Sapa keluarga kamu duluan yuk!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, idx) => {
              const isMe = msg.userId === currentUser?.id;
              const showMetadata = idx === 0 || messages[idx - 1].userId !== msg.userId;

              return (
                <motion.div 
                  key={msg.id || `msg-${idx}`}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", damping: 20, stiffness: 200 }}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {showMetadata && !isMe && (
                     <div className="flex items-center gap-2 mb-1.5 ml-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{msg.userName}</span>
                     </div>
                  )}
                  
                  <div className={`flex items-end gap-3 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && (
                      <div className={`w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0 border-2 border-white shadow-sm overflow-hidden mb-0.5 transition-transform group-hover:scale-110 ${getAvatarColor(msg.userName)}`}>
                        {msg.userPhoto ? (
                          <img src={msg.userPhoto} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-xs font-black uppercase">{msg.userName.charAt(0)}</span>
                        )}
                      </div>
                    )}
                    
                    <div className={`relative px-5 py-3.5 rounded-[24px] max-w-[85vw] sm:max-w-[70%] text-sm font-bold shadow-sm transition-all
                      ${isMe 
                        ? 'bg-gray-900 text-white rounded-br-none hover:shadow-md' 
                        : 'bg-white text-gray-800 border border-gray-50 rounded-bl-none hover:shadow-md'}
                    `}>
                      {msg.content}
                      
                      <div className={`flex items-center gap-1.5 mt-1.5 opacity-30 text-[8px] font-black uppercase tracking-widest
                        ${isMe ? 'justify-end' : 'justify-start'}
                      `}>
                        <span>{format(parseISO(msg.timestamp), 'HH:mm')}</span>
                        {isMe && <CheckCheck size={10} className="text-blue-500" />}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        
        {typingUsers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-4 ml-2"
          >
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {typingUsers.length === 1 
                ? `${typingUsers[0].userName} sedang mengetik...` 
                : `${typingUsers.length} orang sedang mengetik...`}
            </span>
          </motion.div>
        )}
      </div>

      <div className="mt-auto px-1 pb-2">
        <form 
          onSubmit={handleSend}
          className="relative bg-white p-2 rounded-[32px] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.06)] focus-within:shadow-xl focus-within:border-blue-100 transition-all group"
        >
          <input 
            type="text" 
            placeholder="Ketik sesuatu untuk keluarga..."
            className="w-full pl-6 pr-20 py-5 bg-transparent border-none outline-none focus:ring-0 font-bold text-gray-900 placeholder:text-gray-300 text-sm"
            value={newMessage}
            onChange={handleInputChange}
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className={`absolute right-3 top-3 bottom-3 w-14 rounded-[22px] flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:scale-95
              ${newMessage.trim() ? 'bg-gray-900 text-white shadow-lg rotate-0 hover:rotate-12' : 'bg-gray-50 text-gray-300'}
            `}
          >
            <Send size={20} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
