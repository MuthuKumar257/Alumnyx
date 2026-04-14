import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import axiosClient from '../api/axiosClient';
import { Search, Filter, Download, PlusCircle, Upload, Trash2, Pencil, RotateCcw, Users, Building2, ChevronLeft, ChevronRight, Check, X } from 'lucide-react-native';

interface NewUserData {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    college: string;
    graduationYear: string;
    department: string;
}

interface UsersTableProps {
    users: any[];
    departments: string[];
    onDelete: (id: string, name: string) => void;
    onAdd: (data: NewUserData) => Promise<void>;
    onResetPassword: (id: string, name: string) => void;
    onEdit: (user: any) => void;
    openAddFormSignal?: number;
}

const ROLES = ['STUDENT'];

const emptyForm = (): NewUserData => ({
    firstName: '', lastName: '', email: '', role: 'STUDENT', college: '', graduationYear: '', department: '',
});

export default function UsersTable({ users, departments, onDelete, onAdd, onResetPassword, onEdit, openAddFormSignal = 0 }: UsersTableProps) {
    const [deptFilter, setDeptFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<NewUserData>(emptyForm());
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ message: string; created: number; skipped: number; errors: any[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const deptFilterOptions = ['all', ...departments];
    const PAGE_SIZE = 8;

    const set = (key: keyof NewUserData, value: string) => setForm((f) => ({ ...f, [key]: value }));

    useEffect(() => {
        if (openAddFormSignal > 0) {
            setShowForm(true);
            setError('');
        }
    }, [openAddFormSignal]);

    const handleSubmit = async () => {
        if (!form.firstName || !form.email) {
            setError('First name and email are required.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            await onAdd(form);
            setShowForm(false);
            setForm(emptyForm());
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to add user.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleForm = () => { setShowForm((v) => !v); setError(''); };

    const handleImportXL = () => {
        if (Platform.OS === 'web') {
            if (!fileInputRef.current) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx,.xls';
                input.onchange = async (e: any) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImporting(true);
                    setImportResult(null);
                    try {
                        const fd = new FormData();
                        fd.append('file', file);
                        const res = await axiosClient.post('/admin/users/bulk', fd, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                        });
                        setImportResult(res.data);
                        if ((res.data.created || 0) > 0 && (window as any).__adminReload) (window as any).__adminReload();
                    } catch (e: any) {
                        setImportResult({ message: e?.response?.data?.message || 'Import failed.', created: 0, skipped: 0, errors: [] });
                    } finally {
                        setImporting(false);
                    }
                };
                (fileInputRef as any).current = input;
            }
            (fileInputRef.current as HTMLInputElement).value = '';
            (fileInputRef.current as HTMLInputElement).click();
        }
    };

    const filteredUsers = useMemo(() => {
        const byDept = deptFilter === 'all'
            ? users
            : users.filter((u) => String(u?.profile?.department || '').toLowerCase() === deptFilter);
        if (!search.trim()) return byDept;
        const q = search.trim().toLowerCase();
        return byDept.filter((u) => {
            const fullName = `${u?.profile?.firstName || ''} ${u?.profile?.lastName || ''}`.trim().toLowerCase();
            const email = String(u?.email || '').toLowerCase();
            const college = String(u?.profile?.college || '').toLowerCase();
            return fullName.includes(q) || email.includes(q) || college.includes(q);
        });
    }, [users, deptFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const paginatedUsers = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredUsers.slice(start, start + PAGE_SIZE);
    }, [filteredUsers, page]);

    useEffect(() => {
        setSelectedIds((prev) => prev.filter((id) => paginatedUsers.some((u) => u.id === id)));
    }, [paginatedUsers]);

    const allOnPageSelected = paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedIds.includes(u.id));

    const toggleSelectAll = () => {
        if (allOnPageSelected) {
            setSelectedIds((prev) => prev.filter((id) => !paginatedUsers.some((u) => u.id === id)));
            return;
        }
        const pageIds = paginatedUsers.map((u) => u.id);
        setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const clearFilters = () => {
        setDeptFilter('all');
        setSearch('');
        setPage(1);
    };

    const startCount = filteredUsers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endCount = Math.min(page * PAGE_SIZE, filteredUsers.length);

    return (
        <View>
            <View style={styles.heroCard}>
                <View>
                    <Text style={styles.kicker}>Directory Control</Text>
                    <Text style={styles.title}>Member Directory</Text>
                    <Text style={styles.subtitle}>Manage and audit institutional access for alumni and students.</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.importBtn} onPress={handleImportXL} disabled={importing}>
                        <Upload size={14} color="#735C00" />
                        <Text style={styles.importBtnText}>{importing ? 'Importing...' : 'Import Excel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={toggleForm}>
                        <PlusCircle size={15} color="#FFFFFF" />
                        <Text style={styles.addBtnText}>Add User</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Users size={18} color="#476083" />
                    <Text style={styles.statNumber}>{users.length}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                </View>
                <View style={styles.statCard}>
                    <Building2 size={18} color="#476083" />
                    <Text style={styles.statNumber}>{departments.length}</Text>
                    <Text style={styles.statLabel}>Departments</Text>
                </View>
            </View>

            {importResult ? (
                <View style={[styles.importResult, importResult.created > 0 ? styles.importSuccess : styles.importWarn]}>
                    <Text style={styles.importText}>{importResult.message}</Text>
                    {importResult.errors?.length > 0 && <Text style={styles.importSubtext}>Failed: {importResult.errors.map((e) => e.email).join(', ')}</Text>}
                    <TouchableOpacity onPress={() => setImportResult(null)}><X size={14} color="#64748B" /></TouchableOpacity>
                </View>
            ) : null}

            {showForm && (
                <View style={styles.formCard}>
                    <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>Create New User</Text>
                        <TouchableOpacity onPress={toggleForm}><X size={16} color="#64748B" /></TouchableOpacity>
                    </View>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    <Text style={styles.defaultPasswordNote}>Default password for new users: student@123</Text>
                    <View style={styles.formGrid}>
                        <View style={styles.formField}>
                            <Text style={styles.label}>First Name *</Text>
                            <TextInput style={styles.input} value={form.firstName} onChangeText={(v) => set('firstName', v)} placeholder="Enter first name" />
                        </View>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Last Name</Text>
                            <TextInput style={styles.input} value={form.lastName} onChangeText={(v) => set('lastName', v)} placeholder="Enter last name" />
                        </View>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Email *</Text>
                            <TextInput style={styles.input} value={form.email} onChangeText={(v) => set('email', v)} placeholder="email@example.com" autoCapitalize="none" />
                        </View>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Role</Text>
                            <View style={styles.roleChips}>
                                {ROLES.map((r) => (
                                    <TouchableOpacity key={r} style={[styles.roleChip, form.role === r && styles.roleChipActive]} onPress={() => set('role', r)}>
                                        <Text style={[styles.roleChipText, form.role === r && styles.roleChipTextActive]}>{r}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={styles.formField}>
                            <Text style={styles.label}>College</Text>
                            <TextInput style={styles.input} value={form.college} onChangeText={(v) => set('college', v)} placeholder="College name" />
                        </View>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Graduation Year</Text>
                            <TextInput style={styles.input} value={form.graduationYear} onChangeText={(v) => set('graduationYear', v)} placeholder="2024" keyboardType="numeric" />
                        </View>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Department</Text>
                            <select value={form.department} onChange={(e) => set('department', (e.target as HTMLSelectElement).value)} style={styles.select}>
                                <option value="">Select Department</option>
                                {departments.map((d) => (<option key={d} value={d}>{d.toUpperCase()}</option>))}
                            </select>
                        </View>
                    </View>
                    <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitDisabled]} onPress={handleSubmit} disabled={submitting}>
                        <Text style={styles.submitText}>{submitting ? 'Adding...' : 'Add User'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.controlsBar}>
                <View style={styles.searchWrap}>
                    <Search size={15} color="#43474E" />
                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search users by name, email or college"
                        placeholderTextColor="#74777F"
                    />
                </View>
                <View style={styles.filterGroup}>
                    <View style={styles.filterIconWrap}>
                        <Filter size={14} color="#43474E" />
                        <Text style={styles.filterLabel}>Department</Text>
                    </View>
                    <select value={deptFilter} onChange={(e) => setDeptFilter((e.target as HTMLSelectElement).value)} style={styles.filterSelect}>
                        {deptFilterOptions.map((d) => (<option key={d} value={d}>{d === 'all' ? 'All Departments' : d.toUpperCase()}</option>))}
                    </select>
                    <TouchableOpacity style={styles.lightBtn} onPress={clearFilters}>
                        <Text style={styles.lightBtnText}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.lightBtn}>
                        <Download size={14} color="#43474E" />
                        <Text style={styles.lightBtnText}>Export</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.tableCard}>
                <View style={styles.bulkBar}>
                    <TouchableOpacity style={styles.bulkSelect} onPress={toggleSelectAll}>
                        <View style={[styles.checkbox, allOnPageSelected && styles.checkboxSelected]}>
                            {allOnPageSelected ? <Check size={11} color="#FFFFFF" /> : null}
                        </View>
                        <Text style={styles.bulkLabel}>Select All On Page</Text>
                    </TouchableOpacity>
                    <View style={styles.bulkRight}>
                        <Text style={styles.bulkCount}>{selectedIds.length} selected</Text>
                        <TouchableOpacity style={[styles.bulkDeleteBtn, selectedIds.length === 0 && styles.bulkDeleteDisabled]} disabled={selectedIds.length === 0}>
                            <Trash2 size={14} color={selectedIds.length === 0 ? '#A8A29E' : '#BA1A1A'} />
                            <Text style={[styles.bulkDeleteText, selectedIds.length === 0 && styles.bulkDeleteTextDisabled]}>Bulk Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 0.6 }]}></Text>
                    <Text style={[styles.th, { flex: 2 }]}>Name</Text>
                    <Text style={[styles.th, { flex: 2 }]}>Email</Text>
                    <Text style={styles.th}>Role</Text>
                    <Text style={styles.th}>Joined</Text>
                    <Text style={styles.th}>Department</Text>
                    <Text style={[styles.th, { flex: 2 }]}>College</Text>
                    <Text style={[styles.th, { flex: 2 }]}>Actions</Text>
                </View>
                <ScrollView style={styles.tableBody}>
                    {paginatedUsers.map((u, idx) => (
                        <View key={u.id} style={[styles.tableRow, idx % 2 === 1 && styles.rowAlt]}>
                            <View style={styles.colCheck}>
                                <TouchableOpacity onPress={() => toggleSelectOne(u.id)}>
                                    <View style={[styles.checkbox, selectedIds.includes(u.id) && styles.checkboxSelected]}>
                                        {selectedIds.includes(u.id) ? <Check size={11} color="#FFFFFF" /> : null}
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.colName}>
                                <Text style={styles.nameText}>{u.profile?.firstName} {u.profile?.lastName}</Text>
                            </View>
                            <View style={styles.colEmail}>
                                <Text style={styles.emailText} numberOfLines={1}>{u.email}</Text>
                            </View>
                            <View style={styles.colRole}>
                                <View style={styles.roleBadge}><Text style={styles.roleText}>{u.role}</Text></View>
                            </View>
                            <View style={styles.colJoined}>
                                <Text style={styles.joinedText} numberOfLines={1}>{u.createdAt ? String(u.createdAt).slice(0, 10) : '-'}</Text>
                            </View>
                            <View style={styles.colDepartment}>
                                <Text style={styles.departmentText} numberOfLines={1}>{u.profile?.department?.toUpperCase() || '-'}</Text>
                            </View>
                            <View style={styles.colCollege}>
                                <Text style={styles.collegeText} numberOfLines={1}>{u.profile?.college || '-'}</Text>
                            </View>
                            <View style={styles.colActions}>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(u)}>
                                    <Pencil size={13} color="#001F3F" />
                                    <Text style={styles.actionEdit}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtn, styles.actionReset]} onPress={() => onResetPassword(u.id, u.profile?.firstName || u.email)}>
                                    <RotateCcw size={13} color="#8A5A00" />
                                    <Text style={styles.actionResetText}>Reset</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtn, styles.actionDelete]} onPress={() => onDelete(u.id, u.profile?.firstName || u.email)}>
                                    <Trash2 size={13} color="#BA1A1A" />
                                    <Text style={styles.actionDeleteText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    {paginatedUsers.length === 0 && (
                        <View style={styles.emptyState}>
                            <Users size={32} color="#94A3B8" />
                            <Text style={styles.emptyText}>No users found.</Text>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.paginationBar}>
                    <Text style={styles.paginationSummary}>Showing {startCount} to {endCount} of {filteredUsers.length} users</Text>
                    <View style={styles.paginationBtns}>
                        <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} disabled={page === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
                            <ChevronLeft size={14} color={page === 1 ? '#A8A29E' : '#181C1E'} />
                        </TouchableOpacity>
                        <View style={styles.pagePill}><Text style={styles.pagePillText}>{page}</Text></View>
                        <Text style={styles.pageSlash}>/</Text>
                        <Text style={styles.pageTotal}>{totalPages}</Text>
                        <TouchableOpacity style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]} disabled={page === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>
                            <ChevronRight size={14} color={page === totalPages ? '#A8A29E' : '#181C1E'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    heroCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderRadius: 14,
        backgroundColor: '#001F3F',
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    kicker: {
        color: '#AFBFD7',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    title: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { color: '#C8D5E6', fontSize: 13, fontWeight: '500', marginTop: 4, maxWidth: 520 },
    headerActions: { flexDirection: 'row', gap: 10 },
    importBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFE088',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E7C35A',
    },
    importBtnText: { color: '#735C00', fontWeight: '800', fontSize: 12 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0E2D54', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#4E6685' },
    addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
    statsRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    statCard: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#F1F4F6', alignItems: 'center', borderWidth: 1, borderColor: '#E0E3E5', gap: 4 },
    statNumber: { fontSize: 26, fontWeight: '800', color: '#001F3F' },
    statLabel: { color: '#43474E', fontSize: 12, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
    importResult: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 16, gap: 10 },
    importSuccess: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
    importWarn: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
    importText: { flex: 1, fontWeight: '600', fontSize: 13 },
    importSubtext: { fontSize: 12, color: '#92400E' },
    importDismiss: { color: '#64748B', fontWeight: '700' },
    formCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    formTitle: { color: '#0F172A', fontSize: 20, fontWeight: '700' },
    formClose: { color: '#64748B', fontSize: 18, fontWeight: '700' },
    errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600', marginBottom: 12 },
    defaultPasswordNote: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
    formField: { width: '48%' },
    label: { color: '#475569', fontSize: 12, fontWeight: '600', marginBottom: 6 },
    input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: '#F8FAFC' },
    roleChips: { flexDirection: 'row', gap: 8 },
    roleChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    roleChipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    roleChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    roleChipTextActive: { color: '#FFFFFF' },
    select: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: '#F8FAFC', width: '100%' } as any,
    submitBtn: { backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    submitDisabled: { backgroundColor: '#94A3B8' },
    submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    controlsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F1F4F6',
        borderWidth: 1,
        borderColor: '#E0E3E5',
        borderRadius: 10,
        paddingHorizontal: 12,
        minWidth: 320,
        flex: 1,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        color: '#181C1E',
        fontSize: 13,
        fontWeight: '500',
    },
    filterGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    filterIconWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    filterLabel: { color: '#43474E', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    filterSelect: { borderWidth: 1, borderColor: '#C4C6CF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, backgroundColor: '#FFFFFF', color: '#181C1E' } as any,
    lightBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderColor: '#C4C6CF',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    lightBtnText: { color: '#43474E', fontSize: 12, fontWeight: '700' },
    tableCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E0E3E5', overflow: 'hidden' },
    bulkBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#F1F4F6',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E3E5',
        gap: 8,
    },
    bulkSelect: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bulkLabel: { color: '#43474E', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    bulkRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bulkCount: { color: '#74777F', fontSize: 12, fontWeight: '600' },
    bulkDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FFDAD6' },
    bulkDeleteDisabled: { backgroundColor: '#F5F5F4' },
    bulkDeleteText: { color: '#BA1A1A', fontSize: 12, fontWeight: '700' },
    bulkDeleteTextDisabled: { color: '#A8A29E' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E0E3E5', alignItems: 'center' },
    th: { flex: 1, color: '#64748B', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    tableBody: { maxHeight: 500 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F4F6' },
    rowAlt: { backgroundColor: '#FCFCFD' },
    colCheck: { flex: 0.6, alignItems: 'flex-start', paddingRight: 8 },
    colName: { flex: 2, paddingRight: 10 },
    colEmail: { flex: 2, paddingRight: 10 },
    colRole: { flex: 1, alignItems: 'flex-start', paddingRight: 10 },
    colJoined: { flex: 1, paddingRight: 10 },
    colDepartment: { flex: 1, paddingRight: 10 },
    colCollege: { flex: 2, paddingRight: 10 },
    colActions: { flex: 2, flexDirection: 'row', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' },
    checkbox: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#74777F',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#476083',
        borderColor: '#476083',
    },
    nameText: { color: '#181C1E', fontWeight: '700', fontSize: 13 },
    emailText: { color: '#475569', fontSize: 13 },
    joinedText: { color: '#74777F', fontSize: 12, fontStyle: 'italic' },
    departmentText: { color: '#43474E', fontSize: 12, fontWeight: '600' },
    collegeText: { color: '#43474E', fontSize: 12 },
    roleBadge: { backgroundColor: '#D4E3FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    roleText: { color: '#001C3A', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F4F6' },
    actionEdit: { color: '#001F3F', fontWeight: '700', fontSize: 11 },
    actionReset: { backgroundColor: '#FFEFC0' },
    actionResetText: { color: '#8A5A00', fontWeight: '700', fontSize: 11 },
    actionDelete: { backgroundColor: '#FFDAD6' },
    actionDeleteText: { color: '#BA1A1A', fontWeight: '700', fontSize: 11 },
    emptyState: { padding: 48, alignItems: 'center' },
    emptyText: { color: '#74777F', fontSize: 14, marginTop: 10 },
    paginationBar: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#F1F4F6',
        borderTopWidth: 1,
        borderTopColor: '#E0E3E5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    paginationSummary: {
        color: '#43474E',
        fontSize: 12,
        fontWeight: '600',
    },
    paginationBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pageBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#C4C6CF',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    pageBtnDisabled: {
        backgroundColor: '#F5F5F4',
        borderColor: '#E7E5E4',
    },
    pagePill: {
        minWidth: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#FED65B',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    pagePillText: { color: '#241A00', fontWeight: '800', fontSize: 12 },
    pageSlash: { color: '#74777F', fontWeight: '700' },
    pageTotal: { color: '#43474E', fontWeight: '700', fontSize: 12 },
});
