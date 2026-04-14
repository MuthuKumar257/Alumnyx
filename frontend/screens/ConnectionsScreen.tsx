import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Platform, useWindowDimensions, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Search, ChevronDown } from 'lucide-react-native';
import axiosClient from '../api/axiosClient';
import { alumnyxTheme } from '../theme/alumnyxTheme';
import { Check, X } from 'lucide-react-native';

type FilterKey = 'All' | 'Grad Year' | 'Industry' | 'Location' | 'More Filters';

export default function ConnectionsScreen() {
    const { width } = useWindowDimensions();
    const isWide = width >= 920;
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [connections, setConnections] = useState<any[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterKey>('All');

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [usersRes, connectionsRes, requestsRes] = await Promise.all([
                axiosClient.get('/users'),
                axiosClient.get('/users/connections'),
                axiosClient.get('/users/connections/requests'),
            ]);
            setAllUsers(usersRes.data || []);
            setConnections(connectionsRes.data || []);
            setIncomingRequests(requestsRes.data?.incoming || []);
            setOutgoingRequests(requestsRes.data?.outgoing || []);
        } catch (error) {
            console.error('Failed to load connections', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(() => loadData(true), 8000);
        return () => clearInterval(interval);
    }, []);

    useFocusEffect(useCallback(() => {
        loadData(true);
    }, []));

    const incomingMetaByRequester = useMemo(() => {
        const m = new Map<string, number>();
        incomingRequests.forEach((r) => {
            if (r?.requester?.id) m.set(r.requester.id, new Date(r.createdAt || 0).getTime());
        });
        return m;
    }, [incomingRequests]);

    const outgoingMetaByReceiver = useMemo(() => {
        const m = new Map<string, number>();
        outgoingRequests.forEach((r) => {
            if (r?.receiver?.id) m.set(r.receiver.id, new Date(r.createdAt || 0).getTime());
        });
        return m;
    }, [outgoingRequests]);

    const connectedMetaByUser = useMemo(() => {
        const m = new Map<string, number>();
        connections.forEach((c) => {
            if (c?.user?.id) m.set(c.user.id, new Date(c.connectedAt || 0).getTime());
        });
        return m;
    }, [connections]);

    const rankFor = (userId: string) => {
        if (incomingMetaByRequester.has(userId)) return 0;
        if (outgoingMetaByReceiver.has(userId)) return 1;
        if (connectedMetaByUser.has(userId)) return 2;
        return 3;
    };

    const timeFor = (userId: string) => {
        return incomingMetaByRequester.get(userId)
            || outgoingMetaByReceiver.get(userId)
            || connectedMetaByUser.get(userId)
            || 0;
    };

    const filteredUsers = useMemo(() => {
        return allUsers.filter((u) => {
            const role = String(u?.role || '').toUpperCase();
            if (role === 'ADMIN') return false;
            const q = search.trim().toLowerCase();
            const fullName = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim().toLowerCase();
            const email = String(u.email || '').toLowerCase();
            const dept = String(u.profile?.department || '').toLowerCase();
            const company = String(u.profile?.currentCompany || '').toLowerCase();
            const location = String(u.profile?.college || '').toLowerCase();
            const gradYear = String(u.profile?.graduationYear || '');

            const matchesSearch = !q || fullName.includes(q) || email.includes(q) || company.includes(q) || dept.includes(q);
            if (!matchesSearch) return false;
            if (activeFilter === 'All' || activeFilter === 'More Filters') return true;
            if (activeFilter === 'Grad Year') return Boolean(gradYear);
            if (activeFilter === 'Industry') return Boolean(company);
            if (activeFilter === 'Location') return Boolean(location);
            return true;
        }).sort((a, b) => {
            const ar = rankFor(a.id);
            const br = rankFor(b.id);
            if (ar !== br) return ar - br;
            const at = timeFor(a.id);
            const bt = timeFor(b.id);
            if (at !== bt) return bt - at;
            const an = `${a.profile?.firstName || ''} ${a.profile?.lastName || ''}`.trim().toLowerCase();
            const bn = `${b.profile?.firstName || ''} ${b.profile?.lastName || ''}`.trim().toLowerCase();
            return an.localeCompare(bn);
        });
    }, [allUsers, search, activeFilter, incomingMetaByRequester, outgoingMetaByReceiver, connectedMetaByUser]);

    const connectionIds = useMemo(() => new Set(connections.map((c) => c.user?.id).filter(Boolean)), [connections]);
    const incomingByRequester = useMemo(
        () => new Set(incomingRequests.map((r) => r.requester?.id).filter(Boolean)),
        [incomingRequests]
    );
    const outgoingByReceiver = useMemo(
        () => new Set(outgoingRequests.map((r) => r.receiver?.id).filter(Boolean)),
        [outgoingRequests]
    );

    const handleAdd = async (targetUserId: string) => {
        try {
            await axiosClient.post(`/users/connections/${targetUserId}`);
            await loadData();
        } catch (error) {
            console.error('Add connection failed', error);
            Alert.alert('Connection', 'Could not send request.');
        }
    };

    const handleRespond = async (requestId: string, action: 'ACCEPT' | 'REJECT') => {
        try {
            await axiosClient.put(`/users/connections/requests/${requestId}`, { action });
            await loadData();
        } catch (error) {
            console.error('Respond request failed', error);
            Alert.alert('Connection', 'Could not update request.');
        }
    };

    const handleRemove = async (targetUserId: string) => {
        try {
            await axiosClient.delete(`/users/connections/${targetUserId}`);
            await loadData();
        } catch (error) {
            console.error('Remove connection failed', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={alumnyxTheme.colors.primary} />
            </View>
        );
    }

    const filters: FilterKey[] = ['All', 'Grad Year', 'Industry', 'Location', 'More Filters'];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
                        <ArrowLeft size={18} color={alumnyxTheme.colors.primary} strokeWidth={2.2} />
                    </TouchableOpacity>
                    <Text style={styles.heading}>Connections</Text>
                    <View style={styles.backBtn} />
                </View>

                <View style={styles.searchWrap}>
                    <Search size={16} color={alumnyxTheme.colors.muted} strokeWidth={2.2} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, major, or company..."
                        placeholderTextColor={alumnyxTheme.colors.muted}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                <FlatList
                    data={filters}
                    horizontal
                    keyExtractor={(item) => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersRow}
                    renderItem={({ item }) => {
                        const active = item === activeFilter;
                        return (
                            <TouchableOpacity
                                style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipInactive]}
                                onPress={() => setActiveFilter(item)}
                            >
                                <Text style={[styles.filterText, active ? styles.filterTextActive : styles.filterTextInactive]}>
                                    {item}
                                </Text>
                                {item !== 'All' && (
                                    <View style={styles.filterArrow}>
                                        <ChevronDown
                                            size={14}
                                            color={active ? '#FFFFFF' : alumnyxTheme.colors.muted}
                                            strokeWidth={2.2}
                                        />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            <FlatList
                data={filteredUsers}
                key={isWide ? 'connections-2col' : 'connections-1col'}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listWrap}
                numColumns={isWide ? 2 : 1}
                columnWrapperStyle={isWide ? styles.columnWrapper : undefined}
                ListHeaderComponent={
                    <View>
                        <Text style={styles.resultText}>Incoming requests: {incomingRequests.length} · Sent requests: {outgoingRequests.length}</Text>
                        {incomingRequests.length > 0 && (
                            <View style={styles.requestsWrap}>
                                <Text style={styles.requestsTitle}>Connection Requests</Text>
                                {incomingRequests.map((request) => {
                                    const requester = request.requester;
                                    const fullName = `${requester?.profile?.firstName || ''} ${requester?.profile?.lastName || ''}`.trim() || requester?.email;
                                    return (
                                        <View key={request.id} style={styles.requestRow}>
                                            <Text style={styles.requestText} numberOfLines={1}>{fullName}</Text>
                                            <View style={styles.requestActions}>
                                                <TouchableOpacity style={[styles.requestBtn, styles.acceptBtn]} onPress={() => handleRespond(request.id, 'ACCEPT')}>
                                                    <Check size={14} color="#FFFFFF" strokeWidth={2.6} />
                                                    <Text style={styles.requestBtnText}>Accept</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.requestBtn, styles.rejectBtn]} onPress={() => handleRespond(request.id, 'REJECT')}>
                                                    <X size={14} color="#FFFFFF" strokeWidth={2.6} />
                                                    <Text style={styles.requestBtnText}>Reject</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                        {outgoingRequests.length > 0 && (
                            <View style={styles.requestsWrap}>
                                <Text style={styles.requestsTitle}>Pending Sent Requests</Text>
                                {outgoingRequests.slice(0, 6).map((request) => {
                                    const receiver = request.receiver;
                                    const fullName = `${receiver?.profile?.firstName || ''} ${receiver?.profile?.lastName || ''}`.trim() || receiver?.email;
                                    return (
                                        <View key={request.id} style={styles.requestRow}>
                                            <Text style={styles.requestText} numberOfLines={1}>{fullName}</Text>
                                            <View style={[styles.requestBtn, styles.pendingBtn]}>
                                                <Text style={[styles.requestBtnText, styles.pendingLabel]}>Requested</Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                        <Text style={styles.resultText}>Showing {filteredUsers.length} people</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const fullName = `${item.profile?.firstName || ''} ${item.profile?.lastName || ''}`.trim() || item.email;
                    const isConnected = connectionIds.has(item.id);
                    const hasIncoming = incomingByRequester.has(item.id);
                    const isPending = outgoingByReceiver.has(item.id);
                    const title = item.profile?.currentCompany ? `${item.profile?.currentCompany}` : 'Alumnyx Member';
                    const subtitle = `${item.profile?.department || 'Major not set'}${item.profile?.graduationYear ? ` '${String(item.profile.graduationYear).slice(-2)}` : ''}`;
                    return (
                        <View style={[styles.card, isWide && styles.cardWide]}>
                            <TouchableOpacity
                                style={styles.profileArea}
                                activeOpacity={0.85}
                                onPress={() => navigation.navigate('OtherUserProfile', { userId: item.id })}
                            >
                                <View style={[styles.avatar, isConnected && styles.avatarConnected]}>
                                    <Text style={styles.avatarText}>{(item.profile?.firstName?.[0] || fullName[0] || 'A').toUpperCase()}</Text>
                                    {isConnected && <Text style={styles.premiumBadge}>★</Text>}
                                </View>

                                <View style={styles.cardMain}>
                                    <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
                                    <Text style={styles.meta} numberOfLines={1}>{title}</Text>
                                    <Text style={styles.subMeta} numberOfLines={1}>{subtitle}</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.actionBtn,
                                    isConnected ? styles.messageBtn : hasIncoming ? styles.acceptMiniBtn : isPending ? styles.pendingBtn : styles.connectBtn,
                                ]}
                                disabled={isPending}
                                onPress={() => {
                                    if (isConnected) return navigation.navigate('Messages', { openUserId: item.id });
                                    if (hasIncoming) {
                                        const req = incomingRequests.find((r) => r.requester?.id === item.id);
                                        if (req) return handleRespond(req.id, 'ACCEPT');
                                    }
                                    return handleAdd(item.id);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.actionText,
                                        isConnected
                                            ? styles.actionTextSent
                                            : hasIncoming
                                                ? styles.actionTextSent
                                                : isPending
                                                    ? styles.actionTextPending
                                                    : styles.actionTextConnect,
                                    ]}
                                >
                                    {isConnected ? 'Message' : hasIncoming ? 'Accept' : isPending ? 'Requested' : 'Connect'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                }}
                ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
                ListFooterComponent={
                    <View style={styles.footerLoading}>
                        <ActivityIndicator color={alumnyxTheme.colors.primary} />
                    </View>
                }
            />
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
        maxWidth: Platform.OS === 'web' ? 520 : '100%',
    },
    loaderWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: alumnyxTheme.colors.backgroundLight,
    },
    header: {
        backgroundColor: alumnyxTheme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: alumnyxTheme.colors.border,
        paddingTop: 4,
        paddingBottom: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 6,
        paddingBottom: 6,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        color: alumnyxTheme.colors.primary,
        fontSize: 18,
        fontWeight: '700',
    },
    heading: {
        fontSize: 26,
        fontWeight: '700',
        color: alumnyxTheme.colors.primary,
        fontFamily: 'serif',
        textAlign: 'center',
    },
    searchWrap: {
        marginTop: 2,
        marginHorizontal: 16,
        position: 'relative',
        justifyContent: 'center',
    },
    searchIcon: {
        position: 'absolute',
        left: 13,
        top: 11,
        color: alumnyxTheme.colors.muted,
        fontSize: 16,
        zIndex: 2,
    },
    searchInput: {
        backgroundColor: alumnyxTheme.colors.surface,
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
        borderRadius: 8,
        paddingLeft: 40,
        paddingRight: 12,
        height: 42,
        fontSize: 13,
    },
    filtersRow: {
        paddingHorizontal: 16,
        paddingTop: 10,
        gap: 8,
    },
    filterChip: {
        height: 34,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        gap: 2,
    },
    filterChipActive: {
        borderColor: alumnyxTheme.colors.primary,
        backgroundColor: alumnyxTheme.colors.surface,
    },
    filterChipInactive: {
        borderColor: '#E5E5E5',
        backgroundColor: alumnyxTheme.colors.surface,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '500',
    },
    filterTextActive: {
        color: alumnyxTheme.colors.primary,
    },
    filterTextInactive: {
        color: alumnyxTheme.colors.muted,
    },
    filterArrow: {
        marginLeft: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listWrap: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 88,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    resultText: {
        color: alumnyxTheme.colors.muted,
        fontSize: 12,
        marginBottom: 10,
        marginLeft: 2,
    },
    requestsWrap: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
    },
    requestsTitle: {
        color: alumnyxTheme.colors.primary,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 6,
    },
    requestRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
        gap: 8,
    },
    requestText: {
        flex: 1,
        color: '#1F2937',
        fontSize: 13,
        fontWeight: '600',
    },
    requestActions: {
        flexDirection: 'row',
        gap: 6,
    },
    requestBtn: {
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    requestBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    acceptBtn: {
        backgroundColor: '#2563EB',
    },
    rejectBtn: {
        backgroundColor: '#EF4444',
    },
    card: {
        backgroundColor: alumnyxTheme.colors.surface,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        ...alumnyxTheme.shadow.card,
    },
    cardWide: {
        width: '49.2%',
    },
    profileArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minWidth: 0,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F4F7FB',
        position: 'relative',
    },
    avatarConnected: {
        borderColor: alumnyxTheme.colors.accent,
        borderWidth: 2,
    },
    avatarText: {
        color: alumnyxTheme.colors.primary,
        fontWeight: '700',
        fontSize: 19,
        fontFamily: 'serif',
    },
    premiumBadge: {
        position: 'absolute',
        right: -4,
        bottom: -4,
        color: alumnyxTheme.colors.accent,
        fontSize: 13,
        backgroundColor: '#FFFFFF',
        width: 16,
        height: 16,
        borderRadius: 8,
        textAlign: 'center',
        lineHeight: 16,
        overflow: 'hidden',
    },
    cardMain: {
        flex: 1,
        minWidth: 0,
    },
    name: {
        color: alumnyxTheme.colors.primary,
        fontWeight: '700',
        fontSize: 20,
        fontFamily: 'serif',
    },
    meta: {
        color: alumnyxTheme.colors.textMain,
        fontSize: 13,
        marginTop: 1,
        fontWeight: '600',
    },
    subMeta: {
        color: alumnyxTheme.colors.muted,
        fontSize: 11,
        marginTop: 1,
    },
    actionBtn: {
        borderRadius: 8,
        height: 32,
        paddingHorizontal: 11,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    connectBtn: {
        borderColor: alumnyxTheme.colors.primary,
        backgroundColor: '#FFFFFF',
    },
    sentBtn: {
        borderColor: alumnyxTheme.colors.primary,
        backgroundColor: alumnyxTheme.colors.primary,
    },
    acceptMiniBtn: {
        borderColor: '#2563EB',
        backgroundColor: '#2563EB',
    },
    pendingBtn: {
        borderColor: '#94A3B8',
        backgroundColor: '#E2E8F0',
    },
    messageBtn: {
        borderColor: alumnyxTheme.colors.primary,
        backgroundColor: alumnyxTheme.colors.primary,
    },
    actionText: {
        fontWeight: '700',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    actionTextConnect: {
        color: alumnyxTheme.colors.primary,
    },
    actionTextSent: {
        color: '#FFFFFF',
    },
    actionTextPending: {
        color: '#475569',
    },
    pendingLabel: {
        color: '#475569',
    },
    emptyText: {
        color: alumnyxTheme.colors.muted,
        textAlign: 'center',
        marginTop: 20,
    },
    footerLoading: {
        paddingTop: 10,
        paddingBottom: 16,
    },
});
