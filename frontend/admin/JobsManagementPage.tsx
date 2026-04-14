import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface JobsManagementPageProps {
    jobs: any[];
    onDelete: (id: string, title: string) => void;
}

export default function JobsManagementPage({ jobs, onDelete }: JobsManagementPageProps) {
    if (jobs.length === 0) return <Text style={styles.empty}>No jobs available.</Text>;

    return (
        <View>
            {jobs.map((job) => (
                <View key={job.id} style={styles.card}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{job.title}</Text>
                        <Text style={styles.meta}>{job.company} • {job.location || 'Remote'}</Text>
                        <Text style={styles.meta}>Posted by {job.poster?.profile?.firstName || job.poster?.email}</Text>
                    </View>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(job.id, job.title)}>
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
    title: {
        fontWeight: '800',
        color: '#111827',
        fontSize: 15,
    },
    meta: {
        marginTop: 2,
        color: '#6B7280',
        fontSize: 13,
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
