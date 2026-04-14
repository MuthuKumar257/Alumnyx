import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Image,
} from 'react-native';
import { House, Link2, BriefcaseBusiness, MessageCircle, Trophy, UserRound, Shield, LogOut } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import { alumnyxTheme } from '../theme/alumnyxTheme';

import HomeScreen from '../screens/HomeScreen';
import JobsScreen from '../screens/JobsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ConnectionsScreen from '../screens/ConnectionsScreen';
import AchievementPostsScreen from '../screens/AchievementPostsScreen';
import AdminDashboard from '../screens/AdminDashboard';

interface NavItem {
    key: string;
    label: string;
    icon: LucideIcon;
    component: React.ComponentType<any>;
    roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
    { key: 'Home', label: 'Home', icon: House, component: HomeScreen },
    { key: 'Connections', label: 'My Connections', icon: Link2, component: ConnectionsScreen },
    { key: 'Jobs', label: 'Jobs & Internships', icon: BriefcaseBusiness, component: JobsScreen },
    { key: 'Messages', label: 'Messages', icon: MessageCircle, component: MessagesScreen },
    { key: 'Post', label: 'Post', icon: Trophy, component: AchievementPostsScreen },
    { key: 'Profile', label: 'My Profile', icon: UserRound, component: ProfileScreen },
    { key: 'Admin', label: 'Admin Dashboard', icon: Shield, component: AdminDashboard, roles: ['ADMIN'] },
];

export default function WebSidebarLayout() {
    const { user, logout } = useContext(AuthContext);
    const [activeKey, setActiveKey] = useState('Home');

    const visibleItems = NAV_ITEMS.filter(
        (item) => !item.roles || item.roles.includes(user?.role || '')
    );

    const activeItem = visibleItems.find((i) => i.key === activeKey) || visibleItems[0];
    const ActiveScreen = activeItem.component;

    const initials = user?.profile
        ? `${user.profile.firstName?.[0] || ''}${user.profile.lastName?.[0] || ''}`
        : user?.email?.[0]?.toUpperCase() || 'U';

    const displayName = user?.profile
        ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
        : user?.email || 'User';

    return (
        <View style={styles.root}>
            {/* ─── Sidebar ─── */}
            <View style={styles.sidebar}>
                {/* Logo */}
                <View style={styles.logoSection}>
                    <View style={styles.logoMark}>
                        <Image source={require('../assets/webicon.png')} style={styles.logoMarkImage} />
                    </View>
                    <View>
                        <Image source={require('../assets/text.png')} style={styles.logoImage} />
                        <Text style={styles.logoTagline}>Connect · Grow · Succeed</Text>
                    </View>
                </View>

                {/* User card */}
                <View style={styles.userCard}>
                    <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>{initials}</Text>
                    </View>
                    <View style={styles.userMeta}>
                        <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
                        <View style={styles.badgeRow}>
                            <Text style={styles.roleBadge}>{user?.role}</Text>
                            {user?.isVerified && (
                                <Text style={styles.verifiedBadge}>✓</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Navigation */}
                <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
                    <Text style={styles.navSection}>NAVIGATION</Text>
                    {visibleItems.map((item) => {
                        const isActive = activeKey === item.key;
                        const Icon = item.icon;
                        return (
                            <TouchableOpacity
                                key={item.key}
                                style={[styles.navItem, isActive && styles.navItemActive]}
                                onPress={() => setActiveKey(item.key)}
                            >
                                <View style={styles.navIcon}>
                                    <Icon size={16} color={isActive ? '#FFFFFF' : '#E2E8F0'} strokeWidth={2.2} />
                                </View>
                                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                                    {item.label}
                                </Text>
                                {isActive && <View style={styles.navActiveIndicator} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <LogOut size={16} color="#E2E8F0" strokeWidth={2.2} style={styles.logoutIcon} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>

            {/* ─── Main content ─── */}
            <View style={styles.mainContent}>
                {/* Top header bar */}
                <View style={styles.topBar}>
                    <Text style={styles.topBarTitle}>{activeItem.label}</Text>
                    <Text style={styles.topBarSub}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                </View>

                {/* Screen content */}
                <View style={styles.screenWrapper}>
                    <ActiveScreen onNavigate={setActiveKey} />
                </View>
            </View>
        </View>
    );
}

const SIDEBAR_WIDTH = 248;
const TOPBAR_HEIGHT = 56;

const styles = StyleSheet.create({
    root: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: alumnyxTheme.colors.backgroundLight,
    },

    // ── Sidebar ──
    sidebar: {
        width: SIDEBAR_WIDTH,
        backgroundColor: alumnyxTheme.colors.primary,
        flexDirection: 'column',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    logoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.12)',
    },
    logoMark: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    logoMarkImage: {
        width: 22,
        height: 22,
        resizeMode: 'contain',
    },
    logoText: {
        color: '#F8FAFC',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    logoTagline: {
        color: '#CBD5E1',
        fontSize: 9,
        marginTop: 1,
        letterSpacing: 0.5,
    },

    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        marginVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: alumnyxTheme.radius.lg,
        padding: 10,
    },
    userAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: alumnyxTheme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    userAvatarText: {
        color: alumnyxTheme.colors.primary,
        fontWeight: 'bold',
        fontSize: 15,
    },
    userMeta: { flex: 1 },
    userName: {
        color: '#E2E8F0',
        fontWeight: '600',
        fontSize: 13,
    },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
    roleBadge: {
        color: '#F8F3E3',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        backgroundColor: 'rgba(212,175,55,0.26)',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        overflow: 'hidden',
    },
    verifiedBadge: {
        color: alumnyxTheme.colors.accent,
        fontSize: 11,
        marginLeft: 5,
        fontWeight: 'bold',
    },

    navList: {
        flex: 1,
        paddingTop: 4,
        paddingHorizontal: 10,
    },
    navSection: {
        color: '#CBD5E1',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginTop: 8,
        marginBottom: 6,
        marginLeft: 8,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 2,
        position: 'relative',
    },
    navItemActive: {
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    navIcon: {
        width: 26,
        alignItems: 'center',
    },
    navLabel: {
        color: '#E2E8F0',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    navLabelActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    navActiveIndicator: {
        width: 3,
        height: 20,
        borderRadius: 2,
        backgroundColor: alumnyxTheme.colors.accent,
        position: 'absolute',
        right: -2,
        top: '50%',
        marginTop: -10,
    },

    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.12)',
    },
    logoutIcon: { fontSize: 16, marginRight: 10 },
    logoutText: {
        color: '#E2E8F0',
        fontSize: 14,
        fontWeight: '500',
    },

    // ── Main content area ──
    logoImage: {
        width: 124,
        height: 24,
        resizeMode: 'contain',
        tintColor: '#AFC8F0',
    },
    mainContent: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: alumnyxTheme.colors.backgroundLight,
        overflow: 'hidden',
    },
    topBar: {
        height: TOPBAR_HEIGHT,
        backgroundColor: alumnyxTheme.colors.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: alumnyxTheme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    topBarTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: alumnyxTheme.colors.primary,
    },
    topBarSub: {
        fontSize: 13,
        color: alumnyxTheme.colors.muted,
    },
    screenWrapper: {
        flex: 1,
        overflow: 'hidden',
    },
});
