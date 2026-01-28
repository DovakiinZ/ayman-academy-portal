import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Profile, Message } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Using Input for simple text, or Textarea
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, User, MessageSquare } from 'lucide-react';

interface Contact extends Profile {
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
}

export default function Messages() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const [searchParams] = useSearchParams();

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial load
    useEffect(() => {
        if (profile?.id) {
            fetchContacts();
        }
    }, [profile?.id]);

    // Setup real-time subscription for new messages
    useEffect(() => {
        if (!profile?.id) return;

        const sub = supabase
            .channel('messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${profile.id}`
            }, (payload) => {
                const newMsg = payload.new as Message;

                // If from selected contact, add to list
                if (selectedContact && newMsg.sender_id === selectedContact.id) {
                    setMessages(prev => [...prev, newMsg]);
                    scrollToBottom();
                    markAsRead(newMsg.sender_id);
                } else {
                    // Refresh contacts to update unread count/last message
                    fetchContacts();
                }
            })
            .subscribe();

        return () => {
            sub.unsubscribe();
        };
    }, [profile?.id, selectedContact]);

    const fetchContacts = async () => {
        if (!profile?.id) return;

        // 1. Get accessible teachers
        const { data: teacherIds } = await supabase.rpc('get_student_teachers', { p_user_id: profile.id });

        if (!teacherIds) {
            setLoadingContacts(false);
            return;
        }

        const ids = teacherIds.map((t: { teacher_id: string }) => t.teacher_id);

        if (ids.length === 0) {
            setLoadingContacts(false);
            return;
        }

        // 2. Get teacher profiles
        const { data: teachers } = await supabase
            .from('profiles')
            .select('*')
            .in('id', ids);

        if (!teachers) return;

        // 3. Get last message stats (simplified for now, expensive query in real world)
        // ideally we'd have a view or simplified query. For V1 we'll just show the list.
        // We can check "messages" table for unread counts

        const contactsWithMeta: Contact[] = [];

        for (const teacher of teachers) {
            // Get unread count
            const { count } = await supabase
                .from('messages')
                .select('id', { count: 'exact' })
                .eq('sender_id', teacher.id)
                .eq('receiver_id', profile.id)
                .is('read_at', null);

            contactsWithMeta.push({
                ...teacher,
                unread_count: count || 0
            });
        }

        setContacts(contactsWithMeta);
        setLoadingContacts(false);

        // Pre-select teacher if in URL
        const teacherIdParam = searchParams.get('teacher');
        if (teacherIdParam && !selectedContact) {
            const target = contactsWithMeta.find(c => c.id === teacherIdParam);
            if (target) handleSelectContact(target);
        }
    };

    const handleSelectContact = async (contact: Contact) => {
        setSelectedContact(contact);
        setLoadingMessages(true);

        // Fetch conversation
        const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${profile?.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${profile?.id})`)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data);
            scrollToBottom();
        }

        setLoadingMessages(false);
        markAsRead(contact.id);
    };

    const markAsRead = async (senderId: string) => {
        if (!profile?.id) return;

        await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('sender_id', senderId)
            .eq('receiver_id', profile.id)
            .is('read_at', null);

        // Update local badge
        setContacts(prev => prev.map(c =>
            c.id === senderId ? { ...c, unread_count: 0 } : c
        ));
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact || !profile?.id) return;

        setSending(true);

        const { data, error } = await supabase
            .from('messages')
            .insert({
                sender_id: profile.id,
                receiver_id: selectedContact.id,
                content: newMessage.trim()
            })
            .select()
            .single();

        if (data && !error) {
            setMessages(prev => [...prev, data]);
            setNewMessage('');
            scrollToBottom();
        }

        setSending(false);
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex bg-background rounded-lg border border-border overflow-hidden">
            {/* Contacts List */}
            <div className="w-80 border-e border-border flex flex-col">
                <div className="p-4 border-b border-border bg-secondary/10">
                    <h2 className="font-semibold text-foreground">{t('المحادثات', 'Conversations')}</h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingContacts ? (
                        <div className="p-4 flex justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : contacts.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            {t('لا توجد جهات اتصال متاحة', 'No accessible contacts')}
                        </div>
                    ) : (
                        contacts.map(contact => (
                            <button
                                key={contact.id}
                                onClick={() => handleSelectContact(contact)}
                                className={`w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors border-b border-border/50 text-start
                                    ${selectedContact?.id === contact.id ? 'bg-secondary/80' : ''}
                                `}
                            >
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border">
                                        {contact.avatar_url ? (
                                            <img src={contact.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <User className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>
                                    {contact.unread_count && contact.unread_count > 0 ? (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-[10px] text-white flex items-center justify-center rounded-full">
                                            {contact.unread_count}
                                        </span>
                                    ) : null}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm text-foreground truncate">
                                        {contact.full_name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {t('معلم', 'Teacher')}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-background">
                {selectedContact ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-border flex items-center gap-3 shadow-sm z-10">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                {selectedContact.avatar_url ? (
                                    <img src={selectedContact.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                            <h3 className="font-semibold text-foreground">
                                {selectedContact.full_name}
                            </h3>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/5">
                            {loadingMessages ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                                    <p>{t('ابدأ المحادثة الآن', 'Start conversation now')}</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = msg.sender_id === profile?.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm
                                                    ${isMe
                                                        ? 'bg-primary text-primary-foreground rounded-br-none'
                                                        : 'bg-white border border-border text-foreground rounded-bl-none'
                                                    }
                                                `}
                                            >
                                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                <div className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-background">
                            <div className="flex gap-2">
                                <Textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={t('اكتب رسالتك...', 'Type your message...')}
                                    className="min-h-[2.5rem] max-h-32"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={!newMessage.trim() || sending}
                                    className="h-10 w-10 shrink-0"
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className={`w-4 h-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} />}
                                </Button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <p>{t('اختر معلماً لبدء المحادثة', 'Select a teacher to start chatting')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
