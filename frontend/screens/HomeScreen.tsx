import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Platform, TouchableOpacity, Image, Alert, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bell, MoreHorizontal, ThumbsUp, MessageCircle, Share2 } from 'lucide-react-native';
import axiosClient from '../api/axiosClient';
import { alumnyxTheme } from '../theme/alumnyxTheme';

export default function HomeScreen() {
    const navigation = useNavigation<any>();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const toggleLike = async (postId: string) => {
        try {
            const res = await axiosClient.post(`/posts/${postId}/like`);
            const { liked, likeCount } = res.data || {};
            setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likedByMe: Boolean(liked), likeCount: Number(likeCount || 0) } : p)));
        } catch (error) {
            console.error('Failed to toggle like', error);
        }
    };

    const sharePost = async (item: any) => {
        try {
            await Share.share({
                message: `${item.content || 'Check out this post on Alumnyx'}\n\nShared from Alumnyx`,
            });
        } catch {
            Alert.alert('Share unavailable', 'Could not open share options on this device.');
        }
    };

    const openPostMenu = (item: any) => {
        Alert.alert('Post Options', 'Choose an action', [
            { text: 'Message Author', onPress: () => navigation.navigate('Messages') },
            { text: 'View Directory', onPress: () => navigation.navigate('Connections') },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const fetchPosts = async () => {
        try {
            const response = await axiosClient.get('/posts');
            const ordered = [...(response.data || [])].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setPosts(ordered);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
        const interval = setInterval(fetchPosts, 15000);
        return () => clearInterval(interval);
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.authorInfo}>
                    <View style={styles.avatarWrap}>
                        <View style={[styles.avatar, item.author?.isVerified && styles.avatarVerified]}>
                            <Text style={styles.avatarText}>{item.author.profile?.firstName?.[0] || '?'}</Text>
                        </View>
                        {item.author?.isVerified && <Text style={styles.verifiedTick}>✓</Text>}
                    </View>
                    <View>
                        <Text style={styles.author}>{item.author.profile?.firstName} {item.author.profile?.lastName}</Text>
                        <Text style={styles.authorSub}>
                            {item.author.profile?.graduationYear ? `Class of '${String(item.author.profile.graduationYear).slice(-2)}` : 'Alumnyx Member'} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => openPostMenu(item)}>
                    <MoreHorizontal size={20} color="#7D8795" strokeWidth={2.2} />
                </TouchableOpacity>
            </View>
            <Text style={styles.content}>{item.content}</Text>

            {!!item.image && (
                <View style={styles.mediaWrap}>
                    <Image source={{ uri: item.image }} style={styles.mediaImage} />
                </View>
            )}

            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item.id)}>
                    <ThumbsUp size={16} color={item.likedByMe ? '#1E3A8A' : '#64748B'} strokeWidth={2.2} />
                    <Text style={styles.actionText}>{item.likeCount || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Messages')}>
                    <MessageCircle size={16} color="#64748B" strokeWidth={2.2} />
                    <Text style={styles.actionText}>{item.commentCount || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={() => sharePost(item)}>
                    <Share2 size={16} color="#64748B" strokeWidth={2.2} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Image source={require('../assets/mobiletext.png')} style={styles.brandTitleImage} />
                <TouchableOpacity style={styles.notificationBtn} onPress={fetchPosts}>
                    <Bell size={17} color={alumnyxTheme.colors.primary} strokeWidth={2.2} />
                </TouchableOpacity>
            </View>

            {loading && posts.length === 0 ? (
                <ActivityIndicator size="large" color="#007AFF" />
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshing={loading}
                    onRefresh={fetchPosts}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<Text style={styles.emptyText}>No posts yet.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: alumnyxTheme.colors.backgroundLight,
        paddingHorizontal: 0,
        paddingTop: 0,
        alignSelf: 'center',
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 480 : '100%',
    },
    topBar: {
        position: 'relative',
        zIndex: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: alumnyxTheme.colors.surface,
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    brandTitle: {
        color: alumnyxTheme.colors.primary,
        fontFamily: 'serif',
        fontSize: 30,
        fontWeight: '800',
    },
    brandTitleImage: {
        width: 132,
        height: 28,
        resizeMode: 'contain',
    },
    notificationBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F6F1E8',
    },
    notificationText: {
        fontSize: 16,
        color: alumnyxTheme.colors.primary,
    },
    listContent: { paddingBottom: 95, paddingHorizontal: 16 },
    card: {
        backgroundColor: alumnyxTheme.colors.surface,
        padding: 15,
        borderRadius: alumnyxTheme.radius.lg,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
        ...alumnyxTheme.shadow.card,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    authorInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarWrap: {
        marginRight: 10,
        position: 'relative',
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#E8EDF5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D8DCE3',
    },
    avatarVerified: {
        borderColor: alumnyxTheme.colors.accent,
        borderWidth: 1.5,
    },
    verifiedTick: {
        position: 'absolute',
        right: -4,
        bottom: -4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        color: alumnyxTheme.colors.accent,
        textAlign: 'center',
        fontSize: 10,
        lineHeight: 16,
        fontWeight: '700',
    },
    avatarText: { color: alumnyxTheme.colors.primary, fontWeight: '800', fontSize: 17 },
    author: { fontWeight: '700', fontSize: 15, color: alumnyxTheme.colors.textMain },
    authorSub: { fontSize: 12, color: alumnyxTheme.colors.muted, marginTop: 1 },
    moreBtn: {
        color: alumnyxTheme.colors.muted,
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        fontSize: 15,
        color: alumnyxTheme.colors.textMain,
        marginBottom: 10,
        lineHeight: 22,
        fontFamily: Platform.OS === 'web' ? 'serif' : undefined,
    },
    mediaWrap: {
        marginTop: 2,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E6E2DA',
        backgroundColor: '#F5EFE5',
        marginBottom: 10,
        height: 190,
    },
    mediaImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    actionRow: {
        borderTopWidth: 1,
        borderTopColor: alumnyxTheme.colors.border,
        paddingTop: 10,
        flexDirection: 'row',
        gap: 14,
        alignItems: 'center',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    shareBtn: {
        marginLeft: 'auto',
    },
    actionIcon: {
        color: alumnyxTheme.colors.muted,
        fontSize: 14,
    },
    actionIconActive: {
        color: alumnyxTheme.colors.primary,
    },
    actionText: {
        color: alumnyxTheme.colors.muted,
        fontSize: 12,
        fontWeight: '600',
    },
    emptyText: { textAlign: 'center', color: alumnyxTheme.colors.muted, fontWeight: '600', marginTop: 26 },
});
