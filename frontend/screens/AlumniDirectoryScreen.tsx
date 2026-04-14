import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';

export default function AlumniDirectoryScreen() {
    const { user } = useContext(AuthContext);
    const [alumni, setAlumni] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [companyFilter, setCompanyFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');

    const fetchAlumni = async () => {
        setLoading(true);
        try {
            // Build query string
            const params = new URLSearchParams();
            params.append('role', 'ALUMNI');
            if (search) params.append('search', search);
            if (companyFilter) params.append('company', companyFilter);
            if (yearFilter) params.append('graduationYear', yearFilter);

            const response = await axiosClient.get(`/users?${params.toString()}`);
            setAlumni(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlumni();
    }, [search, companyFilter, yearFilter]); // Refetch on filter change

    const requestMentorship = async (mentorId: string) => {
        if (user?.role === 'ALUMNI') {
            Alert.alert('Notice', 'Alumni cannot request mentorship from other alumni.');
            return;
        }

        try {
            await axiosClient.post('/mentorship', { mentorId, message: 'I would love to connect for mentorship!' });
            Alert.alert('Success', 'Mentorship request sent!');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to send request');
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.profile?.firstName?.[0]}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.profile?.firstName} {item.profile?.lastName}</Text>
                    <Text style={styles.headline}>
                        {item.profile?.currentCompany ? `Works at ${item.profile.currentCompany}` : 'Alumni'}
                    </Text>
                    <Text style={styles.subText}>
                        {item.profile?.college} • Class of {item.profile?.graduationYear || 'N/A'}
                    </Text>
                </View>
            </View>

            {item.profile?.skills && item.profile.skills.length > 0 && (
                <View style={styles.skillsRow}>
                    {item.profile.skills.slice(0, 3).map((skill: string, idx: number) => (
                        <Text key={idx} style={styles.skillBadge}>{skill}</Text>
                    ))}
                    {item.profile.skills.length > 3 && <Text style={styles.skillBadge}>+{item.profile.skills.length - 3}</Text>}
                </View>
            )}

            <View style={styles.actions}>
                <TouchableOpacity style={styles.connectBtn} onPress={() => requestMentorship(item.id)}>
                    <Text style={styles.connectText}>Request Mentorship</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search name or college..."
                    value={search}
                    onChangeText={setSearch}
                />
                <View style={styles.filterRow}>
                    <TextInput
                        style={[styles.searchInput, styles.filterInput]}
                        placeholder="Company"
                        value={companyFilter}
                        onChangeText={setCompanyFilter}
                    />
                    <TextInput
                        style={[styles.searchInput, styles.filterInput]}
                        placeholder="Grad Year"
                        keyboardType="numeric"
                        value={yearFilter}
                        onChangeText={setYearFilter}
                    />
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
            ) : alumni.length === 0 ? (
                <Text style={styles.emptyText}>No alumni found matching your criteria.</Text>
            ) : (
                <FlatList
                    data={alumni}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    searchContainer: { backgroundColor: '#FFF', padding: 15, elevation: 4, zIndex: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    searchInput: { backgroundColor: '#F0F2F5', padding: 10, borderRadius: 8, marginBottom: 10 },
    filterRow: { flexDirection: 'row', justifyContent: 'space-between' },
    filterInput: { flex: 0.48, marginBottom: 0 },
    emptyText: { textAlign: 'center', marginTop: 30, color: '#666', fontSize: 16 },
    card: { backgroundColor: '#FFF', margin: 10, marginBottom: 5, padding: 15, borderRadius: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
    info: { flex: 1 },
    name: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headline: { fontSize: 14, color: '#007AFF', fontWeight: '500', marginTop: 2 },
    subText: { fontSize: 12, color: '#666', marginTop: 2 },
    skillsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
    skillBadge: { backgroundColor: '#E3F2FD', color: '#1976D2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontSize: 12, marginRight: 6, marginBottom: 6, overflow: 'hidden' },
    actions: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12, alignItems: 'center' },
    connectBtn: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, width: '100%', alignItems: 'center' },
    connectText: { color: '#FFF', fontWeight: 'bold' },
});
