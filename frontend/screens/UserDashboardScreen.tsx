import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axiosClient from '../api/axiosClient';

type QuickSection = 'Profile' | 'Connections' | 'Jobs' | 'Messages' | 'Post';

interface Props {
    onNavigate?: (section: QuickSection) => void;
}

export default function UserDashboardScreen({ onNavigate }: Props) {
    const navigation = useNavigation<any>();
    const { width } = useWindowDimensions();
    const isWide = width >= 980;
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<any>(null);
    const [activities, setActivities] = useState<any[]>([]);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/users/dashboard');
            setOverview(res.data?.overview || null);
            setActivities(res.data?.recentActivities || []);
        } catch (error) {
            console.error('Failed to load dashboard', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const cards = useMemo(() => [
        { key: 'connections', label: 'Connections', value: overview?.connectionsCount || 0, bg: '#ECFDF5', color: '#059669' },
        { key: 'saved', label: 'Saved Jobs', value: overview?.savedJobsCount || 0, bg: '#EFF6FF', color: '#2563EB' },
        { key: 'applications', label: 'Applications', value: overview?.applicationsCount || 0, bg: '#FEF3C7', color: '#B45309' },
    ], [overview]);

    const quickActions: { label: string; section: QuickSection; bg: string }[] = [
        { label: 'Go to Profile', section: 'Profile', bg: '#EEF2FF' },
        { label: 'My Connections', section: 'Connections', bg: '#ECFDF5' },
        { label: 'Jobs & Internships', section: 'Jobs', bg: '#FEF3C7' },
        { label: 'Open Chat', section: 'Messages', bg: '#FCE7F3' },
        { label: 'Post', section: 'Post', bg: '#E0F2FE' },
    ];

    const handleQuickNavigate = (section: QuickSection) => {
        if (onNavigate) {
            onNavigate(section);
            return;
        }
        navigation.navigate(section);
    };

    if (loading) {
        return (
            <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
                <Text style={styles.heroTitle}>My Dashboard</Text>
                <Text style={styles.heroSubtitle}>{overview?.name || 'Welcome'} • {overview?.department || 'Department not set'}</Text>
                <Text style={styles.heroText}>{overview?.bio || 'Complete your profile to unlock better networking and career suggestions.'}</Text>
            </View>

            <View style={[styles.statsRow, isWide && styles.statsRowWide]}>
                {cards.map((card) => (
                    <View key={card.key} style={[styles.statCard, isWide && styles.statCardWide, { backgroundColor: card.bg }]}>
                        <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
                        <Text style={styles.statLabel}>{card.label}</Text>
                    </View>
                ))}
            </View>

            <View style={[styles.section, isWide && styles.sectionWide]}>
                <Text style={styles.sectionTitle}>Quick Access</Text>
                <View style={[styles.quickGrid, isWide && styles.quickGridWide]}>
                    {quickActions.map((action) => (
                        <TouchableOpacity
                            key={action.section}
                            style={[styles.quickCard, isWide && styles.quickCardWide, { backgroundColor: action.bg }]}
                            onPress={() => handleQuickNavigate(action.section)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.quickCardLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Activities</Text>
                {activities.length === 0 ? (
                    <Text style={styles.emptyText}>No recent activity yet.</Text>
                ) : (
                    activities.map((item) => (
                        <View key={item.id} style={styles.activityCard}>
                            <Text style={styles.activityTitle}>{item.title}</Text>
                            <Text style={styles.activitySub} numberOfLines={2}>{item.subtitle}</Text>
                            <Text style={styles.activityTime}>{new Date(item.createdAt).toLocaleString()}</Text>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        alignSelf: 'center',
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 1100 : '100%',
    },
    content: {
        padding: 16,
        paddingBottom: 28,
    },
    loaderWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    hero: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D7E0EB',
        padding: 18,
        marginBottom: 14,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
    },
    heroSubtitle: {
        marginTop: 4,
        color: '#475569',
        fontSize: 14,
        fontWeight: '600',
    },
    heroText: {
        marginTop: 8,
        color: '#64748B',
        fontSize: 14,
        lineHeight: 20,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
        flexWrap: 'wrap',
    },
    statsRowWide: {
        justifyContent: 'space-between',
    },
    statCard: {
        flex: 1,
        minWidth: 180,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#D7E0EB',
    },
    statCardWide: {
        minWidth: 0,
        width: '32.4%',
    },
    statValue: {
        fontSize: 30,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 13,
        color: '#334155',
        fontWeight: '600',
        marginTop: 4,
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D7E0EB',
        padding: 16,
        marginBottom: 14,
    },
    sectionWide: {
        padding: 18,
    },
    sectionTitle: {
        fontSize: 18,
        color: '#0F172A',
        fontWeight: '700',
        marginBottom: 12,
    },
    quickGrid: {
        gap: 8,
    },
    quickGridWide: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    quickCard: {
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#D7E0EB',
    },
    quickCardWide: {
        width: '49.2%',
    },
    quickCardLabel: {
        color: '#1F2937',
        fontSize: 14,
        fontWeight: '700',
    },
    activityCard: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        backgroundColor: '#F8FAFC',
    },
    activityTitle: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '700',
    },
    activitySub: {
        color: '#475569',
        fontSize: 13,
        marginTop: 2,
    },
    activityTime: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 6,
    },
    emptyText: {
        color: '#64748B',
        fontSize: 14,
    },
});
