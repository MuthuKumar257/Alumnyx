import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Users, GraduationCap, Handshake, UserPlus, ShieldPlus, Building2, CircleDot, CheckCheck, UserRound, ArrowRight, Sparkles } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

type QuickActionTarget = 'alumni' | 'users' | 'admins' | 'departments' | 'logs';

interface AdminDashboardProps {
    stats: {
        users: number;
        alumni: number;
        mentorship: number;
    };
    onQuickAction: (target: QuickActionTarget) => void;
}

export default function AdminDashboard({ stats, onQuickAction }: AdminDashboardProps) {
    const isWeb = Platform.OS === 'web';

    const cards = [
        { label: 'Total Users', value: stats.users, tone: 'users', icon: Users },
        { label: 'Verified Alumni', value: stats.alumni, tone: 'alumni', icon: GraduationCap },
        { label: 'Active Mentorships', value: stats.mentorship, tone: 'mentorship', icon: Handshake },
    ];

    const quickActions: { label: string; target: QuickActionTarget; bg: string }[] = [
        { label: 'Add Alumni', target: 'alumni', bg: '#EEF2FF' },
        { label: 'Add User', target: 'users', bg: '#ECFDF5' },
        { label: 'Add Admin', target: 'admins', bg: '#FEF3C7' },
        { label: 'Add Dept', target: 'departments', bg: '#FCE7F3' },
    ];

    const recentActivity = [
        { action: 'New Alumni Registered', user: 'John Smith', time: '2 mins ago', type: 'user' },
        { action: 'Mentorship Accepted', user: 'Mike Johnson', time: '1 hour ago', type: 'mentorship' },
        { action: 'User Verified', user: 'Alex Brown', time: '3 hours ago', type: 'verify' },
    ];

    const getActivityIcon = (type: string): LucideIcon => {
        switch(type) {
            case 'user': return UserRound;
            case 'mentorship': return Handshake;
            case 'verify': return CheckCheck;
            default: return CircleDot;
        }
    };

    const getActivityColor = (type: string) => {
        switch(type) {
            case 'user': return '#4F46E5';
            case 'mentorship': return '#4338CA';
            case 'verify': return '#059669';
            default: return '#64748B';
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.heroBand}>
                <View>
                    <Text style={styles.welcomeText}>Overview</Text>
                    <Text style={styles.title}>Admin Dashboard</Text>
                    <Text style={styles.subtitle}>Monitor live engagement, verifications, and network health across your alumni ecosystem.</Text>
                </View>
                <View style={styles.headerBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Live</Text>
                </View>
            </View>

            <View style={styles.statsGrid}>
                {cards.map((card) => {
                    const Icon = card.icon;
                    const isUsers = card.tone === 'users';
                    const isAlumni = card.tone === 'alumni';
                    const accent = isUsers ? '#1E40AF' : isAlumni ? '#0F766E' : '#4338CA';
                    const bg = isUsers ? '#EFF6FF' : isAlumni ? '#ECFEF6' : '#EEF2FF';
                    return (
                    <View key={card.label} style={[styles.statCard, { backgroundColor: bg }]}> 
                        <View style={styles.statRowTop}>
                            <View style={[styles.iconCircle, { backgroundColor: accent + '20' }]}> 
                                <Icon size={20} color={accent} strokeWidth={2.3} />
                            </View>
                            <View style={styles.deltaBadge}>
                                <Sparkles size={12} color={accent} strokeWidth={2.4} />
                                <Text style={[styles.deltaText, { color: accent }]}>Live</Text>
                            </View>
                        </View>
                        <Text style={[styles.statValue, { color: accent }]}>{card.value}</Text>
                        <Text style={styles.statLabel}>{card.label}</Text>
                        <View style={[styles.progressBar, { backgroundColor: accent + '30' }]}> 
                            <View style={[styles.progressFill, { backgroundColor: accent, width: `${Math.min(card.value * 5, 100)}%` as any }]} />
                        </View>
                    </View>
                );
                })}
            </View>

            <View style={[styles.bottomSection, !isWeb && styles.bottomSectionMobile]}>
                <View style={styles.activityCard}> 
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Recent Network Activity</Text>
                        <TouchableOpacity
                            style={styles.viewAllBtn}
                            onPress={() => onQuickAction('logs')}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.viewAllText}>View All Records</Text>
                            <ArrowRight size={12} color="#475569" strokeWidth={2.4} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.activityList}>
                        {recentActivity.map((item, index) => {
                            const Icon = getActivityIcon(item.type);
                            return (
                            <View key={index} style={styles.activityItem}>
                                <View style={[styles.activityIcon, { backgroundColor: getActivityColor(item.type) + '15' }]}>
                                    <Icon size={14} color={getActivityColor(item.type)} strokeWidth={2.2} />
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={styles.activityAction}>{item.action}</Text>
                                    <Text style={styles.activityUser}>by {item.user}</Text>
                                </View>
                                <Text style={styles.activityTime}>{item.time}</Text>
                            </View>
                        );
                        })}
                    </View>
                </View>

                <View style={styles.quickActions}>
                    <Text style={styles.cardTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        {quickActions.map((action) => {
                            const ActionIcon =
                                action.target === 'alumni' ? UserPlus :
                                action.target === 'users' ? Users :
                                action.target === 'admins' ? ShieldPlus :
                                Building2;
                            return (
                            <TouchableOpacity
                                key={action.target}
                                style={[styles.actionCard, { backgroundColor: action.bg }]}
                                onPress={() => onQuickAction(action.target)}
                                activeOpacity={0.75}
                            >
                                <ActionIcon size={20} color="#475569" strokeWidth={2.2} style={styles.actionIcon} />
                                <Text style={styles.actionLabel}>{action.label}</Text>
                            </TouchableOpacity>
                        );
                        })}
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7FAFC',
    },
    content: {
        padding: 20,
        paddingBottom: 28,
    },
    heroBand: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 20,
        paddingVertical: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 18,
    },
    welcomeText: {
        color: '#334155',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    title: {
        color: '#001F3F',
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -0.8,
        marginTop: 3,
    },
    subtitle: {
        marginTop: 4,
        color: '#64748B',
        fontSize: 12,
        maxWidth: 600,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 6,
    },
    statusText: {
        color: '#059669',
        fontSize: 12,
        fontWeight: '700',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: Platform.OS === 'web' ? 'nowrap' : 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: Platform.OS === 'web' ? 1 : undefined,
        width: Platform.OS === 'web' ? undefined : '48%',
        borderRadius: 12,
        padding: 16,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(15,23,42,0.06)',
    },
    statRowTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    deltaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D7E3FF',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    deltaText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statIcon: {
        fontSize: 22,
    },
    statValue: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.8,
        marginBottom: 4,
    },
    statLabel: {
        color: '#334155',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.7,
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    bottomSection: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    bottomSectionMobile: {
        flexDirection: 'column',
    },
    activityCard: {
        flex: 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    cardTitle: {
        color: '#001F3F',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
    },
    viewAllText: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    activityList: {
        gap: 4,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    activityIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    activityIconText: {
        fontSize: 14,
    },
    activityContent: {
        flex: 1,
    },
    activityAction: {
        color: '#334155',
        fontSize: 13,
        fontWeight: '600',
    },
    activityUser: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    activityTime: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '500',
    },
    quickActions: {
        flex: 1,
    },
    actionsGrid: {
        marginTop: 8,
        gap: 10,
    },
    actionCard: {
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    actionIcon: {
        fontSize: 20,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 5,
    },
    actionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
});
