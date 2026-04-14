import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { LayoutDashboard, Users, Hourglass, Handshake, ClipboardList, University, BookOpen, GraduationCap, Check, X } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';

export default function AdminDashboard() {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview'|'users'|'pending'|'mentorships'|'logs'>('overview');
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [pendingAlumni, setPendingAlumni] = useState<any[]>([]);
    const [mentorships, setMentorships] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [statsRes, usersRes, pendingRes, mentorshipRes, logsRes] = await Promise.all([
                axiosClient.get('/admin/stats'),
                axiosClient.get('/admin/users'),
                axiosClient.get('/admin/alumni/pending'),
                axiosClient.get('/admin/mentorships'),
                axiosClient.get('/admin/logs'),
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
            setPendingAlumni(pendingRes.data);
            setMentorships(mentorshipRes.data);
            setLogs(logsRes.data);
        } catch (e) {
            Alert.alert('Error', 'Failed to load admin data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, []);

    const verifyUser = (id: string, name: string) => {
        Alert.alert('Confirm Verification', `Verify ${name} as alumni?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify', onPress: async () => {
                try { await axiosClient.put(`/admin/users/${id}/verify`); loadAll(); }
                catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
            }},
        ]);
    };

    const deleteUser = (id: string, name: string) => {
        if (id === user?.id) { Alert.alert('Error', 'Cannot delete your own account.'); return; }
        Alert.alert('Confirm Delete', `Permanently delete "${name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try { await axiosClient.delete(`/admin/users/${id}`); loadAll(); }
                catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
            }},
        ]);
    };

    const approveAlumni = (id: string, name: string) => {
        Alert.alert('Approve Alumni', `Approve "${name}" as alumni?\nThey will be able to log in and access the platform.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Approve', onPress: async () => {
                try { await axiosClient.put(`/admin/alumni/verify/${id}`); loadAll(); }
                catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to approve alumni'); }
            }},
        ]);
    };

    const rejectAlumni = (id: string, name: string) => {
        Alert.alert('Reject Alumni', `Reject "${name}"?\nThey will not be able to log in.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reject', style: 'destructive', onPress: async () => {
                try { await axiosClient.put(`/admin/alumni/reject/${id}`); loadAll(); }
                catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed to reject alumni'); }
            }},
        ]);
    };

    const updateMentorshipStatus = (id: string, status: 'PENDING' | 'ACCEPTED' | 'REJECTED') => {
        Alert.alert('Update Mentorship', `Set request status to ${status}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Update', onPress: async () => {
                    try {
                        await axiosClient.put(`/admin/mentorships/${id}/status`, { status });
                        loadAll();
                    } catch (e: any) {
                        Alert.alert('Error', e.response?.data?.message || 'Failed to update mentorship');
                    }
                }
            },
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardAvatar}>
                    <Text style={styles.cardAvatarText}>{item.profile?.firstName?.[0] || item.email[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{item.profile?.firstName} {item.profile?.lastName}</Text>
                    <Text style={styles.cardEmail}>{item.email}</Text>
                    <Text style={styles.cardDate}>Joined {new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteUser(item.id, item.profile?.firstName || item.email)}>
                    <Text style={styles.deleteTxt}>Delete</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.badgeRow}>
                <Text style={[styles.roleBadge, item.role === 'ADMIN' && styles.adminBadge, item.role === 'ALUMNI' && styles.alumniBadge]}>{item.role}</Text>
                <Text style={[styles.statusBadge, item.isVerified ? styles.verifiedBadge : styles.unverifiedBadge]}>
                    {item.isVerified ? '✓ Verified' : '⚠ Unverified'}
                </Text>
            </View>
            {!item.isVerified && item.role === 'ALUMNI' && (
                <TouchableOpacity style={styles.verifyBtn} onPress={() => verifyUser(item.id, item.profile?.firstName || item.email)}>
                    <Text style={styles.verifyBtnText}>✓ Verify as Alumni</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderTabBar = () => {
        const TABS: { key: typeof activeTab; label: string; icon: LucideIcon }[] = [
            { key: 'overview', label: 'Overview', icon: LayoutDashboard },
            { key: 'users', label: `Users (${users.length})`, icon: Users },
            { key: 'pending', label: `Pending Alumni (${pendingAlumni.length})`, icon: Hourglass },
            { key: 'mentorships', label: `Mentorships (${mentorships.length})`, icon: Handshake },
            { key: 'logs', label: `Logs (${logs.length})`, icon: ClipboardList },
        ];
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                    <TouchableOpacity key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}>
                        <Icon size={15} color={activeTab === tab.key ? '#2563EB' : '#64748B'} strokeWidth={2.2} style={styles.tabIcon} />
                        <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                );})}
            </ScrollView>
        );
    };

    const renderOverview = () => (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.sectionTitle}>Platform Statistics</Text>
            {stats ? (
                <View style={styles.statsGrid}>
                    {[
                        { label: 'Total Users', value: stats.users?.total, color: '#1D4ED8', bg: '#EFF6FF' },
                        { label: 'Alumni', value: stats.users?.alumni, color: '#15803D', bg: '#F0FDF4' },
                        { label: 'Students', value: stats.users?.students, color: '#C2410C', bg: '#FFF7ED' },
                        { label: 'Mentorships', value: stats.activeMentorships, color: '#0E7490', bg: '#ECFEFF' },
                    ].map((s) => (
                        <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
                            <Text style={[styles.statNum, { color: s.color }]}>{s.value ?? 0}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>
            ) : <ActivityIndicator color="#007AFF" style={{ marginBottom: 20 }} />}
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Recent Activity</Text>
            {logs.slice(0, 8).map((log) => (
                <View key={log.id} style={styles.logRow}>
                    <Text style={styles.logAction}>{log.action.replace(/_/g, ' ')}</Text>
                    <Text style={styles.logMeta}>{log.admin?.profile?.firstName || 'Admin'} · {new Date(log.createdAt).toLocaleString()}</Text>
                </View>
            ))}
            {logs.length === 0 && <Text style={styles.empty}>No activity yet.</Text>}
        </ScrollView>
    );

    const renderContent = () => {
        if (loading) return <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />;
        if (activeTab === 'overview') return renderOverview();
        if (activeTab === 'users') return (
            <FlatList data={users} keyExtractor={i => i.id} renderItem={renderItem}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>} />
        );
        if (activeTab === 'pending') return (
            <FlatList
                data={pendingAlumni}
                keyExtractor={i => i.id}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={<Text style={styles.empty}>No pending alumni registrations.</Text>}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardAvatar}>
                                <Text style={styles.cardAvatarText}>{item.profile?.firstName?.[0] || item.email?.[0]?.toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardName}>{item.profile?.firstName} {item.profile?.lastName}</Text>
                                <Text style={styles.cardEmail}>{item.email}</Text>
                                <Text style={styles.cardDate}>Applied {new Date(item.createdAt).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.pendingStatusBadgeWrap}>
                                <Hourglass size={12} color="#D97706" strokeWidth={2.2} />
                                <Text style={styles.pendingStatusBadge}>Pending</Text>
                            </View>
                        </View>
                        {(item.profile?.college || item.profile?.graduationYear || item.profile?.department) ? (
                            <View style={styles.alumniDetailsRow}>
                                {item.profile?.college ? (
                                    <View style={styles.alumniDetailWrap}><University size={13} color="#475569" strokeWidth={2.2} /><Text style={styles.alumniDetail}>{item.profile.college}</Text></View>
                                ) : null}
                                {item.profile?.department ? (
                                    <View style={styles.alumniDetailWrap}><BookOpen size={13} color="#475569" strokeWidth={2.2} /><Text style={styles.alumniDetail}>{item.profile.department}</Text></View>
                                ) : null}
                                {item.profile?.graduationYear ? (
                                    <View style={styles.alumniDetailWrap}><GraduationCap size={13} color="#475569" strokeWidth={2.2} /><Text style={styles.alumniDetail}>Class of {item.profile.graduationYear}</Text></View>
                                ) : null}
                            </View>
                        ) : null}
                        <View style={styles.actionButtonRow}>
                            <TouchableOpacity
                                style={[styles.smallActionBtn, styles.acceptActionBtn]}
                                onPress={() => approveAlumni(item.id, item.profile?.firstName || item.email)}>
                                <Check size={12} color="#FFFFFF" strokeWidth={2.8} />
                                <Text style={styles.smallActionTxt}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.smallActionBtn, styles.rejectActionBtn]}
                                onPress={() => rejectAlumni(item.id, item.profile?.firstName || item.email)}>
                                <X size={12} color="#FFFFFF" strokeWidth={2.8} />
                                <Text style={styles.smallActionTxt}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        );
        if (activeTab === 'mentorships') return (
            <FlatList data={mentorships} keyExtractor={i => i.id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.cardName}>
                            {item.student?.profile?.firstName || item.student?.email} → {item.mentor?.profile?.firstName || item.mentor?.email}
                        </Text>
                        <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                        <Text style={styles.postContent}>Message: {item.message || 'No message provided'}</Text>
                        <View style={styles.badgeRow}>
                            <Text style={[styles.statusBadge,
                                item.status === 'ACCEPTED' ? styles.verifiedBadge :
                                item.status === 'REJECTED' ? styles.unverifiedBadge : styles.roleBadge
                            ]}>
                                {item.status}
                            </Text>
                        </View>
                        <View style={styles.actionButtonRow}>
                            <TouchableOpacity style={styles.smallActionBtn} onPress={() => updateMentorshipStatus(item.id, 'PENDING')}>
                                <Text style={styles.smallActionTxt}>Set Pending</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.smallActionBtn, styles.acceptActionBtn]} onPress={() => updateMentorshipStatus(item.id, 'ACCEPTED')}>
                                <Text style={styles.smallActionTxt}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.smallActionBtn, styles.rejectActionBtn]} onPress={() => updateMentorshipStatus(item.id, 'REJECTED')}>
                                <Text style={styles.smallActionTxt}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={<Text style={styles.empty}>No mentorship requests found.</Text>} />
        );
        return (
            <FlatList data={logs} keyExtractor={i => i.id}
                renderItem={({ item }) => (
                    <View style={styles.logCard}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.logActionTxt}>{item.action.replace(/_/g, ' ')}</Text>
                            <Text style={styles.logMetaTxt}>{item.admin?.profile?.firstName} {item.admin?.profile?.lastName}</Text>
                        </View>
                        <Text style={styles.logTime}>{new Date(item.createdAt).toLocaleString()}</Text>
                    </View>
                )}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={<Text style={styles.empty}>No logs yet.</Text>} />
        );
    };

    return (
        <View style={styles.container}>
            {renderTabBar()}
            <View style={{ flex: 1 }}>{renderContent()}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F4F8', alignSelf: 'center', width: '100%', maxWidth: Platform.OS === 'web' ? 900 : '100%' },
    tabBar: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexGrow: 0 },
    tabBarContent: { paddingHorizontal: 8 },
    tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 4 },
    tabActive: { borderBottomColor: '#2563EB' },
    tabIcon: { fontSize: 14, marginRight: 6 },
    tabLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    tabLabelActive: { color: '#2563EB', fontWeight: '700' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statCard: { width: '31%', padding: 14, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
    statNum: { fontSize: 28, fontWeight: '800', color: '#1D4ED8' },
    statLabel: { fontSize: 11, color: '#64748B', marginTop: 4, textAlign: 'center' },
    logRow: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#2563EB' },
    logAction: { fontWeight: '600', color: '#1E293B', fontSize: 14, textTransform: 'capitalize' },
    logMeta: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
    card: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    cardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardAvatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    cardName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
    cardEmail: { fontSize: 13, color: '#64748B', marginTop: 2 },
    cardDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    deleteTxt: { color: '#EF4444', fontWeight: '700', fontSize: 13, padding: 4 },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
    roleBadge: { backgroundColor: '#F3E8FF', color: '#7C3AED', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, fontSize: 11, fontWeight: '700', overflow: 'hidden', marginRight: 8 },
    adminBadge: { backgroundColor: '#FEF9C3', color: '#A16207' },
    alumniBadge: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
    verifiedBadge: { backgroundColor: '#DCFCE7', color: '#15803D' },
    unverifiedBadge: { backgroundColor: '#FEE2E2', color: '#B91C1C' },
    pendingStatusBadgeWrap: { backgroundColor: '#FEF3C7', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
    pendingStatusBadge: { color: '#D97706', fontSize: 11, fontWeight: '700' },
    alumniDetailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10, marginTop: 4 },
    alumniDetailWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    alumniDetail: { fontSize: 13, color: '#475569' },
    verifyBtn: { marginTop: 12, backgroundColor: '#16A34A', padding: 10, borderRadius: 8, alignItems: 'center' },
    verifyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    postContent: { color: '#374151', fontSize: 14, lineHeight: 20, marginBottom: 6 },
    postMeta: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },
    logCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
    logActionTxt: { fontWeight: '700', fontSize: 14, color: '#0F172A', textTransform: 'capitalize', marginBottom: 3 },
    logMetaTxt: { fontSize: 12, color: '#64748B', marginBottom: 2 },
    logTime: { fontSize: 11, color: '#94A3B8' },
    actionButtonRow: { flexDirection: 'row', marginTop: 10 },
    smallActionBtn: { backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
    acceptActionBtn: { backgroundColor: '#15803D' },
    rejectActionBtn: { backgroundColor: '#B91C1C' },
    smallActionTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    empty: { textAlign: 'center', color: '#94A3B8', fontSize: 15, marginTop: 30 },
});
