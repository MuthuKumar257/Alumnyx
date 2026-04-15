import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, SafeAreaView, ActivityIndicator, ScrollView, Alert, Share } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Search, MoreVertical, PenSquare, Share2, Edit3, ChevronRight } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { alumnyxTheme } from '../theme/alumnyxTheme';

const socketUrl = 'https://alumnyx.onrender.com';

export default function MessagesScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useContext(AuthContext);
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeChat, setActiveChat] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const [loading, setLoading] = useState(true);

    const flatListRef = useRef<FlatList>(null);

    const getDisplayName = (person: any) => {
        if (!person) return 'Unknown User';
        const first = String(person?.profile?.firstName || person?.firstName || '').trim();
        const last = String(person?.profile?.lastName || person?.lastName || '').trim();
        const full = `${first} ${last}`.trim();
        if (full) return full;

        const email = String(person?.email || '').trim();
        if (email) return email.split('@')[0];

        const username = String(person?.username || '').trim();
        if (username) return username;

        return 'Unknown User';
    };

    const getInitial = (person: any) => {
        const name = getDisplayName(person);
        return name.charAt(0).toUpperCase();
    };

    const timeAgo = (value: string | undefined) => {
        if (!value) return '';
        const ts = new Date(value).getTime();
        if (Number.isNaN(ts)) return '';
        const diff = Math.max(0, Date.now() - ts);
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    // Fetch conversation list
    const fetchConversations = async () => {
        try {
            const [conversationsRes, connectionsRes] = await Promise.all([
                axiosClient.get('/messages/conversations'),
                axiosClient.get('/users/connections'),
            ]);

            const existing = conversationsRes.data || [];
            const connected = connectionsRes.data || [];
            const existingIds = new Set(existing.map((c: any) => c?.user?.id).filter(Boolean));

            const synthesized = connected
                .filter((c: any) => c?.user?.id && !existingIds.has(c.user.id))
                .map((c: any) => ({
                    user: c.user,
                    lastMessage: '',
                    lastMessageAt: c.connectedAt || c.createdAt,
                    unread: 0,
                }));

            setConversations([...existing, ...synthesized]);
        } catch (error) {
            console.error('Failed to load conversations', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch message history for active chat
    const fetchMessages = async (partnerId: string) => {
        try {
            const res = await axiosClient.get(`/messages/${partnerId}`);
            setMessages(res.data);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (error) {
            console.error('Failed to load messages', error);
        }
    };

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 10000); // Poll for unread badge updates
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const openUserId = route?.params?.openUserId;
        if (!openUserId || activeChat) return;
        const target = conversations.find((c) => c?.user?.id === openUserId);
        if (target) {
            selectChat(target);
            navigation.setParams?.({ openUserId: undefined });
        }
    }, [route?.params?.openUserId, conversations, activeChat]);

    useEffect(() => {
        if (user) {
            const newSocket = io(socketUrl);
            setSocket(newSocket);

            newSocket.emit('join_room', user.id);

            newSocket.on('receive_message', (data: any) => {
                // If the message belongs to the current active chat, append it
                if (activeChat && (data.senderId === activeChat.user.id || data.receiverId === activeChat.user.id)) {
                    setMessages((prev) => [...prev, data]);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }
                // Refresh conversations to update the last message / unread counts
                fetchConversations();
            });

            return () => {
                newSocket.disconnect();
            };
        }
    }, [user, activeChat]);

    const selectChat = (partner: any) => {
        setActiveChat(partner);
        fetchMessages(partner.user.id);
        
        // Optimistically clear unread count locally
        setConversations(prev => prev.map(c => 
            c.user.id === partner.user.id ? { ...c, unread: 0 } : c
        ));
    };

    const sendMessage = async () => {
        if (inputText.trim() && activeChat && user) {
            const text = inputText.trim();
            setInputText(''); // optimistic clear
            
            try {
                // 1. Save to DB
                const res = await axiosClient.post('/messages', {
                    receiverId: activeChat.user.id,
                    content: text,
                });
                const savedMessage = res.data;

                // 2. Emit to socket for real-time delivery to other person
                if (socket) {
                    socket.emit('send_message', savedMessage);
                }

                // 3. Update local UI
                setMessages((prev) => [...prev, savedMessage]);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                fetchConversations(); // update last message snippet
                
            } catch (error: any) {
                console.error('Failed to send message', error);
                if (error?.response?.status === 403) {
                    Alert.alert('Messaging locked', 'You can message only after the connection request is accepted.');
                }
            }
        }
    };

    const filteredConversations = conversations.filter((c) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        const fullName = getDisplayName(c.user).toLowerCase();
        const email = String(c.user?.email || '').toLowerCase();
        const lastMessage = String(c.lastMessage || '').toLowerCase();
        return fullName.includes(q) || email.includes(q) || lastMessage.includes(q);
    });

    const shareConversation = async () => {
        if (!activeChat) return;
        const name = getDisplayName(activeChat.user) || 'contact';
        try {
            await Share.share({ message: `Connect with ${name} on Alumnyx.` });
        } catch {
            Alert.alert('Share unavailable', 'Could not open share options on this device.');
        }
    };

    const renderChatList = () => (
        <View style={styles.listContainer}>
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <View style={styles.selfAvatarWrap}>
                        <Text style={styles.selfAvatarText}>{String(user?.profile?.firstName || user?.email || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.headerTitle}>Messages</Text>
                </View>
                <View style={styles.topBarRight}>
                    <TouchableOpacity style={styles.topIconBtn} onPress={() => navigation.navigate('Connections')}>
                        <Edit3 size={16} color="#4A40E0" strokeWidth={2.2} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchWrap}>
                <Search size={15} color="#69788E" strokeWidth={2.2} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search alumni or mentors..."
                    placeholderTextColor="#69788E"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.mentorsSection}>
                <View style={styles.mentorsHeader}>
                    <Text style={styles.mentorsTitle}>Online Mentors</Text>
                    <TouchableOpacity>
                        <Text style={styles.viewAll}>View All</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mentorsRow}>
                    {(conversations || []).slice(0, 8).map((item) => {
                        const name = getDisplayName(item.user);
                        return (
                            <TouchableOpacity key={`mentor-${item.user?.id}`} style={styles.mentorPill} onPress={() => selectChat(item)}>
                                <View style={styles.mentorAvatar}>
                                    <Text style={styles.mentorAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                                    <View style={styles.onlineDot} />
                                </View>
                                <Text style={styles.mentorName} numberOfLines={1}>{name.split(' ')[0]}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <Text style={styles.conversationsTitle}>Conversations</Text>

            {loading ? (
                  <ActivityIndicator size="large" color={alumnyxTheme.colors.primary} style={{marginTop: 20}} />
            ) : filteredConversations.length === 0 ? (
                <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>No conversations yet.</Text>
                    <Text style={styles.emptySubtext}>Connect with alumni via the directory.</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredConversations}
                    keyExtractor={(item) => item.user.id}
                    contentContainerStyle={styles.chatListContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={[styles.chatRow, item.unread > 0 && styles.chatRowUnread]} onPress={() => selectChat(item)}>
                            {item.unread > 0 && <View style={styles.unreadRail} />}
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{getInitial(item.user)}</Text>
                            </View>
                            <View style={styles.chatInfo}>
                                <Text style={[styles.chatName, item.unread > 0 && styles.unreadBold]} numberOfLines={1}>
                                    {getDisplayName(item.user)}
                                </Text>
                                <Text style={styles.chatSnippet} numberOfLines={1}>
                                    {item.lastMessage || 'Start a conversation'}
                                </Text>
                            </View>
                            <View style={styles.chatRightCol}>
                                <Text style={[styles.chatTime, item.unread > 0 && styles.chatTimeUnread]}>
                                    {timeAgo(item.lastMessageAt)}
                                </Text>
                                {item.unread > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadBadgeText}>{item.unread}</Text>
                                    </View>
                                )}
                                {item.unread === 0 && (
                                    <ChevronRight size={13} color="#94A3B8" strokeWidth={2.1} />
                                )}
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}

            {!activeChat && (
                <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Connections')}>
                    <PenSquare size={22} color="#F4F1FF" strokeWidth={2.2} />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderActiveChat = () => (
        <KeyboardAvoidingView 
            style={styles.chatContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.activeHeader}>
                <TouchableOpacity onPress={() => setActiveChat(null)} style={styles.backBtn}>
                    <ArrowLeft size={16} color="#4A40E0" strokeWidth={2.2} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('OtherUserProfile', { userId: activeChat.user?.id })}>
                    <Text style={styles.activeChatName}>
                        {getDisplayName(activeChat.user)}
                    </Text>
                </TouchableOpacity>
                <View style={styles.activeHeaderIcons}>
                    <TouchableOpacity style={styles.topIconBtn} onPress={shareConversation}><Share2 size={16} color="#4A40E0" strokeWidth={2.2} /></TouchableOpacity>
                    <TouchableOpacity style={styles.topIconBtn} onPress={() => fetchMessages(activeChat.user.id)}><MoreVertical size={16} color="#4A40E0" strokeWidth={2.2} /></TouchableOpacity>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                renderItem={({ item }) => {
                    const isMine = item.senderId === user?.id;
                    return (
                        <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
                            <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>
                                {item.content}
                            </Text>
                            <Text style={[styles.timestampStr, isMine ? styles.myTimestamp : styles.theirTimestamp]}>
                                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    );
                }}
            />

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                />
                <TouchableOpacity 
                    style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
                    onPress={sendMessage}
                    disabled={!inputText.trim()}
                >
                    <Text style={styles.sendText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );

    return (
        <SafeAreaView style={styles.container}>
            {activeChat ? renderActiveChat() : renderChatList()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F6FF',
        alignSelf: 'center',
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 860 : '100%',
    },
    listContainer: { flex: 1, paddingHorizontal: 14, paddingBottom: 90 },
    topBar: {
        height: 62,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    selfAvatarWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#CADEFF',
        borderWidth: 2,
        borderColor: '#9795FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selfAvatarText: {
        color: '#1A0099',
        fontSize: 16,
        fontWeight: '800',
    },
    topIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EBF1FF',
    },
    topIcon: { color: '#4A40E0', fontSize: 16, fontWeight: '700' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#4A40E0', letterSpacing: -0.3 },
    searchWrap: {
        marginTop: 8,
        marginBottom: 14,
        position: 'relative',
    },
    searchIcon: {
        position: 'absolute',
        left: 14,
        top: 12,
        color: '#69788E',
        zIndex: 2,
        fontSize: 15,
    },
    searchInput: {
        height: 46,
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(160,174,198,0.32)',
        paddingLeft: 40,
        paddingRight: 14,
        color: '#212F43',
        fontSize: 13,
    },
    mentorsSection: { marginBottom: 10 },
    mentorsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    mentorsTitle: {
        color: '#4E5C71',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.4,
    },
    viewAll: { color: '#4A40E0', fontSize: 11, fontWeight: '700' },
    mentorsRow: { gap: 14, paddingLeft: 4, paddingBottom: 4, paddingRight: 2 },
    mentorPill: { alignItems: 'center', width: 64 },
    mentorAvatar: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#CADEFF',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: 5,
    },
    mentorAvatarText: { color: '#1A0099', fontSize: 18, fontWeight: '800' },
    onlineDot: {
        position: 'absolute',
        right: -2,
        bottom: -2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#F4F6FF',
    },
    mentorName: { fontSize: 11, color: '#212F43', fontWeight: '700' },
    conversationsTitle: {
        color: '#4E5C71',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        marginTop: 6,
        marginBottom: 10,
        paddingLeft: 4,
    },
    chatListContent: { paddingBottom: 12 },
    emptyWrap: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: alumnyxTheme.colors.textMain, fontSize: 18, fontWeight: 'bold' },
    emptySubtext: { color: alumnyxTheme.colors.muted, fontSize: 14, marginTop: 10 },
    
    chatRow: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 16,
        marginBottom: 8,
        alignItems: 'center',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(160,174,198,0.18)',
    },
    chatRowUnread: {
        backgroundColor: 'rgba(221,233,255,0.42)',
        borderColor: 'rgba(74,64,224,0.2)',
    },
    unreadRail: {
        position: 'absolute',
        left: 0,
        top: 14,
        width: 3,
        height: 42,
        borderRadius: 3,
        backgroundColor: '#4A40E0',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#DDE9FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { color: '#1A0099', fontSize: 22, fontWeight: '800' },
    chatInfo: { flex: 1 },
    chatName: { fontSize: 15, color: '#212F43', marginBottom: 3, fontWeight: '700' },
    unreadBold: { fontWeight: '800', color: '#212F43' },
    chatSnippet: { color: '#4E5C71', fontSize: 13 },
    chatRightCol: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 54 },
    chatTime: { color: '#69788E', fontSize: 10, textTransform: 'uppercase', marginBottom: 4, fontWeight: '600' },
    chatTimeUnread: { color: '#4A40E0', fontWeight: '700' },
    unreadBadge: { backgroundColor: '#4A40E0', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    unreadBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#4A40E0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#4A40E0',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.32,
        shadowRadius: 14,
        elevation: 6,
    },
    fabIcon: { color: '#F4F1FF', fontSize: 25, fontWeight: '700' },

    // Active Chat Styles
    chatContainer: {
        flex: 1,
        backgroundColor: '#F4F6FF',
    },
    activeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#CADEFF',
        backgroundColor: '#F4F6FF',
    },
    backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EBF1FF' },
    backText: { color: '#4A40E0', fontSize: 16, fontWeight: '700' },
    activeHeaderIcons: { flexDirection: 'row', gap: 6 },
    activeChatName: { fontSize: 16, fontWeight: '800', color: '#212F43' },
    messagesList: { padding: 15, paddingBottom: 20 },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
    myMessage: { alignSelf: 'flex-end', backgroundColor: '#4A40E0', borderBottomRightRadius: 5 },
    theirMessage: { alignSelf: 'flex-start', backgroundColor: '#EAF0FF', borderBottomLeftRadius: 5 },
    messageText: { fontSize: 15, lineHeight: 20 },
    myText: { color: '#FFF' },
    theirText: { color: '#212F43' },
    timestampStr: { fontSize: 10, marginTop: 5, alignSelf: 'flex-end' },
    myTimestamp: { color: 'rgba(255, 255, 255, 0.7)' },
    theirTimestamp: { color: alumnyxTheme.colors.muted },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#CADEFF',
        alignItems: 'flex-end',
        backgroundColor: '#F4F6FF',
    },
    input: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CADEFF',
        padding: 12,
        borderRadius: 24,
        marginRight: 10,
        minHeight: 40,
        maxHeight: 100,
        fontSize: 15,
    },
    sendBtn: { backgroundColor: '#4A40E0', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, justifyContent: 'center' },
    sendBtnDisabled: { backgroundColor: '#B0BEC5' },
    sendText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});
