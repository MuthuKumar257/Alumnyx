import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MentorshipPageProps {
    requests: any[];
}

export default function MentorshipPage({ requests }: MentorshipPageProps) {
    if (requests.length === 0) return <Text style={styles.empty}>No mentorship requests found.</Text>;

    return (
        <View>
            {requests.map((r) => (
                <View key={r.id} style={styles.card}>
                    <Text style={styles.name}>
                        {r.student?.profile?.firstName || r.student?.email} → {r.mentor?.profile?.firstName || r.mentor?.email}
                    </Text>
                    <Text style={styles.meta}>Status: {r.status}</Text>
                    <Text style={styles.msg}>{r.message || 'No message provided'}</Text>
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
    },
    name: {
        fontWeight: '800',
        color: '#111827',
    },
    meta: {
        marginTop: 4,
        color: '#4B5563',
    },
    msg: {
        marginTop: 6,
        color: '#6B7280',
    },
    empty: {
        color: '#6B7280',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 20,
    },
});
