import React, { useEffect, useMemo, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { CheckCircle2, XCircle, Download, Filter, Search, Upload, PlusCircle, GraduationCap, Building2, Clock3, ShieldCheck, ChevronRight, FileText, MoreHorizontal } from 'lucide-react-native';

interface NewAlumniData {
    name: string;
    email: string;
    password: string;
    college: string;
    graduationYear: string;
    department: string;
}

interface AlumniManagementPageProps {
    alumni: any[];
    pendingAlumni: any[];
    departments: string[];
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
    onBulkApprove: (ids: string[]) => Promise<void>;
    onBulkReject: (ids: string[]) => Promise<void>;
    onAdd: (data: NewAlumniData) => Promise<void>;
    onDelete: (id: string, name: string) => void;
    onResetPassword: (id: string, name: string) => void;
    onEdit: (user: any) => void;
    openAddFormSignal?: number;
}

const emptyForm = (): NewAlumniData => ({
    name: '',
    email: '',
    password: '',
    college: '',
    graduationYear: '',
    department: '',
});

const DEPT_COLORS: Record<string, string> = {
    cse: '#EEF2FF', it: '#E0E7FF', ece: '#FCE7F3', eee: '#FEF3C7',
    mech: '#ECFDF5', aids: '#F3E8FF', csbs: '#FFEDD5',
};
const DEPT_TEXT: Record<string, string> = {
    cse: '#4F46E5', it: '#4338CA', ece: '#DB2777', eee: '#D97706',
    mech: '#059669', aids: '#7C3AED', csbs: '#EA580C',
};

export default function AlumniManagementPage({ alumni, pendingAlumni, departments, onApprove, onReject, onBulkApprove, onBulkReject, onAdd, onDelete, onResetPassword, onEdit, openAddFormSignal = 0 }: AlumniManagementPageProps) {
    const [deptFilter, setDeptFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<NewAlumniData>(emptyForm());
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ message: string; created: number; skipped: number; errors: any[] } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
    const deptFilterOptions = ['all', ...departments];

    useEffect(() => {
        if (openAddFormSignal > 0) {
            setShowForm(true);
            setError('');
        }
    }, [openAddFormSignal]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const currentList = activeTab === 'pending' ? filteredPending : filteredAlumni;
        if (selectedIds.size === currentList.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(currentList.map((u) => u.id)));
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.size === 0) return;
        setBulkLoading(true);
        try {
            await onBulkApprove(Array.from(selectedIds));
            setSelectedIds(new Set());
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkReject = async () => {
        if (selectedIds.size === 0) return;
        setBulkLoading(true);
        try {
            await onBulkReject(Array.from(selectedIds));
            setSelectedIds(new Set());
        } finally {
            setBulkLoading(false);
        }
    };

    const set = (key: keyof NewAlumniData, value: string) => setForm((f) => ({ ...f, [key]: value }));

    const handleSubmit = async () => {
        if (!form.name || !form.email || !form.password || !form.college || !form.graduationYear || !form.department) {
            setError('All fields are required.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            await onAdd(form);
            setShowForm(false);
            setForm(emptyForm());
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to add alumni.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleImportXL = () => {
        if (typeof window === 'undefined') return;
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
                const res = await axiosClient.post('/admin/alumni/bulk', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                setImportResult(res.data);
                if ((res.data.created || 0) > 0 && (window as any).__adminReload) {
                    (window as any).__adminReload();
                }
            } catch (e: any) {
                setImportResult({ message: e?.response?.data?.message || 'Import failed.', created: 0, skipped: 0, errors: [] });
            } finally {
                setImporting(false);
            }
        };
        input.click();
    };

    const applyFilters = (list: any[]) => {
        let out = list;
        if (deptFilter !== 'all') out = out.filter((u) => String(u?.profile?.department || '').toLowerCase() === deptFilter);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            out = out.filter((u) =>
                ((u.profile?.firstName || '') + ' ' + (u.profile?.lastName || '')).toLowerCase().includes(q) ||
                String(u.email || '').toLowerCase().includes(q)
            );
        }
        return out;
    };

    const filteredPending = useMemo(() => applyFilters(pendingAlumni), [pendingAlumni, deptFilter, search]);
    const filteredAlumni = useMemo(() => applyFilters(alumni), [alumni, deptFilter, search]);

    const deptBadge = (dept: string) => {
        if (!dept || dept === '-') return null;
        const key = dept.toLowerCase();
        return (
            <View style={[styles.deptBadge, { backgroundColor: DEPT_COLORS[key] || '#F1F5F9' }]}>
                <Text style={[styles.deptBadgeText, { color: DEPT_TEXT[key] || '#64748B' }]}>{dept.toUpperCase()}</Text>
            </View>
        );
    };

    const currentList = activeTab === 'pending' ? filteredPending : filteredAlumni;
    const spotlight = filteredPending[0] || null;

    return (
        <View style={styles.container}>
            <View style={styles.hero}>
                <View>
                    <Text style={styles.kicker}>Verification Desk</Text>
                    <Text style={styles.title}>Pending Requests</Text>
                    <Text style={styles.subtitle}>Review and verify identity submissions to maintain the alumni network integrity.</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.filterBtn}>
                        <Filter size={14} color="#43474E" />
                        <Text style={styles.filterBtnText}>Filter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.exportBtn}>
                        <Download size={14} color="#FFFFFF" />
                        <Text style={styles.exportBtnText}>Export Log</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.importBtn} onPress={handleImportXL} disabled={importing}>
                        <Upload size={14} color="#735C00" />
                        <Text style={styles.importBtnText}>{importing ? 'Importing...' : 'Import Excel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
                        <PlusCircle size={14} color="#FFFFFF" />
                        <Text style={styles.addBtnText}>Add Alumni</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.statsBar}>
                <View style={[styles.statCard, styles.statPending]}>
                    <Clock3 size={16} color="#8A5A00" />
                    <Text style={[styles.statNumber, { color: '#8A5A00' }]}>{pendingAlumni.length}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={[styles.statCard, styles.statApproved]}>
                    <ShieldCheck size={16} color="#156B4D" />
                    <Text style={[styles.statNumber, { color: '#156B4D' }]}>{alumni.length}</Text>
                    <Text style={styles.statLabel}>Approved</Text>
                </View>
                <View style={[styles.statCard, styles.statDepts]}>
                    <Building2 size={16} color="#2F486A" />
                    <Text style={[styles.statNumber, { color: '#2F486A' }]}>{departments.length}</Text>
                    <Text style={styles.statLabel}>Departments</Text>
                </View>
                <View style={[styles.statCard, styles.statQueue]}>
                    <GraduationCap size={16} color="#001F3F" />
                    <Text style={[styles.statNumber, { color: '#001F3F' }]}>{pendingAlumni.length + alumni.length}</Text>
                    <Text style={styles.statLabel}>Total Alumni</Text>
                </View>
            </View>

            {importResult ? (
                <View style={[styles.importResult, importResult.created > 0 ? styles.importSuccess : styles.importWarn]}>
                    <Text style={styles.importText}>{importResult.message}</Text>
                    {importResult.errors?.length > 0 ? <Text style={styles.importSubtext}>Failed: {importResult.errors.map((e) => e.email).join(', ')}</Text> : null}
                    <TouchableOpacity onPress={() => setImportResult(null)}><Text style={styles.importDismiss}>X</Text></TouchableOpacity>
                </View>
            ) : null}

            {showForm && (
                <View style={styles.formCard}>
                    <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>Add New Alumni</Text>
                        <TouchableOpacity onPress={() => setShowForm(false)}>
                            <Text style={styles.formClose}>X</Text>
                        </TouchableOpacity>
                    </View>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    <View style={styles.formGrid}>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Full Name *</Text>
                            <TextInput style={styles.input} value={form.name} onChangeText={(v) => set('name', v)} placeholder="Enter full name" />
                        </View>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Email *</Text>
                            <TextInput style={styles.input} value={form.email} onChangeText={(v) => set('email', v)} placeholder="email@example.com" autoCapitalize="none" />
                        </View>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Password *</Text>
                            <TextInput style={styles.input} value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry placeholder="Enter password" />
                        </View>
                        <View style={styles.formField}>
                            <Text style={styles.label}>College *</Text>
                            <TextInput style={styles.input} value={form.college} onChangeText={(v) => set('college', v)} placeholder="College name" />
                        </View>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Graduation Year *</Text>
                            <TextInput style={styles.input} value={form.graduationYear} onChangeText={(v) => set('graduationYear', v)} placeholder="2024" keyboardType="numeric" />
                        </View>
                        <View style={styles.formField}>
                            <Text style={styles.label}>Department *</Text>
                            <View style={styles.deptChips}>
                                {departments.map((d) => (
                                    <TouchableOpacity key={d} style={[styles.deptChip, form.department === d && styles.deptChipActive]} onPress={() => set('department', d)}>
                                        <Text style={[styles.deptChipText, form.department === d && styles.deptChipTextActive]}>{d.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitDisabled]} onPress={handleSubmit} disabled={submitting}>
                        <Text style={styles.submitText}>{submitting ? 'Saving...' : 'Save Alumni'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.controlsBar}>
                <View style={styles.searchBox}>
                    <Search size={15} color="#43474E" />
                    <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search by name or email..." />
                </View>
                <View style={styles.filterBox}>
                    <Text style={styles.filterLabel}>Department:</Text>
                    <select value={deptFilter} onChange={(e) => setDeptFilter((e.target as HTMLSelectElement).value)} style={styles.filterSelect}>
                        {deptFilterOptions.map((d) => (
                            <option key={d} value={d}>{d === 'all' ? 'All Departments' : d.toUpperCase()}</option>
                        ))}
                    </select>
                </View>
            </View>

            {spotlight && activeTab === 'pending' ? (
                <View style={styles.spotlightWrap}>
                    <View style={styles.spotlightMain}>
                        <View style={styles.spotlightHeader}>
                            <View>
                                <Text style={styles.spotlightName}>{spotlight.profile?.firstName} {spotlight.profile?.lastName}</Text>
                                <Text style={styles.spotlightMeta}>{spotlight.email}</Text>
                            </View>
                            <View style={styles.pendingChip}><Text style={styles.pendingChipText}>Pending</Text></View>
                        </View>

                        <View style={styles.detailsGrid}>
                            <View style={styles.detailCard}>
                                <Text style={styles.detailLabel}>College</Text>
                                <Text style={styles.detailValue}>{spotlight.profile?.college || '-'}</Text>
                            </View>
                            <View style={styles.detailCard}>
                                <Text style={styles.detailLabel}>Graduation Year</Text>
                                <Text style={styles.detailValue}>{spotlight.profile?.graduationYear || '-'}</Text>
                            </View>
                            <View style={styles.detailCard}>
                                <Text style={styles.detailLabel}>Department</Text>
                                <Text style={styles.detailValue}>{spotlight.profile?.department?.toUpperCase() || '-'}</Text>
                            </View>
                            <View style={styles.detailCard}>
                                <Text style={styles.detailLabel}>Verification Queue</Text>
                                <Text style={styles.detailValue}>#{filteredPending.findIndex((u) => u.id === spotlight.id) + 1}</Text>
                            </View>
                        </View>

                        <View style={styles.spotlightActions}>
                            <TouchableOpacity style={styles.approvePrimary} onPress={() => onApprove(spotlight.id)}>
                                <CheckCircle2 size={15} color="#241A00" />
                                <Text style={styles.approvePrimaryText}>Approve Request</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.rejectPrimary} onPress={() => onReject(spotlight.id)}>
                                <XCircle size={15} color="#BA1A1A" />
                                <Text style={styles.rejectPrimaryText}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.moreBtn}>
                                <MoreHorizontal size={15} color="#43474E" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.queueCard}>
                        <View style={styles.queueHeader}>
                            <Text style={styles.queueTitle}>Next In Queue</Text>
                            <Text style={styles.queueCount}>{Math.max(filteredPending.length - 1, 0)} remaining</Text>
                        </View>
                        {filteredPending.slice(1, 5).map((u) => (
                            <TouchableOpacity key={u.id} style={styles.queueItem} onPress={() => onEdit(u)}>
                                <View style={styles.queueAvatar}><Text style={styles.queueAvatarText}>{String(u.profile?.firstName || u.email || '?').charAt(0).toUpperCase()}</Text></View>
                                <View style={styles.queueBody}>
                                    <Text style={styles.queueName}>{u.profile?.firstName} {u.profile?.lastName}</Text>
                                    <Text style={styles.queueMeta}>{u.profile?.graduationYear || '-'} • {u.profile?.department?.toUpperCase() || '-'}</Text>
                                </View>
                                <ChevronRight size={14} color="#94A3B8" />
                            </TouchableOpacity>
                        ))}
                        {filteredPending.length <= 1 ? (
                            <View style={styles.queueEmpty}><Text style={styles.queueEmptyText}>No additional pending records.</Text></View>
                        ) : null}
                    </View>
                </View>
            ) : null}

            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.tabActive]} onPress={() => setActiveTab('pending')}>
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>Pending Approvals</Text>
                    {pendingAlumni.length > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{pendingAlumni.length}</Text></View>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'approved' && styles.tabActive]} onPress={() => setActiveTab('approved')}>
                    <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>Approved Alumni</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'pending' && filteredPending.length > 0 && (
                <View style={styles.bulkBar}>
                    <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll}>
                        <Text style={styles.selectAllText}>{selectedIds.size === filteredPending.length ? 'Deselect All' : 'Select All'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.selectedText}>{selectedIds.size} selected</Text>
                    <TouchableOpacity style={[styles.bulkBtn, styles.bulkApprove, (selectedIds.size === 0 || bulkLoading) && styles.bulkDisabled]} onPress={handleBulkApprove} disabled={selectedIds.size === 0 || bulkLoading}>
                        <Text style={styles.bulkBtnText}>{bulkLoading ? 'Processing...' : `Approve (${selectedIds.size})`}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.bulkBtn, styles.bulkReject, (selectedIds.size === 0 || bulkLoading) && styles.bulkDisabled]} onPress={handleBulkReject} disabled={selectedIds.size === 0 || bulkLoading}>
                        <Text style={styles.bulkBtnText}>{bulkLoading ? 'Processing...' : `Reject (${selectedIds.size})`}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                    {activeTab === 'pending' && <View style={styles.checkboxCell} />}
                    <Text style={styles.th}>Name</Text>
                    <Text style={styles.th}>Email</Text>
                    <Text style={styles.th}>College</Text>
                    <Text style={styles.th}>Year</Text>
                    <Text style={styles.th}>Department</Text>
                    <Text style={[styles.th, styles.thActions]}>Actions</Text>
                </View>
                <ScrollView style={styles.tableBody}>
                    {currentList.map((u, idx) => (
                        <View key={u.id} style={[styles.tableRow, idx % 2 === 1 && styles.rowAlt, selectedIds.has(u.id) && styles.rowSelected]}>
                            {activeTab === 'pending' && (
                                <TouchableOpacity style={styles.checkboxCell} onPress={() => toggleSelect(u.id)}>
                                    <View style={[styles.checkbox, selectedIds.has(u.id) && styles.checkboxChecked]}>
                                        {selectedIds.has(u.id) ? <Text style={styles.checkmark}>OK</Text> : null}
                                    </View>
                                </TouchableOpacity>
                            )}
                            <View style={styles.tdName}>
                                <Text style={styles.nameText}>{u.profile?.firstName} {u.profile?.lastName}</Text>
                            </View>
                            <Text style={styles.td}>{u.email}</Text>
                            <Text style={styles.td}>{u.profile?.college || '-'}</Text>
                            <Text style={styles.td}>{u.profile?.graduationYear || '-'}</Text>
                            <View style={styles.td}>{deptBadge(u.profile?.department)}</View>
                            <View style={[styles.td, styles.tdActions]}>
                                <View style={styles.actionBtns}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(u)}>
                                        <Text style={styles.actionEdit}>Edit</Text>
                                    </TouchableOpacity>
                                    {activeTab === 'pending' ? (
                                        <>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionApprove]} onPress={() => onApprove(u.id)}>
                                                <CheckCircle2 size={13} color="#156B4D" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionReject]} onPress={() => onReject(u.id)}>
                                                <XCircle size={13} color="#BA1A1A" />
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionReset]} onPress={() => onResetPassword(u.id, u.profile?.firstName || u.email)}>
                                                <Text style={styles.actionResetText}>Reset</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionBtn, styles.actionDelete]} onPress={() => onDelete(u.id, u.profile?.firstName || u.email)}>
                                                <Text style={styles.actionDeleteText}>Delete</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </View>
                        </View>
                    ))}
                    {currentList.length === 0 && (
                        <View style={styles.emptyState}>
                            <FileText size={32} color="#94A3B8" />
                            <Text style={styles.emptyText}>
                                {activeTab === 'pending' ? 'No pending alumni approvals.' : 'No approved alumni found.'}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    hero: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 10,
    },
    kicker: {
        color: '#6F88AD',
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    title: { color: '#001F3F', fontSize: 30, fontWeight: '900', letterSpacing: -0.6 },
    subtitle: { color: '#43474E', fontSize: 13, fontWeight: '500', marginTop: 4, maxWidth: 780 },
    headerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F4F6', borderWidth: 1, borderColor: '#E0E3E5', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
    filterBtnText: { color: '#43474E', fontWeight: '700', fontSize: 12 },
    exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#001F3F', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
    exportBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
    importBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFE088', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: '#E9C349' },
    importBtnText: { color: '#735C00', fontWeight: '800', fontSize: 12 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#476083', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
    addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
    statsBar: { flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
    statCard: { flex: 1, minWidth: 160, padding: 14, borderRadius: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E0E3E5' },
    statPending: { backgroundColor: '#FFF6DE' },
    statApproved: { backgroundColor: '#EAF7EF' },
    statDepts: { backgroundColor: '#EAF0F6' },
    statQueue: { backgroundColor: '#F1F4F6' },
    statNumber: { fontSize: 24, fontWeight: '900' },
    statLabel: { color: '#43474E', fontSize: 11, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
    importResult: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 16, gap: 10 },
    importSuccess: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
    importWarn: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
    importText: { flex: 1, fontWeight: '600', fontSize: 13 },
    importSubtext: { fontSize: 12, color: '#92400E' },
    importDismiss: { color: '#64748B', fontWeight: '700' },
    formCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    formTitle: { color: '#0F172A', fontSize: 18, fontWeight: '700' },
    formClose: { color: '#64748B', fontSize: 18, fontWeight: '700' },
    errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600', marginBottom: 12 },
    formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 },
    formField: { width: '48%' },
    label: { color: '#475569', fontSize: 12, fontWeight: '600', marginBottom: 6 },
    input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: '#F8FAFC' },
    deptChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    deptChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    deptChipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    deptChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
    deptChipTextActive: { color: '#FFFFFF' },
    submitBtn: { backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    submitDisabled: { backgroundColor: '#94A3B8' },
    submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    controlsBar: { flexDirection: 'row', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12 },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 } as any,
    filterBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    filterLabel: { color: '#64748B', fontSize: 13, fontWeight: '600' },
    filterSelect: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, backgroundColor: '#FFFFFF' } as any,
    spotlightWrap: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        alignItems: 'stretch',
        flexWrap: 'wrap',
    },
    spotlightMain: {
        flex: 2,
        minWidth: 500,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E3E5',
        borderRadius: 14,
        padding: 14,
    },
    spotlightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    spotlightName: { color: '#001F3F', fontSize: 20, fontWeight: '800' },
    spotlightMeta: { color: '#74777F', fontSize: 12, marginTop: 2 },
    pendingChip: { backgroundColor: '#FFE088', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    pendingChipText: { color: '#241A00', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    detailsGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    detailCard: { flex: 1, minWidth: 180, backgroundColor: '#F1F4F6', borderRadius: 10, borderWidth: 1, borderColor: '#E0E3E5', padding: 10 },
    detailLabel: { color: '#74777F', fontSize: 10, textTransform: 'uppercase', fontWeight: '700' },
    detailValue: { color: '#181C1E', fontSize: 13, fontWeight: '700', marginTop: 4 },
    spotlightActions: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' },
    approvePrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FED65B', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    approvePrimaryText: { color: '#241A00', fontWeight: '800', fontSize: 12 },
    rejectPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFDAD6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
    rejectPrimaryText: { color: '#BA1A1A', fontWeight: '800', fontSize: 12 },
    moreBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#E0E3E5', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
    queueCard: {
        flex: 1,
        minWidth: 280,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E3E5',
        borderRadius: 14,
        padding: 12,
    },
    queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    queueTitle: { color: '#001F3F', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
    queueCount: { color: '#735C00', fontSize: 11, fontWeight: '700' },
    queueItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F4F6' },
    queueAvatar: { width: 30, height: 30, borderRadius: 999, backgroundColor: '#D4E3FF', alignItems: 'center', justifyContent: 'center' },
    queueAvatarText: { color: '#001C3A', fontWeight: '800', fontSize: 12 },
    queueBody: { flex: 1 },
    queueName: { color: '#001F3F', fontSize: 12, fontWeight: '700' },
    queueMeta: { color: '#74777F', fontSize: 10, marginTop: 2 },
    queueEmpty: { paddingVertical: 12, alignItems: 'center' },
    queueEmptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
    tabs: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9' },
    tabActive: { backgroundColor: '#001F3F' },
    tabText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
    tabTextActive: { color: '#FFFFFF' },
    tabBadge: { backgroundColor: '#FED65B', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
    tabBadgeText: { color: '#241A00', fontSize: 11, fontWeight: '800' },
    bulkBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#F1F4F6', borderRadius: 10, marginBottom: 16, flexWrap: 'wrap', borderWidth: 1, borderColor: '#E0E3E5' },
    selectAllBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C4C6CF', borderRadius: 8 },
    selectAllText: { color: '#43474E', fontWeight: '700', fontSize: 12 },
    selectedText: { color: '#43474E', fontWeight: '600', fontSize: 13, marginRight: 'auto' },
    bulkBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    bulkApprove: { backgroundColor: '#156B4D' },
    bulkReject: { backgroundColor: '#BA1A1A' },
    bulkDisabled: { backgroundColor: '#94A3B8' },
    bulkBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
    tableCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: '#E2E8F0' },
    th: { flex: 2, color: '#64748B', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    thActions: { flex: 3, textAlign: 'right' },
    tableBody: { maxHeight: 500 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    rowAlt: { backgroundColor: '#FCFCFD' },
    rowSelected: { backgroundColor: '#EAF0F6' },
    checkboxCell: { width: 44, alignItems: 'center', justifyContent: 'center' },
    checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#C4C6CF', borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
    checkboxChecked: { backgroundColor: '#001F3F', borderColor: '#001F3F' },
    checkmark: { color: '#FFFFFF', fontWeight: '700', fontSize: 9 },
    tdName: { flex: 2 },
    nameText: { color: '#0F172A', fontWeight: '600', fontSize: 13 },
    td: { flex: 2, color: '#475569', fontSize: 13 },
    tdActions: { flex: 3, alignItems: 'flex-end' },
    deptBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    deptBadgeText: { fontSize: 11, fontWeight: '700' },
    actionBtns: { flexDirection: 'row', gap: 6 },
    actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9' },
    actionEdit: { color: '#3B82F6', fontWeight: '700', fontSize: 11 },
    actionApprove: { backgroundColor: '#EAF7EF' },
    actionApproveText: { color: '#156B4D', fontWeight: '700', fontSize: 12 },
    actionReject: { backgroundColor: '#FFDAD6' },
    actionRejectText: { color: '#BA1A1A', fontWeight: '700', fontSize: 12 },
    actionReset: { backgroundColor: '#FEF3C7' },
    actionResetText: { color: '#D97706', fontWeight: '700', fontSize: 11 },
    actionDelete: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
    actionDeleteText: { color: '#EF4444', fontWeight: '700', fontSize: 11 },
    emptyState: { padding: 48, alignItems: 'center' },
    emptyText: { color: '#94A3B8', fontSize: 14, marginTop: 12 },
});
