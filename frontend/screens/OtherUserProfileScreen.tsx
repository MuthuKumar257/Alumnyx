import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Building2, GraduationCap, BriefcaseBusiness, MessageCircle } from 'lucide-react-native';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';

export default function OtherUserProfileScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user: currentUser } = useContext(AuthContext);
    const targetUserId = route?.params?.userId;

    const [loading, setLoading] = useState(true);
    const [profileUser, setProfileUser] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            if (!targetUserId) {
                setLoading(false);
                return;
            }
            try {
                const res = await axiosClient.get(`/users/${targetUserId}`);
                setProfileUser(res.data || null);
            } catch {
                setProfileUser(null);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [targetUserId]);

    const fullName = `${profileUser?.profile?.firstName || ''} ${profileUser?.profile?.lastName || ''}`.trim() || profileUser?.email || 'User';
    const avatarText = String(fullName).charAt(0).toUpperCase();
    const isSelf = Boolean(currentUser?.id && profileUser?.id && currentUser.id === profileUser.id);

    if (loading) {
        return (
            <View style={styles.centerWrap}>
                <ActivityIndicator size="large" color="#4A40E0" />
            </View>
        );
    }

    if (!profileUser) {
        return (
            <View style={styles.centerWrap}>
                <Text style={styles.emptyTitle}>Profile not available</Text>
                <TouchableOpacity style={styles.backPill} onPress={() => navigation.goBack()}>
                    <Text style={styles.backPillText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.pageWrap}>
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.topIconBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={17} color="#4A40E0" strokeWidth={2.2} />
                </TouchableOpacity>
                <Text style={styles.topTitle}>User Profile</Text>
                <View style={styles.topIconBtn} />
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.heroCard}>
                    <View style={styles.avatarShell}>
                        {profileUser?.profile?.profilePicture ? (
                            <Image source={{ uri: profileUser.profile.profilePicture }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarText}>{avatarText}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.name}>{fullName}</Text>
                    <Text style={styles.email}>{profileUser?.email || ''}</Text>

                    {!isSelf && (
                        <TouchableOpacity
                            style={styles.messageBtn}
                            onPress={() => navigation.navigate('Messages', { openUserId: profileUser.id })}
                        >
                            <MessageCircle size={16} color="#FFFFFF" strokeWidth={2.2} />
                            <Text style={styles.messageBtnText}>Message</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Building2 size={15} color="#4A40E0" strokeWidth={2.2} />
                        <Text style={styles.infoText}>{profileUser?.profile?.college || 'University not set'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <GraduationCap size={15} color="#4A40E0" strokeWidth={2.2} />
                        <Text style={styles.infoText}>
                            {profileUser?.profile?.department || 'Department not set'}
                            {profileUser?.profile?.graduationYear ? ` • ${profileUser.profile.graduationYear}` : ''}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <BriefcaseBusiness size={15} color="#4A40E0" strokeWidth={2.2} />
                        <Text style={styles.infoText}>{profileUser?.profile?.currentCompany || 'Company not set'}</Text>
                    </View>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Bio</Text>
                    <Text style={styles.bioText}>{profileUser?.profile?.bio || 'No bio added yet.'}</Text>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Skills</Text>
                    <View style={styles.skillsWrap}>
                        {(profileUser?.profile?.skills || []).length ? (
                            (profileUser.profile.skills || []).map((skill: string, idx: number) => (
                                <View key={`${skill}-${idx}`} style={styles.skillChip}>
                                    <Text style={styles.skillText}>{skill}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.bioText}>No skills listed.</Text>
                        )}
                    </View>
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
    centerWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F6FF',
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E2C40',
        marginBottom: 12,
    },
    backPill: {
        backgroundColor: '#4A40E0',
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    backPillText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    topBar: {
        height: 64,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F4F6FF',
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
    container: {
        paddingHorizontal: 16,
        paddingBottom: 80,
        gap: 12,
    },
    heroCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#D7E3FF',
        alignItems: 'center',
    },
    avatarShell: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        backgroundColor: '#4A40E0',
        overflow: 'hidden',
        marginBottom: 10,
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
        fontSize: 34,
        fontWeight: '800',
    },
    name: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2A3D',
        textAlign: 'center',
    },
    email: {
        fontSize: 13,
        color: '#71839B',
        marginTop: 3,
    },
    messageBtn: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#4A40E0',
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    messageBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D7E3FF',
        padding: 16,
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoText: {
        color: '#2B3B54',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D7E3FF',
        padding: 16,
    },
    sectionTitle: {
        color: '#1E2C40',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 8,
    },
    bioText: {
        color: '#5A6C82',
        fontSize: 14,
        lineHeight: 20,
    },
    skillsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    skillChip: {
        backgroundColor: '#EEF3FF',
        borderColor: '#D7E3FF',
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    skillText: {
        color: '#344966',
        fontSize: 12,
        fontWeight: '700',
    },
});
