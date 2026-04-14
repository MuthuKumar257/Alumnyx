import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface AlumniVerificationPageProps {
    users: any[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}

export default function AlumniVerificationPage({ users, onApprove, onReject }: AlumniVerificationPageProps) {
    if (users.length === 0) {
        return <Text style={styles.empty}>No pending alumni requests.</Text>;
    }

    return (
        <View>
            {users.map((u) => (
                <View key={u.id} style={styles.card}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{u.profile?.firstName} {u.profile?.lastName}</Text>
                        <Text style={styles.meta}>{u.email}</Text>
                        <Text style={styles.meta}>{u.profile?.college || 'No college provided'}</Text>
                        {u.profile?.department ? <Text style={styles.meta}>Dept: {u.profile.department}</Text> : null}
                        {u.profile?.graduationYear ? <Text style={styles.meta}>Graduation: {u.profile.graduationYear}</Text> : null}
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity style={[styles.btn, styles.approve]} onPress={() => onApprove(u.id)}>
                            <Text style={styles.btnTxt}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.reject]} onPress={() => onReject(u.id)}>
                            <Text style={styles.btnTxt}>Reject</Text>
                        </TouchableOpacity>
                    </View>
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
    name: {
        fontWeight: '800',
        fontSize: 15,
        color: '#111827',
    },
    meta: {
        marginTop: 2,
        color: '#6B7280',
        fontSize: 13,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    btn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    approve: {
        backgroundColor: '#16A34A',
    },
    reject: {
        backgroundColor: '#DC2626',
    },
    btnTxt: {
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
