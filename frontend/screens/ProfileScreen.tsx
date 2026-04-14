import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView, Image } from 'react-native';
import { ArrowLeft, Settings, Pencil, GraduationCap, UserRound, Newspaper, Bookmark, UserCog, LogOut, FileText } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';

export default function ProfileScreen({ navigation }: any) {
    const { user, logout } = useContext(AuthContext);

    const fullName = `${user?.profile?.firstName || ''} ${user?.profile?.lastName || ''}`.trim() || 'Network User';
    const academicLine = [
        user?.profile?.department || null,
        user?.profile?.graduationYear || null,
    ].filter(Boolean).join(' • ');

    const networkCount = Number((user as any)?.connectionsCount || 0);
    const contributionCount = Number(user?.profile?.skills?.length || 0);

    const openSavedJobs = () => {
        if (navigation?.navigate) {
            navigation.navigate('Jobs');
            return;
        }
        Alert.alert('Saved Jobs', 'Open Jobs and toggle Saved Jobs to view your saved list.');
    };

    const goBack = () => {
        if (navigation?.canGoBack?.()) {
            navigation.goBack();
            return;
        }
        if (navigation?.navigate) navigation.navigate('Home');
    };

    return (
        <View style={styles.pageWrap}>
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <TouchableOpacity style={styles.topIconBtn} onPress={goBack}>
                        <ArrowLeft size={17} color="#4A40E0" strokeWidth={2.2} />
                    </TouchableOpacity>
                    <Text style={styles.topTitle}>Profile</Text>
                </View>
                <TouchableOpacity style={styles.topIconBtn} onPress={() => navigation?.navigate?.('Settings')}>
                    <Settings size={17} color="#4A40E0" strokeWidth={2.2} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.identityWrap}>
                    <View style={styles.avatarGlow} />
                    <View style={styles.avatarShell}>
                        {user?.profile?.profilePicture ? (
                            <Image source={{ uri: user.profile.profilePicture }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarText}>{user?.profile?.firstName?.[0] || '?'}</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity style={styles.editAvatarBtn} onPress={() => navigation?.navigate?.('EditProfile')}>
                        <Pencil size={14} color="#F4F1FF" strokeWidth={2.4} />
                    </TouchableOpacity>

                    <Text style={styles.name}>{fullName}</Text>
                    <Text style={styles.credential}>{academicLine || user?.email || 'Network Member'}</Text>
                    <View style={styles.collegePill}>
                        <GraduationCap size={13} color="#4E5C71" strokeWidth={2.2} />
                        <Text style={styles.collegePillText}>{user?.profile?.college || 'University Alumni'}</Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{networkCount}</Text>
                        <Text style={styles.statLabel}>NETWORK</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{contributionCount}</Text>
                        <Text style={styles.statLabel}>CONTRIBUTIONS</Text>
                    </View>
                </View>

                <View style={styles.menuCard}>
                    <TouchableOpacity style={styles.menuRow} onPress={() => navigation?.navigate?.('EditProfile')}>
                        <View style={styles.menuLeft}>
                            <View style={styles.menuIconBubble}><UserRound size={17} color="#4A40E0" strokeWidth={2.2} /></View>
                            <Text style={styles.menuLabel}>Edit Profile</Text>
                        </View>
                        <Text style={styles.menuChevron}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuRow} onPress={() => navigation?.navigate ? navigation.navigate('Post') : Alert.alert('My Posts', 'Open Post tab to see your posts.') }>
                        <View style={styles.menuLeft}>
                            <View style={styles.menuIconBubble}><Newspaper size={17} color="#4A40E0" strokeWidth={2.2} /></View>
                            <Text style={styles.menuLabel}>My Posts</Text>
                        </View>
                        <Text style={styles.menuChevron}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuRow} onPress={openSavedJobs}>
                        <View style={styles.menuLeft}>
                            <View style={styles.menuIconBubble}><Bookmark size={17} color="#4A40E0" strokeWidth={2.2} /></View>
                            <Text style={styles.menuLabel}>Saved Jobs</Text>
                        </View>
                        <Text style={styles.menuChevron}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuRow} onPress={() => navigation?.navigate?.('EditProfile')}>
                        <View style={styles.menuLeft}>
                            <View style={styles.menuIconBubble}><FileText size={17} color="#4A40E0" strokeWidth={2.2} /></View>
                            <Text style={styles.menuLabel}>{user?.profile?.resumeUrl ? 'Update Resume' : 'Add Resume'}</Text>
                        </View>
                        <Text style={styles.menuChevron}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.menuRow, styles.menuLastRow]} onPress={() => navigation?.navigate?.('Settings')}>
                        <View style={styles.menuLeft}>
                            <View style={styles.menuIconBubble}><UserCog size={17} color="#4A40E0" strokeWidth={2.2} /></View>
                            <Text style={styles.menuLabel}>Settings</Text>
                        </View>
                        <Text style={styles.menuChevron}>›</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.logoutWrap}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                        <LogOut size={17} color="#D32F2F" strokeWidth={2.2} />
                        <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>
                    <Text style={styles.versionText}>APP v2.4.0</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    pageWrap: {
        flex: 1,
        backgroundColor: '#F4F6FF',
    },
    topBar: {
        height: 64,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F4F6FF',
    },
    topBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    topTitle: {
        color: '#212F43',
        fontSize: 18,
        fontWeight: '800',
    },
    topIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EBF1FF',
    },
    topIcon: {
        color: '#4A40E0',
        fontSize: 17,
        fontWeight: '700',
    },
    container: {
        backgroundColor: '#F4F6FF',
        paddingBottom: 110,
        paddingTop: 6,
        alignSelf: 'center',
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 520 : '100%',
    },
    identityWrap: {
        position: 'relative',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 20,
        paddingHorizontal: 16,
    },
    avatarGlow: {
        position: 'absolute',
        top: -18,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#9795FF',
        opacity: 0.17,
    },
    avatarShell: {
        width: 132,
        height: 132,
        borderRadius: 66,
        borderWidth: 4.5,
        borderColor: '#FFFFFF',
        backgroundColor: '#4A40E0',
        overflow: 'hidden',
        marginBottom: 14,
        zIndex: 2,
    },
    editAvatarBtn: {
        position: 'absolute',
        top: 96,
        left: '58%',
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#4A40E0',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        zIndex: 4,
    },
    editAvatarIcon: {
        color: '#F4F1FF',
        fontSize: 14,
        fontWeight: '800',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#9795FF',
    },
    avatarText: {
        color: '#14007E',
        fontSize: 44,
        fontWeight: '800',
    },
    name: {
        fontSize: 33,
        fontWeight: '800',
        color: '#212F43',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    credential: {
        marginTop: 4,
        fontSize: 13,
        color: '#4A40E0',
        fontWeight: '700',
        textAlign: 'center',
    },
    collegePill: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#EBF1FF',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    collegePillIcon: {
        fontSize: 12,
    },
    collegePillText: {
        color: '#4E5C71',
        fontSize: 12,
        fontWeight: '600',
    },
    statsGrid: {
        marginHorizontal: 16,
        marginBottom: 14,
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        minHeight: 86,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#DCE5FF',
    },
    statValue: {
        color: '#212F43',
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    statLabel: {
        marginTop: 3,
        color: '#69788E',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.1,
    },
    menuCard: {
        backgroundColor: '#EBF1FF',
        borderRadius: 14,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#D7E3FF',
        padding: 8,
    },
    menuRow: {
        minHeight: 62,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    menuLastRow: {
        marginBottom: 0,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuIconBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EBF1FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuIcon: {
        fontSize: 17,
        color: '#4A40E0',
    },
    menuLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#212F43',
    },
    menuChevron: {
        fontSize: 22,
        color: '#A0AEC6',
    },
    logoutWrap: {
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 20,
    },
    logoutBtn: {
        backgroundColor: '#FCEFF4',
        paddingVertical: 14,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    logoutIcon: {
        color: '#D32F2F',
        fontSize: 17,
    },
    logoutText: {
        color: '#D32F2F',
        fontWeight: '700',
        fontSize: 15,
        letterSpacing: 0.2,
    },
    versionText: {
        marginTop: 22,
        textAlign: 'center',
        color: '#A0AEC6',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
    },
});
