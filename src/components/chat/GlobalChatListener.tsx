
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePosts } from '@/context/PostContext';
import { toast } from 'sonner';
import TiltCard from '@/components/TiltCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GlobalChatListener = () => {
    const { currentUser, activeChatId } = usePosts();
    const navigate = useNavigate();

    // Use ref to access latest activeChatId inside the subscription callback
    const activeChatIdRef = useRef(activeChatId);

    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);

    useEffect(() => {
        if (!currentUser?.id) return;

        const channel = supabase
            .channel('global_messages_listener')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                async (payload) => {
                    const newMessage = payload.new as any;

                    // Ignore own messages
                    if (newMessage.sender_id === currentUser.id) return;

                    // Suppress if user is currently looking at this chat
                    // Note: activeChatId comes from PostContext which might need to be accessed via ref/latest state relative to closure
                    // However, component re-renders on context change so 'activeChatId' variable should be fresh if included in dependency array.
                    // But here it's inside a subscription callback which might capture old state.
                    // Ideally we should use a ref for activeChatId to ensure callback sees latest value without resubscribing.
                    // But let's check how we access it.
                    if (newMessage.chat_id === activeChatIdRef.current) return;

                    // Add delay to allow read status to propagate (e.g. if open on another device)
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Verify if message is already read by current user
                    const { data: isRead } = await supabase.rpc('is_message_read', {
                        p_message_id: newMessage.id,
                        p_user_id: currentUser.id
                    });

                    if (isRead) {
                        console.log("Suppressing notification: Message already read.");
                        return;
                    }

                    // Fetch sender details
                    const { data: senderData } = await supabase
                        .from('profiles')
                        .select('id, full_name, username, avatar_url')
                        .eq('id', newMessage.sender_id)
                        .single();

                    if (!senderData) return;

                    // Custom Toast with 3D UI
                    toast.custom((t) => (
                        <div
                            className="w-full max-w-md cursor-pointer z-[100]"
                            onClick={() => {
                                toast.dismiss(t);
                                navigate('/chats', {
                                    state: {
                                        startChatWith: {
                                            id: senderData.id,
                                            full_name: senderData.full_name,
                                            username: senderData.username,
                                            avatar_url: senderData.avatar_url
                                        }
                                    }
                                });
                            }}
                        >
                            <TiltCard
                                intensity={15}
                                className="bg-black/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl relative overflow-hidden group"
                            >
                                {/* Glow Effect */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="relative">
                                        <Avatar className="h-12 w-12 border-2 border-white/10 shadow-lg">
                                            <AvatarImage src={senderData.avatar_url} />
                                            <AvatarFallback className="bg-primary/20 text-primary">{senderData.full_name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-black">
                                            <MessageCircle className="h-3 w-3 text-white" />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-bold text-base text-white font-display tracking-tight">{senderData.full_name}</h4>
                                            <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">New Message</span>
                                        </div>
                                        <p className="text-sm text-gray-300 truncate font-medium">
                                            {newMessage.content.startsWith('http') ? '📷 Sent an attachment' : newMessage.content}
                                        </p>
                                    </div>
                                </div>
                            </TiltCard>
                        </div>
                    ), {
                        duration: 5000,
                        position: 'top-right',
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, navigate]);

    return null;
};

export default GlobalChatListener;
