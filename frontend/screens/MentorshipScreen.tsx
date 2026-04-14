import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';

export default function MentorshipScreen() {
    const { user } = useContext(AuthContext);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const response = await axiosClient.get('/mentorship');
            setRequests(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const updateStatus = async (id: string, status: string) => {
        try {
            await axiosClient.put(`/mentorship/${id}`, { status });
            fetchRequests();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isMentor = user?.id === item.mentorId;
        const otherUser = isMentor ? item.student : item.mentor;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{otherUser.profile?.firstName?.[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.roleLabel}>{isMentor ? 'Student request from:' : 'Requested Mentorship with:'}</Text>
                        <Text style={styles.name}>{otherUser.profile?.firstName} {otherUser.profile?.lastName}</Text>
                    </View>
                </View>

                <View style={styles.messageBox}>
                    <Text style={styles.message}>"{item.message || 'I would like to connect with you for mentorship.'}"</Text>
                </View>

                <View style={styles.statusRow}>
                    <Text style={[styles.statusBadge,
                    item.status === 'ACCEPTED' ? styles.statusAccepted :
                        item.status === 'REJECTED' ? styles.statusRejected : styles.statusPending
                    ]}>
                        {item.status}
                    </Text>
                    <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>

                {isMentor && item.status === 'PENDING' && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => updateStatus(item.id, 'ACCEPTED')}>
                            <Text style={styles.actionText}>Accept Mentorship</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => updateStatus(item.id, 'REJECTED')}>
                            <Text style={styles.actionText}>Decline</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>My Mentorships</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
            ) : requests.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No mentorship requests yet.</Text>
                    {user?.role === 'STUDENT' && (
                        <Text style={styles.emptySubtext}>Use the Alumni Directory to find and request a mentor.</Text>
                    )}
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5', padding: 15, alignSelf: 'center', width: '100%', maxWidth: Platform.OS === 'web' ? 800 : '100%' },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#111', marginBottom: 15 },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#333', fontSize: 18, fontWeight: 'bold' },
    emptySubtext: { color: '#666', fontSize: 14, marginTop: 10, textAlign: 'center' },
    card: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    roleLabel: { fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: 'bold' },
    name: { fontSize: 18, fontWeight: 'bold', color: '#111', marginTop: 2 },
    messageBox: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#007AFF', marginBottom: 15 },
    message: { fontSize: 14, color: '#444', fontStyle: 'italic', lineHeight: 20 },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
    statusPending: { backgroundColor: '#FFF3E0', color: '#E65100' },
    statusAccepted: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
    statusRejected: { backgroundColor: '#FFEBEE', color: '#C62828' },
    dateText: { fontSize: 12, color: '#999' },
    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15 },
    actionBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, marginLeft: 10 },
    acceptBtn: { backgroundColor: '#4CAF50' },
    rejectBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F44336' },
    actionText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
});
