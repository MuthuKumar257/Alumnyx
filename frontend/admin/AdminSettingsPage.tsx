import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import axiosClient from '../api/axiosClient';
import { getUniversityConfig, updateUniversityConfig } from './api/departmentAdminClient';

interface Props {
    currentUser: any;
    canManageAdmins: boolean;
}

type ProfileForm = {
    firstName: string;
    lastName: string;
    profilePicture: string;
    currentCompany: string;
    bio: string;
    skills: string;
};

const emptyProfile: ProfileForm = {
    firstName: '',
    lastName: '',
    profilePicture: '',
    currentCompany: '',
    bio: '',
    skills: '',
};

export default function AdminSettingsPage({ currentUser, canManageAdmins }: Props) {
    const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');
    const [profileErr, setProfileErr] = useState('');

    const [universityName, setUniversityName] = useState('');
    const [universityLocked, setUniversityLocked] = useState(false);
    const [uniSaving, setUniSaving] = useState(false);
    const [uniMsg, setUniMsg] = useState('');
    const [uniErr, setUniErr] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdSaving, setPwdSaving] = useState(false);
    const [pwdMsg, setPwdMsg] = useState('');
    const [pwdErr, setPwdErr] = useState('');

    const canEditUniversity = canManageAdmins && !universityLocked;

    const setProfileField = (key: keyof ProfileForm, value: string) => {
        setProfile((prev) => ({ ...prev, [key]: value }));
    };

    const loadProfile = async () => {
        setProfileErr('');
        try {
            const id = currentUser?.id;
            if (!id) return;
            const res = await axiosClient.get(`/users/${id}`);
            const user = res.data || {};
            const p = user.profile || {};

            setProfile({
                firstName: String(p.firstName || ''),
                lastName: String(p.lastName || ''),
                profilePicture: String(p.profilePicture || ''),
                currentCompany: String(p.currentCompany || ''),
                bio: String(p.bio || ''),
                skills: Array.isArray(p.skills) ? p.skills.join(', ') : String(p.skills || ''),
            });
        } catch (e: any) {
            setProfileErr(e?.response?.data?.message || 'Failed to load profile settings.');
        }
    };

    const loadUniversity = async () => {
        setUniErr('');
        try {
            const data = await getUniversityConfig();
            setUniversityName(String(data?.universityName || ''));
            setUniversityLocked(Boolean(data?.locked));
        } catch (e: any) {
            setUniErr(e?.response?.data?.message || 'Failed to load university settings.');
        }
    };

    useEffect(() => {
        loadProfile();
        loadUniversity();
    }, []);

    const profileInitial = useMemo(() => {
        const src = profile.firstName || profile.lastName || currentUser?.email || 'A';
        return src.charAt(0).toUpperCase();
    }, [profile.firstName, profile.lastName, currentUser?.email]);

    const saveProfile = async () => {
        setProfileMsg('');
        setProfileErr('');

        if (!profile.firstName.trim()) {
            setProfileErr('First name is required.');
            return;
        }

        setProfileSaving(true);
        try {
            await axiosClient.put('/users/profile', {
                firstName: profile.firstName.trim(),
                lastName: profile.lastName.trim(),
                profilePicture: profile.profilePicture.trim() || null,
                currentCompany: profile.currentCompany.trim() || null,
                bio: profile.bio.trim() || null,
                skills: profile.skills,
            });
            setProfileMsg('Profile settings saved successfully.');
            await loadProfile();
        } catch (e: any) {
            setProfileErr(e?.response?.data?.message || 'Failed to save profile settings.');
        } finally {
            setProfileSaving(false);
        }
    };

    const saveUniversity = async () => {
        setUniMsg('');
        setUniErr('');
        if (!canManageAdmins) {
            setUniErr('Only Super Admin can change university settings.');
            return;
        }
        if (universityLocked) {
            setUniErr('University name is locked and cannot be changed.');
            return;
        }
        if (!universityName.trim()) {
            setUniErr('University name is required.');
            return;
        }

        setUniSaving(true);
        try {
            const res = await updateUniversityConfig(universityName.trim());
            setUniversityName(String(res?.universityName || universityName.trim()));
            setUniversityLocked(Boolean(res?.locked ?? true));
            setUniMsg('University settings saved successfully.');
        } catch (e: any) {
            setUniErr(e?.response?.data?.message || 'Failed to save university settings.');
        } finally {
            setUniSaving(false);
        }
    };

    const changePassword = async () => {
        setPwdMsg('');
        setPwdErr('');

        if (!currentPassword || !newPassword) {
            setPwdErr('Current password and new password are required.');
            return;
        }
        if (newPassword.length < 8) {
            setPwdErr('New password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwdErr('New password and confirm password do not match.');
            return;
        }

        setPwdSaving(true);
        try {
            await axiosClient.put('/users/change-password', {
                currentPassword,
                newPassword,
            });
            setPwdMsg('Password updated successfully.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (e: any) {
            setPwdErr(e?.response?.data?.message || 'Failed to update password.');
        } finally {
            setPwdSaving(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.wrap}>
            <View style={styles.headerCard}>
                <Text style={styles.kicker}>Administration</Text>
                <Text style={styles.title}>Settings</Text>
                <Text style={styles.subtitle}>Manage profile, credentials, and global organization preferences.</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Profile Settings</Text>
                {profileErr ? <Text style={styles.errorText}>{profileErr}</Text> : null}
                {profileMsg ? <Text style={styles.successText}>{profileMsg}</Text> : null}

                <View style={styles.photoRow}>
                    <View style={styles.avatarBox}>
                        <Text style={styles.avatarText}>{profileInitial}</Text>
                    </View>
                    <View style={styles.fieldWide}>
                        <Text style={styles.label}>Profile Photo URL</Text>
                        <TextInput
                            style={styles.input}
                            value={profile.profilePicture}
                            onChangeText={(v) => setProfileField('profilePicture', v)}
                            placeholder="https://example.com/avatar.jpg"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.field}>
                        <Text style={styles.label}>First Name *</Text>
                        <TextInput style={styles.input} value={profile.firstName} onChangeText={(v) => setProfileField('firstName', v)} placeholder="First name" />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>Last Name</Text>
                        <TextInput style={styles.input} value={profile.lastName} onChangeText={(v) => setProfileField('lastName', v)} placeholder="Last name" />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.field}>
                        <Text style={styles.label}>Current Company</Text>
                        <TextInput style={styles.input} value={profile.currentCompany} onChangeText={(v) => setProfileField('currentCompany', v)} placeholder="Organization" />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>Skills (comma separated)</Text>
                        <TextInput style={styles.input} value={profile.skills} onChangeText={(v) => setProfileField('skills', v)} placeholder="Leadership, Communication" />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.fieldWide}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.bio]}
                            value={profile.bio}
                            onChangeText={(v) => setProfileField('bio', v)}
                            placeholder="Short profile summary"
                            multiline
                        />
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.primaryBtn, profileSaving && styles.disabled]} onPress={saveProfile} disabled={profileSaving}>
                        <Text style={styles.primaryBtnText}>{profileSaving ? 'Saving...' : 'Save Profile'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>University Settings</Text>
                {uniErr ? <Text style={styles.errorText}>{uniErr}</Text> : null}
                {uniMsg ? <Text style={styles.successText}>{uniMsg}</Text> : null}
                {!canManageAdmins ? <Text style={styles.helper}>Only Super Admin can edit university settings.</Text> : null}
                {universityLocked ? <Text style={styles.helper}>University name is locked after initial setup.</Text> : null}

                <View style={styles.row}>
                    <View style={styles.fieldWide}>
                        <Text style={styles.label}>University Name</Text>
                        <TextInput
                            style={[styles.input, !canEditUniversity && styles.readOnly]}
                            value={universityName}
                            onChangeText={setUniversityName}
                            placeholder="University name"
                            editable={canEditUniversity}
                        />
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.primaryBtn, (!canEditUniversity || uniSaving) && styles.disabled]} onPress={saveUniversity} disabled={!canEditUniversity || uniSaving}>
                        <Text style={styles.primaryBtnText}>{uniSaving ? 'Saving...' : 'Save University'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Security</Text>
                {pwdErr ? <Text style={styles.errorText}>{pwdErr}</Text> : null}
                {pwdMsg ? <Text style={styles.successText}>{pwdMsg}</Text> : null}

                <View style={styles.row}>
                    <View style={styles.field}>
                        <Text style={styles.label}>Current Password</Text>
                        <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secureTextEntry />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Minimum 8 characters" secureTextEntry />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.fieldWide}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" secureTextEntry />
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.primaryBtn, pwdSaving && styles.disabled]} onPress={changePassword} disabled={pwdSaving}>
                        <Text style={styles.primaryBtnText}>{pwdSaving ? 'Updating...' : 'Update Password'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    wrap: {
        paddingBottom: 30,
        gap: 14,
    },
    headerCard: {
        backgroundColor: '#001F3F',
        borderRadius: 14,
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    kicker: {
        color: '#AFC8F0',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.6,
        marginTop: 2,
    },
    subtitle: {
        color: '#D4E3FF',
        fontSize: 13,
        marginTop: 4,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E3E5',
        borderRadius: 14,
        padding: 16,
    },
    cardTitle: {
        color: '#001F3F',
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    field: {
        flex: 1,
        minWidth: 220,
    },
    fieldWide: {
        flex: 1,
        minWidth: 260,
    },
    label: {
        color: '#43474E',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E3E5',
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        color: '#181C1E',
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
    },
    readOnly: {
        backgroundColor: '#F1F5F9',
        color: '#94A3B8',
    },
    bio: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    photoRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    avatarBox: {
        width: 72,
        height: 72,
        borderRadius: 12,
        backgroundColor: '#D4E3FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#AFBFD7',
    },
    avatarText: {
        color: '#001C3A',
        fontSize: 24,
        fontWeight: '900',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    primaryBtn: {
        backgroundColor: '#476083',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    disabled: {
        backgroundColor: '#94A3B8',
    },
    errorText: {
        color: '#BA1A1A',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 10,
    },
    successText: {
        color: '#156B4D',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 10,
    },
    helper: {
        color: '#6B7280',
        fontSize: 12,
        marginBottom: 10,
    },
});
