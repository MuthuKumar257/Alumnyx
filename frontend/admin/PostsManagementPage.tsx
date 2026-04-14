import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface PostsManagementPageProps {
    posts: any[];
    onDelete: (id: string) => void;
}

export default function PostsManagementPage({ posts, onDelete }: PostsManagementPageProps) {
    if (posts.length === 0) return <Text style={styles.empty}>No posts available.</Text>;

    return (
        <View>
            {posts.map((post) => (
                <View key={post.id} style={styles.card}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.author}>{post.author?.profile?.firstName || post.author?.email}</Text>
                        <Text style={styles.content}>{post.content}</Text>
                    </View>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(post.id)}>
                        <Text style={styles.deleteTxt}>Delete</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    author: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    content: {
        color: '#374151',
        maxWidth: 700,
    },
    deleteBtn: {
        backgroundColor: '#DC2626',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    deleteTxt: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    empty: {
        color: '#6B7280',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 20,
    },
});
