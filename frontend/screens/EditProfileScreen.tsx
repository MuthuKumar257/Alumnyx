import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView, Image } from 'react-native';
import { ArrowLeft, Pencil } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'AIDS', 'CSBS'];

export default function EditProfileScreen({ navigation }: any) {
    const { user, updateUser } = useContext(AuthContext);
    const [saving, setSaving] = useState(false);
    const [resumeFileName, setResumeFileName] = useState('');
    const [formData, setFormData] = useState({
        firstName: user?.profile?.firstName || '',
        lastName: user?.profile?.lastName || '',
        college: user?.profile?.college || '',
        graduationYear: user?.profile?.graduationYear?.toString() || '',
        department: user?.profile?.department || '',
        currentCompany: user?.profile?.currentCompany || '',
        bio: user?.profile?.bio || '',
        skills: user?.profile?.skills?.join(', ') || '',
        profilePicture: user?.profile?.profilePicture || '',
        resumeUrl: user?.profile?.resumeUrl || '',
    });

    useEffect(() => {
        setFormData({
            firstName: user?.profile?.firstName || '',
            lastName: user?.profile?.lastName || '',
            college: user?.profile?.college || '',
            graduationYear: user?.profile?.graduationYear?.toString() || '',
            department: user?.profile?.department || '',
            currentCompany: user?.profile?.currentCompany || '',
            bio: user?.profile?.bio || '',
            skills: user?.profile?.skills?.join(', ') || '',
            profilePicture: user?.profile?.profilePicture || '',
            resumeUrl: user?.profile?.resumeUrl || '',
        });
        setResumeFileName(user?.profile?.resumeUrl ? 'Resume attached' : '');
    }, [user]);

    const canEditUniversity = Boolean(user?.isSuperAdmin);

    const handlePickProfilePhoto = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission needed', 'Please allow photo library access to select a profile photo.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: true,
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            const picked = result.assets[0];
            const mimeType = picked.mimeType || 'image/jpeg';
            const imageSource = picked.base64 ? `data:${mimeType};base64,${picked.base64}` : picked.uri;
            setFormData((prev) => ({ ...prev, profilePicture: imageSource }));
        } catch {
            Alert.alert('Error', 'Unable to select image right now. Please try again.');
        }
    };

    const handleSave = async () => {
        const year = formData.graduationYear ? parseInt(formData.graduationYear, 10) : undefined;

        if (!formData.firstName.trim()) {
            Alert.alert('Validation', 'First name is required.');
            return;
        }

        if (formData.graduationYear && (year === undefined || Number.isNaN(year) || year < 1990 || year > 2100)) {
            Alert.alert('Validation', 'Graduation year must be between 1990 and 2100.');
            return;
        }

        if (formData.department && !DEPARTMENTS.includes(formData.department.toUpperCase())) {
            Alert.alert('Validation', `Department must be one of: ${DEPARTMENTS.join(', ')}`);
            return;
        }

        setSaving(true);
        try {
            await axiosClient.put('/users/profile', {
                ...formData,
                graduationYear: year,
                department: formData.department ? formData.department.toUpperCase() : null,
                skills: formData.skills ? formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
                profilePicture: formData.profilePicture || null,
                resumeUrl: formData.resumeUrl || null,
            });
            await updateUser();
            Alert.alert('Success', 'Profile updated successfully!');
            navigation?.goBack?.();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handlePickResume = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                ],
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled || !result.assets?.length) return;

            const asset = result.assets[0] as any;
            let encoded = '';

            if (Platform.OS === 'web' && asset?.file) {
                encoded = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || ''));
                    reader.onerror = () => reject(new Error('Failed to read file'));
                    reader.readAsDataURL(asset.file);
                });
            } else if (asset?.uri) {
                const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: 'base64' as any,
                });
                const mimeType = asset.mimeType || 'application/pdf';
                encoded = `data:${mimeType};base64,${base64}`;
            }

            if (!encoded) {
                Alert.alert('Resume', 'Unable to read selected file. Try another file.');
                return;
            }

            setFormData((prev) => ({ ...prev, resumeUrl: encoded }));
            setResumeFileName(String(asset?.name || 'Resume attached'));
        } catch {
            Alert.alert('Resume', 'Unable to select resume right now. Please try again.');
        }
    };

    return (
        <View style={styles.pageWrap}>
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <TouchableOpacity style={styles.topIconBtn} onPress={() => navigation?.goBack?.()}>
                        <ArrowLeft size={17} color="#4A40E0" strokeWidth={2.2} />
                    </TouchableOpacity>
                    <Text style={styles.topTitle}>Edit Profile</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.avatarBlock}>
                    <View style={styles.avatarShell}>
                        {formData.profilePicture ? (
                            <Image source={{ uri: formData.profilePicture }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarText}>{formData.firstName?.[0] || '?'}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.avatarEditPill}>
                        <Pencil size={13} color="#4A40E0" strokeWidth={2.3} />
                        <Text style={styles.avatarEditPillText}>Profile photo is selectable and editable</Text>
                    </View>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Personal Details</Text>
                    <TextInput style={styles.input} placeholder="First Name" value={formData.firstName} onChangeText={(t) => setFormData({ ...formData, firstName: t })} />
                    <TextInput style={styles.input} placeholder="Last Name" value={formData.lastName} onChangeText={(t) => setFormData({ ...formData, lastName: t })} />
                    <TextInput
                        style={[styles.input, !canEditUniversity && styles.inputDisabled]}
                        placeholder="University Name"
                        value={formData.college}
                        onChangeText={(t) => setFormData({ ...formData, college: t })}
                        editable={canEditUniversity}
                    />
                    {!canEditUniversity ? <Text style={styles.helperText}>University name is global and can be changed only by Super Admin.</Text> : null}

                    <TextInput style={styles.input} placeholder="Graduation Year" keyboardType="numeric" value={formData.graduationYear} onChangeText={(t) => setFormData({ ...formData, graduationYear: t })} />
                    {Platform.OS === 'web' ? (
                        <select
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: (e.target as HTMLSelectElement).value })}
                            style={{ border: '1px solid #E5E5E5', borderRadius: 8, padding: '12px', marginBottom: 10, background: '#FFFFFF', color: '#1A1A1A', width: '100%' } as any}
                        >
                            <option value="">Select Department</option>
                            {DEPARTMENTS.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    ) : (
                        <TextInput
                            style={styles.input}
                            placeholder={`Department (${DEPARTMENTS.join(', ')})`}
                            value={formData.department}
                            onChangeText={(t) => setFormData({ ...formData, department: t.toUpperCase() })}
                        />
                    )}
                    <TextInput style={styles.input} placeholder="Current Company" value={formData.currentCompany} onChangeText={(t) => setFormData({ ...formData, currentCompany: t })} />
                    <View style={styles.photoActions}>
                        <TouchableOpacity style={styles.photoActionBtn} onPress={handlePickProfilePhoto}>
                            <Text style={styles.photoActionBtnText}>Select Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.photoActionBtn, styles.photoActionBtnSecondary]}
                            onPress={() => setFormData({ ...formData, profilePicture: '' })}
                        >
                            <Text style={[styles.photoActionBtnText, styles.photoActionBtnTextSecondary]}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.photoActions}>
                        <TouchableOpacity style={styles.photoActionBtn} onPress={handlePickResume}>
                            <Text style={styles.photoActionBtnText}>Upload Resume</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.photoActionBtn, styles.photoActionBtnSecondary]}
                            onPress={() => {
                                setFormData({ ...formData, resumeUrl: '' });
                                setResumeFileName('');
                            }}
                        >
                            <Text style={[styles.photoActionBtnText, styles.photoActionBtnTextSecondary]}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.resumeMeta}>
                        {resumeFileName ? `Resume selected: ${resumeFileName}` : 'No resume uploaded'}
                    </Text>
                    <TextInput style={[styles.input, styles.bioInput]} placeholder="Bio" multiline value={formData.bio} onChangeText={(t) => setFormData({ ...formData, bio: t })} />
                    <TextInput style={styles.input} placeholder="Skills (comma separated)" value={formData.skills} onChangeText={(t) => setFormData({ ...formData, skills: t })} />

                    <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
                        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
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
        backgroundColor: '#F4F6FF',
        paddingBottom: 110,
        paddingTop: 8,
        alignSelf: 'center',
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 620 : '100%',
    },
    avatarBlock: {
        alignItems: 'center',
        marginBottom: 14,
    },
    avatarShell: {
        width: 112,
        height: 112,
        borderRadius: 56,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        backgroundColor: '#4A40E0',
        overflow: 'hidden',
        marginBottom: 8,
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
        fontSize: 36,
        fontWeight: '800',
    },
    avatarEditPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#EBF1FF',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    avatarEditPillText: {
        color: '#4A40E0',
        fontSize: 12,
        fontWeight: '700',
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D7E3FF',
        marginHorizontal: 16,
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 12,
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
    inputDisabled: {
        backgroundColor: '#F8FAFC',
        color: '#69788E',
    },
    helperText: {
        marginTop: -4,
        marginBottom: 10,
        color: '#69788E',
        fontSize: 12,
        fontWeight: '500',
    },
    photoActions: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    photoActionBtn: {
        flex: 1,
        backgroundColor: '#4A40E0',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoActionBtnSecondary: {
        backgroundColor: '#EBF1FF',
    },
    photoActionBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    photoActionBtnTextSecondary: {
        color: '#3A4B66',
    },
    resumeMeta: {
        marginTop: -4,
        marginBottom: 10,
        color: '#4A40E0',
        fontSize: 12,
        fontWeight: '600',
    },
    bioInput: {
        minHeight: 84,
        textAlignVertical: 'top',
    },
    saveBtn: {
        marginTop: 4,
        backgroundColor: '#4A40E0',
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        backgroundColor: '#9AA8C4',
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
});
