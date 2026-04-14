import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Image, Platform, Alert, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axiosClient from '../api/axiosClient';
import { alumnyxTheme } from '../theme/alumnyxTheme';

export default function AchievementPostsScreen() {
    const { width } = useWindowDimensions();
    const isWide = width >= 980;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [posts, setPosts] = useState<any[]>([]);
    const [description, setDescription] = useState('');
    const [image, setImage] = useState('');

    const pickFromGallery = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission required', 'Please allow gallery access to select an image.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });
            if (!result.canceled && result.assets?.length) {
                setImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Gallery picker failed', error);
        }
    };

    const pickFromCamera = async () => {
        try {
            // Expo web may not support direct camera launch reliably; fallback to image picker.
            if (Platform.OS === 'web') {
                await pickFromGallery();
                return;
            }

            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission required', 'Please allow camera access to take a photo.');
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.8,
            });
            if (!result.canceled && result.assets?.length) {
                setImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Camera picker failed', error);
            Alert.alert('Camera unavailable', 'Could not open camera. Please use Select Image.');
        }
    };

    const loadPosts = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/users/achievement-posts');
            setPosts(res.data || []);
        } catch (error) {
            console.error('Failed to load achievement posts', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, []);

    const createPost = async () => {
        if (!image.trim()) return;
        setSaving(true);
        try {
            await axiosClient.post('/users/achievement-posts', {
                description: description.trim() || null,
                image: image.trim(),
            });
            setDescription('');
            setImage('');
            await loadPosts();
        } catch (error) {
            console.error('Create achievement post failed', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.hero}>
                <Image source={require('../assets/mobiletext.png')} style={styles.brandImage} />
                <Text style={styles.heading}>Post</Text>
                <Text style={styles.subtitle}>Share updates, achievements, and opportunities with your network.</Text>
            </View>

            <View style={styles.formCard}>
                <Text style={styles.formTitle}>Create Post</Text>
                <Text style={styles.formHint}>Step 1: Select image from Gallery or Camera</Text>
                <View style={styles.pickerActions}>
                    <TouchableOpacity style={styles.pickerBtn} onPress={pickFromGallery}>
                        <Text style={styles.pickerBtnText}>Select Image</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pickerBtn} onPress={pickFromCamera}>
                        <Text style={styles.pickerBtnText}>Use Camera</Text>
                    </TouchableOpacity>
                </View>
                {!!image.trim() && (
                    <Image source={{ uri: image }} style={styles.previewImage} />
                )}
                <Text style={styles.formHint}>Step 2: Add description (optional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add description (optional)"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    editable={!!image.trim()}
                />
                <TouchableOpacity style={[styles.submitBtn, (saving || !image.trim()) && styles.submitBtnDisabled]} onPress={createPost} disabled={saving || !image.trim()}>
                    <Text style={styles.submitText}>{saving ? 'Posting...' : 'Post'}</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={alumnyxTheme.colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={posts}
                    key={isWide ? 'post-2col' : 'post-1col'}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listWrap}
                    numColumns={isWide ? 2 : 1}
                    columnWrapperStyle={isWide ? styles.columnWrapper : undefined}
                    renderItem={({ item }) => (
                        <View style={[styles.postCard, isWide && styles.postCardWide]}>
                            {!!item.image && <Image source={{ uri: item.image }} style={styles.postImage} />}
                            {!!item.description && <Text style={styles.postDescription}>{item.description}</Text>}
                            <Text style={styles.postDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No posts yet.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: alumnyxTheme.colors.backgroundLight,
        padding: 16,
        alignSelf: 'center',
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 1000 : '100%',
    },
    brand: {
        fontSize: 24,
        color: alumnyxTheme.colors.primary,
        fontWeight: '800',
        fontFamily: alumnyxTheme.typography.heading,
    },
    brandImage: {
        width: 132,
        height: 28,
        resizeMode: 'contain',
    },
    heading: {
        fontSize: 24,
        color: alumnyxTheme.colors.textMain,
        fontWeight: '700',
    },
    subtitle: {
        marginTop: 4,
        color: alumnyxTheme.colors.muted,
        fontSize: 13,
        fontWeight: '500',
    },
    hero: {
        backgroundColor: alumnyxTheme.colors.surface,
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
        borderRadius: alumnyxTheme.radius.lg,
        padding: 14,
        marginBottom: 10,
        ...alumnyxTheme.shadow.card,
    },
    formCard: {
        backgroundColor: alumnyxTheme.colors.surface,
        borderRadius: alumnyxTheme.radius.lg,
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
        padding: 12,
        marginBottom: 12,
        ...alumnyxTheme.shadow.card,
    },
    formTitle: {
        fontSize: 16,
        color: alumnyxTheme.colors.textMain,
        fontWeight: '700',
        marginBottom: 8,
    },
    formHint: {
        fontSize: 12,
        color: alumnyxTheme.colors.muted,
        fontWeight: '500',
        marginBottom: 8,
    },
    pickerActions: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    pickerBtn: {
        backgroundColor: '#EEF3FA',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
    },
    pickerBtnText: {
        color: alumnyxTheme.colors.primary,
        fontWeight: '700',
        fontSize: 12,
    },
    input: {
        backgroundColor: alumnyxTheme.colors.surface,
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 9,
        marginBottom: 8,
    },
    textArea: {
        minHeight: 92,
        textAlignVertical: 'top',
    },
    previewImage: {
        width: '100%',
        height: 180,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#EFEDE9',
    },
    submitBtn: {
        backgroundColor: alumnyxTheme.colors.primary,
        borderRadius: 8,
        paddingVertical: 11,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: '#98A3B1',
    },
    submitText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    listWrap: {
        paddingBottom: 22,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    postCard: {
        backgroundColor: alumnyxTheme.colors.surface,
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
        borderRadius: alumnyxTheme.radius.lg,
        padding: 12,
        marginBottom: 10,
        ...alumnyxTheme.shadow.card,
    },
    postCardWide: {
        width: '49.2%',
    },
    postImage: {
        width: '100%',
        height: 180,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#EFEDE9',
    },
    postDescription: {
        color: alumnyxTheme.colors.textMain,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    postDate: {
        marginTop: 6,
        color: alumnyxTheme.colors.muted,
        fontSize: 12,
    },
    emptyText: {
        color: alumnyxTheme.colors.muted,
        textAlign: 'center',
        marginTop: 20,
    },
});
