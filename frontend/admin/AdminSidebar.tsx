import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { LayoutDashboard, ShieldCheck, Users, GraduationCap, Building2, FileText, LogOut, Settings, CircleHelp, PlusCircle } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

type MenuKey = 'dashboard' | 'admins' | 'users' | 'alumni' | 'departments' | 'logs' | 'settings';

interface AdminSidebarProps {
    active: MenuKey;
    onNavigate: (key: MenuKey) => void;
    onLogout: () => void;
}

const MENU_ITEMS: { key: MenuKey; label: string; icon: LucideIcon }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'admins', label: 'Admin Management', icon: ShieldCheck },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'alumni', label: 'Alumni', icon: GraduationCap },
    { key: 'departments', label: 'Departments', icon: Building2 },
    { key: 'logs', label: 'Activity Logs', icon: FileText },
    { key: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar({ active, onNavigate, onLogout }: AdminSidebarProps) {
    return (
        <View style={styles.sidebar}>
            <View style={styles.brandBox}>
                <View style={styles.brandLogo}>
                    <Image source={require('../assets/webicon.png')} style={styles.brandLogoImage} />
                </View>
                <View style={styles.brandText}>
                    <Image source={require('../assets/text.png')} style={styles.brandWordmark} />
                </View>
            </View>

            <ScrollView style={styles.menuWrap} showsVerticalScrollIndicator={false}>
                {MENU_ITEMS.map((item) => {
                    const isActive = item.key === active;
                    const Icon = item.icon;
                    return (
                        <TouchableOpacity
                            key={item.key}
                            style={[styles.menuItem, isActive && styles.menuItemActive]}
                            onPress={() => onNavigate(item.key)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                                <Icon size={17} color={isActive ? '#001F3F' : '#475569'} strokeWidth={2.2} />
                            </View>
                            <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>{item.label}</Text>
                        </TouchableOpacity>
                    );
                })}

                <TouchableOpacity style={styles.campaignBtn} activeOpacity={0.8}>
                    <PlusCircle size={16} color="#2F2300" strokeWidth={2.3} />
                    <Text style={styles.campaignText}>New Campaign</Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.bottomSection}>
                <TouchableOpacity style={styles.footerLink} onPress={() => onNavigate('settings')} activeOpacity={0.75}>
                    <Settings size={16} color="#475569" strokeWidth={2.1} />
                    <Text style={styles.footerLinkText}>Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.footerLink} activeOpacity={0.75}>
                    <CircleHelp size={16} color="#475569" strokeWidth={2.1} />
                    <Text style={styles.footerLinkText}>Support</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
                    <LogOut size={16} color="#BA1A1A" strokeWidth={2.2} style={styles.logoutIcon} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    sidebar: {
        width: 264,
        backgroundColor: '#F1F4F6',
        borderRightWidth: 0,
        flexDirection: 'column',
        height: '100%',
    },
    brandBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingTop: 20,
        paddingBottom: 20,
        backgroundColor: '#001F3F',
        borderBottomWidth: 1,
        borderBottomColor: '#000613',
    },
    brandLogo: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'transparent',
        borderWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    brandLogoImage: {
        width: 28,
        height: 28,
        resizeMode: 'contain',
    },
    brandText: {
        flex: 1,
    },
    brandTitle: {
        color: '#F8FAFC',
        fontWeight: '800',
        fontSize: 20,
        letterSpacing: -0.3,
    },
    brandWordmark: {
        width: 126,
        height: 24,
        resizeMode: 'contain',
    },
    brandSub: {
        color: '#AFC8F0',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginTop: 1,
    },
    menuWrap: {
        flex: 1,
        paddingHorizontal: 0,
        paddingTop: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 0,
        marginBottom: 1,
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
    },
    menuItemActive: {
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderLeftColor: '#735C00',
    },
    iconWrap: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    iconWrapActive: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E7C35A',
    },
    menuLabel: {
        color: '#475569',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    menuLabelActive: {
        color: '#001F3F',
        fontWeight: '700',
    },
    campaignBtn: {
        marginHorizontal: 14,
        marginTop: 14,
        marginBottom: 10,
        borderRadius: 10,
        backgroundColor: '#FED65B',
        minHeight: 44,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(87,69,0,0.25)',
    },
    campaignText: {
        color: '#2F2300',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    bottomSection: {
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 18,
        borderTopWidth: 1,
        borderTopColor: 'rgba(160,174,198,0.25)',
        gap: 4,
    },
    footerLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderRadius: 9,
    },
    footerLinkText: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '600',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderRadius: 9,
        backgroundColor: '#FFDAD6',
        borderWidth: 1,
        borderColor: '#F3BBB4',
    },
    logoutIcon: {
        marginRight: 10,
    },
    logoutText: {
        color: '#BA1A1A',
        fontSize: 12,
        fontWeight: '700',
    },
});
