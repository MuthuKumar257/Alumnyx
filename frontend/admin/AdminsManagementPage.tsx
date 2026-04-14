import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';

interface NewAdminData {
    name: string;
    email: string;
    password: string;
}

interface AdminsManagementPageProps {
    admins: any[];
    canManage: boolean;
    currentUserEmail?: string;
    onAdd: (data: NewAdminData) => Promise<void>;
    onDelete: (id: string, name: string) => void;
    onResetPassword: (id: string, name: string) => void;
    onEdit: (user: any) => void;
    openAddFormSignal?: number;
}

const emptyForm = (): NewAdminData => ({
    name: '',
    email: '',
    password: '',
});

export default function AdminsManagementPage({ admins, canManage, currentUserEmail, onAdd, onDelete, onResetPassword, onEdit, openAddFormSignal = 0 }: AdminsManagementPageProps) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<NewAdminData>(emptyForm());
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (openAddFormSignal > 0 && canManage) {
            setShowForm(true);
            setError('');
        }
    }, [openAddFormSignal, canManage]);

    const sortedAdmins = useMemo(() => {
        return [...admins].sort((a, b) => Number(Boolean(b.isSuperAdmin)) - Number(Boolean(a.isSuperAdmin)));
    }, [admins]);

    const set = (key: keyof NewAdminData, value: string) => setForm((f) => ({ ...f, [key]: value }));

    const handleSubmit = async () => {
        if (!form.name || !form.email || !form.password) {
            setError('Name, email, and password are required.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await onAdd(form);
            setShowForm(false);
            setForm(emptyForm());
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to add admin.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleForm = () => {
        setShowForm((v) => !v);
        setError('');
    };

    return (
        <View>
            {canManage ? (
                <View style={styles.topBar}>
                    <TouchableOpacity style={[styles.addBtn, showForm && styles.addBtnCancel]} onPress={toggleForm}>
                        <Text style={styles.addBtnTxt}>{showForm ? 'Cancel' : '+ Add Admin'}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <Text style={styles.info}>Only Super Admin can add, edit, or delete admin accounts. Admin can manage only users and alumni.</Text>
            )}

            {canManage && showForm ? (
                <View style={styles.form}>
                    <Text style={styles.formTitle}>Create Admin</Text>
                    {error ? <Text style={styles.errorTxt}>{error}</Text> : null}

                    <View style={styles.formRow}>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Name *</Text>
                            <TextInput style={styles.input} value={form.name} onChangeText={(v) => set('name', v)} placeholder="Full name" />
                        </View>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Email *</Text>
                            <TextInput style={styles.input} value={form.email} onChangeText={(v) => set('email', v)} placeholder="admin@example.com" keyboardType="email-address" autoCapitalize="none" />
                        </View>
                    </View>

                    <View style={styles.formRow}>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Password *</Text>
                            <TextInput style={styles.input} value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry placeholder="Password" />
                        </View>
                        <View style={styles.formField} />
                    </View>

                    <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={submitting}>
                        <Text style={styles.submitBtnTxt}>{submitting ? 'Saving...' : 'Save Admin'}</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            <Text style={styles.sectionTitle}>Admin List</Text>

            <View style={styles.table}>
                    <View style={[styles.row, styles.header]}>
                        <Text style={[styles.cell, styles.nameCell]}>Name</Text>
                        <Text style={[styles.cell, styles.emailCell]}>Email</Text>
                        <Text style={[styles.cell, styles.roleCell]}>Access</Text>
                        <Text style={[styles.cell, styles.dateCell]}>Created</Text>
                        <Text style={[styles.cell, styles.actionCell]}>Action</Text>
                    </View>

                    {sortedAdmins.map((u) => {
                        const displayName = ((u.profile?.firstName || '') + ' ' + (u.profile?.lastName || '')).trim() || u.email;
                        const isCurrentUser = String(u.email || '').toLowerCase() === String(currentUserEmail || '').toLowerCase();
                        return (
                            <View key={u.id} style={styles.row}>
                                <Text style={[styles.cell, styles.nameCell]}>{displayName}</Text>
                                <Text style={[styles.cell, styles.emailCell]}>{u.email}</Text>
                                <View style={[styles.cell, styles.roleCell]}>
                                    <Text style={[styles.badge, u.isSuperAdmin ? styles.superBadge : styles.adminBadge]}>
                                        {u.isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}
                                    </Text>
                                </View>
                                <Text style={[styles.cell, styles.dateCell]}>{new Date(u.createdAt).toLocaleDateString()}</Text>
                                <View style={[styles.cell, styles.actionCell]}>
                                    {canManage && !isCurrentUser ? (
                                        <View style={styles.actionBtnRow}>
                                            <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(u)}>
                                                <Text style={styles.editTxt}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.resetBtn} onPress={() => onResetPassword(u.id, displayName)}>
                                                <Text style={styles.resetTxt}>Reset PWD</Text>
                                            </TouchableOpacity>
                                            {u.isSuperAdmin !== true ? (
                                                <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(u.id, displayName)}>
                                                    <Text style={styles.deleteTxt}>Delete</Text>
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                    ) : (
                                        <Text style={styles.lockedTxt}>-</Text>
                                    )}
                                </View>
                            </View>
                        );
                    })}

                    {sortedAdmins.length === 0 ? (
                        <View style={styles.emptyRow}>
                            <Text style={styles.emptyTxt}>No admin accounts found.</Text>
                        </View>
                    ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 12,
    },
    addBtn: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    addBtnCancel: {
        backgroundColor: '#6B7280',
    },
    addBtnTxt: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    info: {
        color: '#6B7280',
        fontSize: 13,
        marginBottom: 10,
        fontWeight: '600',
    },
    form: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 10,
    },
    errorTxt: {
        color: '#EF4444',
        fontSize: 13,
        marginBottom: 12,
        fontWeight: '600',
    },
    formRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 14,
    },
    formField: {
        flex: 1,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#F9FAFB',
    },
    submitBtn: {
        backgroundColor: '#16A34A',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 4,
    },
    submitBtnDisabled: {
        backgroundColor: '#9CA3AF',
    },
    submitBtnTxt: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    table: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        alignItems: 'center',
    },
    header: {
        backgroundColor: '#F3F4F6',
    },
    cell: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        color: '#111827',
        fontWeight: '500',
    },
    nameCell: {
        flex: 2,
    },
    emailCell: {
        flex: 3,
    },
    roleCell: {
        flex: 2,
    },
    dateCell: {
        flex: 2,
    },
    actionCell: {
        flex: 3,
    },
    badge: {
        alignSelf: 'flex-start',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        overflow: 'hidden',
        fontSize: 11,
        fontWeight: '700',
    },
    superBadge: {
        backgroundColor: '#FEE2E2',
        color: '#B91C1C',
    },
    adminBadge: {
        backgroundColor: '#DBEAFE',
        color: '#1D4ED8',
    },
    deleteBtn: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    editBtn: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    editTxt: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
    deleteTxt: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
    resetBtn: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    resetTxt: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 12,
    },
    actionBtnRow: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    lockedTxt: {
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyRow: {
        padding: 24,
        alignItems: 'center',
    },
    emptyTxt: {
        color: '#9CA3AF',
        fontSize: 14,
    },
});
