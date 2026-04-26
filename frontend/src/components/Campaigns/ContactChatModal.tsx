import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import api from '../../api';

interface Sender {
    id: string;
    fullName: string;
    role: string;
}

interface CampaignMessage {
    id: string;
    text: string;
    isRead: boolean;
    createdAt: string;
    senderId: string;
    sender: Sender;
}

interface ContactChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityId: string;
    entityName: string;
    type: 'BRING_ONE' | 'MOBILIZATION';
    currentUserId: string;
    onMessagesRead?: () => void; // Callback to clear notifications in parent UI
}

export default function ContactChatModal({
    isOpen,
    onClose,
    entityId,
    entityName,
    type,
    currentUserId,
    onMessagesRead,
}: ContactChatModalProps) {
    const [messages, setMessages] = useState<CampaignMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasMarkedReadRef = useRef(false); // Ensure read-mark fires only once per open session

    const apiBaseUrl = type === 'BRING_ONE' 
        ? `/bring-one/pledges/${entityId}/messages` 
        : `/campaigns/contacts/${entityId}/messages`;

    useEffect(() => {
        if (!isOpen) {
            // Reset the read-mark guard whenever the modal is closed
            hasMarkedReadRef.current = false;
            return;
        }

        const fetchMessages = async () => {
            try {
                setIsLoading(true);
                const { data } = await api.get<CampaignMessage[]>(apiBaseUrl);
                setMessages(data);

                // Mark unread messages as read only ONCE per open session (on first load).
                // Subsequent poll cycles skip this to avoid redundant PATCH calls.
                if (!hasMarkedReadRef.current) {
                    const hasUnread = data.some(
                        (m: CampaignMessage) => !m.isRead && m.senderId !== currentUserId
                    );
                    if (hasUnread) {
                        await api.patch(`${apiBaseUrl}/read`);
                        if (onMessagesRead) onMessagesRead();
                    }
                    // Mark as done regardless — even if nothing was unread, no need to re-check
                    hasMarkedReadRef.current = true;
                }
            } catch (error) {
                console.error('Failed to fetch messages:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMessages();

        // Poll every 5 seconds to pick up messages sent by the other party
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [isOpen, entityId, type, currentUserId, apiBaseUrl, onMessagesRead]);

    useEffect(() => {
        // Auto-scroll to bottom when messages load/change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        try {
            setIsSending(true);
            const { data } = await api.post<CampaignMessage>(apiBaseUrl, { text: newMessage.trim() });
            setMessages(prev => [...prev, data]);
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sm:p-0">
            <div className="w-full max-w-lg bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh] animate-in slide-in-from-bottom-5">
                
                {/* Header */}
                <div className="px-6 py-4 flex flex-row items-center justify-between border-b bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-sm z-10">
                    <div>
                        <h2 className="text-lg font-bold">Chat ({entityName})</h2>
                        <p className="text-xs text-teal-100 opacity-90 font-medium">Internal Coordination</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Message List */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                    {isLoading && messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                                <p className="text-sm font-medium">Loading conversation...</p>
                            </div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                <Send className="w-8 h-8 text-slate-300 ml-1" />
                            </div>
                            <p className="font-medium text-slate-500">No messages yet.</p>
                            <p className="text-xs text-center max-w-xs">Start a conversation regarding logistics, transport, or any specific needs for {entityName}.</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isMe = msg.senderId === currentUserId;
                            const showName = !isMe && (index === 0 || messages[index - 1].senderId !== msg.senderId);

                            return (
                                <div 
                                    key={msg.id} 
                                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                >
                                    {showName && (
                                        <span className="text-xs text-slate-500 font-medium ml-1 mb-1 opacity-80">
                                            {msg.sender.fullName.split(' ')[0]} 
                                            {msg.sender.role === 'FELLOWSHIP_MANAGER' ? ' (Admin)' : ''}
                                        </span>
                                    )}
                                    <div 
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                            isMe 
                                                ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-tr-sm' 
                                                : 'bg-white border text-slate-800 rounded-tl-sm'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                        <div className={`text-[10px] mt-1 text-right font-medium ${isMe ? 'text-teal-100' : 'text-slate-400'}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form 
                    onSubmit={handleSend}
                    className="p-4 bg-white border-t flex flex-row items-end gap-2 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)]"
                >
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 resize-none overflow-hidden rounded-xl border-slate-200 bg-slate-50 py-3 px-4 text-sm focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500 transition-all min-h-[44px] max-h-[120px]"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isSending}
                        className="p-3 bg-teal-600 text-white rounded-xl shadow-md hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                        aria-label="Send message"
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </form>

            </div>
        </div>
    );
}
