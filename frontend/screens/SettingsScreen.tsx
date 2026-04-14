import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { ArrowLeft, Lock, LogOut } from 'lucide-react-native';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';

export default function SettingsScreen({ navigation }: any) {
    const { logout } = useContext(AuthContext);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const goBack = () => {
        if (navigation?.canGoBack?.()) return navigation.goBack();
        if (navigation?.navigate) navigation.navigate('Profile');
    };

    const updatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Validation', 'All password fields are required.');
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert('Validation', 'New password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Validation', 'New password and confirm password do not match.');
            return;
        }

        try {
            setSaving(true);
            await axiosClient.put('/users/change-password', {
                currentPassword,
                newPassword,
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            Alert.alert('Success', 'Password updated successfully.');
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to update password');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.pageWrap}>
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <TouchableOpacity style={styles.topIconBtn} onPress={goBack}>
                        <ArrowLeft size={17} color="#4A40E0" strokeWidth={2.2} />
                    </TouchableOpacity>
                    <Text style={styles.topTitle}>Settings</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Lock size={16} color="#4A40E0" strokeWidth={2.2} />
                        <Text style={styles.sectionTitle}>Change Password</Text>
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Current Password"
                        secureTextEntry
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="New Password"
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm New Password"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />

                    <TouchableOpacity
                        style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                        onPress={updatePassword}
                        disabled={saving}
                    >
                        <Text style={styles.primaryBtnText}>{saving ? 'Updating...' : 'Update Password'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                        <LogOut size={16} color="#D32F2F" strokeWidth={2.2} />
                        <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>
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
    container: {
        paddingHorizontal: 16,
        paddingBottom: 110,
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 560 : '100%',
        alignSelf: 'center',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D7E3FF',
        padding: 14,
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#212F43',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D7E3FF',
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        color: '#212F43',
    },
    primaryBtn: {
        marginTop: 4,
        backgroundColor: '#4A40E0',
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: 'center',
    },
    primaryBtnDisabled: {
        opacity: 0.6,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    logoutBtn: {
        backgroundColor: '#FCEFF4',
        paddingVertical: 12,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    logoutText: {
        color: '#D32F2F',
        fontWeight: '700',
        fontSize: 15,
    },
});
