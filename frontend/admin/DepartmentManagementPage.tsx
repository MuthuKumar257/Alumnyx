import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, Alert, ScrollView } from 'react-native';
import { getDepartmentAdmins, assignDepartmentAdmin, deleteDepartment, getUniversityConfig, updateUniversityConfig } from './api/departmentAdminClient';
import { Building2, Filter, PlusCircle, Trash2, ShieldCheck, GraduationCap, Landmark, ArrowRight, Search, Sparkles, Microscope, Palette, Scale } from 'lucide-react-native';

interface DepartmentManagementPageProps {
    departments: string[];
    canAddDepartment: boolean;
    onAddDepartment: (name: string) => Promise<void>;
    onDeleteDepartment: (name: string) => Promise<void>;
    admins: any[];
}

const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
    cse: { bg: '#EEF3FA', text: '#001F3F' },
    it: { bg: '#EAF2FF', text: '#1F4F8A' },
    ece: { bg: '#F4EFFC', text: '#62438F' },
    eee: { bg: '#FFF6DE', text: '#735C00' },
    mech: { bg: '#E9F6F2', text: '#0E6B58' },
    aids: { bg: '#EAF0FF', text: '#2E476F' },
    csbs: { bg: '#F4F0E7', text: '#6C4D00' },
};

const DEPT_GROUPS: Record<string, string> = {
    cse: 'Engineering & Tech',
    it: 'Engineering & Tech',
    ece: 'Engineering & Tech',
    eee: 'Engineering & Tech',
    mech: 'Engineering & Tech',
    aids: 'Data & AI Studies',
    csbs: 'Business & Systems',
};

export default function DepartmentManagementPage({ departments, canAddDepartment, onAddDepartment, onDeleteDepartment, admins }: DepartmentManagementPageProps) {
    const [name, setName] = useState('');
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deptAdmins, setDeptAdmins] = useState<{ [key: string]: string | null }>({});
    const [assigning, setAssigning] = useState<string | null>(null);
    const [pendingAssignments, setPendingAssignments] = useState<{ [key: string]: string }>({});
    const [universityName, setUniversityName] = useState('');
    const [savingUniversity, setSavingUniversity] = useState(false);
    const [universityNameLocked, setUniversityNameLocked] = useState(false);
    const canEditUniversityName = canAddDepartment && !universityNameLocked;

    const filteredDepartments = departments.filter((d) => d.toLowerCase().includes(search.trim().toLowerCase()));

    useEffect(() => {
        getDepartmentAdmins().then(setDeptAdmins);
        getUniversityConfig()
            .then((data) => {
                setUniversityName(String(data?.universityName || 'Alumnyx University'));
                setUniversityNameLocked(Boolean(data?.locked));
            })
            .catch(() => undefined);
    }, [departments]);

    const handleAdd = async () => {
        if (!canAddDepartment) {
            setError('Only Super Admin can add departments.');
            return;
        }
        if (!name.trim()) {
            setError('Department name is required.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onAddDepartment(name.trim());
            setName('');
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to add department.');
        } finally {
            setSaving(false);
        }
    };

    const handleSelectAdmin = (dept: string, adminId: string) => {
        setPendingAssignments((prev) => ({ ...prev, [dept]: adminId }));
    };

    const handleAssign = async (dept: string) => {
        const adminId = pendingAssignments[dept];
        setAssigning(dept);
        try {
            await assignDepartmentAdmin(dept, adminId);
            setDeptAdmins((prev) => {
                const next = { ...prev };
                delete next[dept];
                return next;
            });
            setPendingAssignments((prev) => {
                const next = { ...prev };
                delete next[dept];
                return next;
            });
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to assign admin.');
        } finally {
            setAssigning(null);
        }
    };

    const handleDelete = async (dept: string) => {
        if (!canAddDepartment) return;
        if (Platform.OS === 'web') {
            if (!window.confirm(`Delete department "${dept.toUpperCase()}"?`)) return;
        } else {
            Alert.alert('Delete Department', `Delete department "${dept.toUpperCase()}"?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDepartment(dept);
                            await onDeleteDepartment(dept);
                        } catch (e: any) {
                            setError(e?.response?.data?.message || 'Failed to delete department.');
                        }
                    },
                },
            ]);
            return;
        }
        try {
            await deleteDepartment(dept);
            await onDeleteDepartment(dept);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to delete department.');
        }
    };

    const handleSaveUniversity = async () => {
        if (!canAddDepartment) {
            setError('Only Super Admin can update university name.');
            return;
        }
        if (universityNameLocked) {
            setError('University name is already set and cannot be edited.');
            return;
        }
        const value = String(universityName || '').trim();
        if (!value) {
            setError('University name is required.');
            return;
        }

        setSavingUniversity(true);
        setError('');
        try {
            const res = await updateUniversityConfig(value);
            setUniversityName(String(res?.universityName || value));
            setUniversityNameLocked(Boolean(res?.locked ?? true));
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to update university name.');
        } finally {
            setSavingUniversity(false);
        }
    };

    const getDeptIcon = (dept: string) => {
        const key = dept.toLowerCase();
        if (key === 'cse' || key === 'it' || key === 'aids') return <Microscope size={20} color="#001F3F" />;
        if (key === 'ece' || key === 'eee') return <Landmark size={20} color="#001F3F" />;
        if (key === 'csbs') return <Scale size={20} color="#001F3F" />;
        if (key === 'mech') return <Building2 size={20} color="#001F3F" />;
        return <Palette size={20} color="#001F3F" />;
    };

    return (
        <View style={styles.page}>
            <View style={styles.hero}>
                <View style={styles.heroLeft}>
                    <Text style={styles.kicker}>Department Oversight</Text>
                    <Text style={styles.title}>University Departments</Text>
                    <Text style={styles.subtitle}>Monitor alumni engagement and faculty allocations across all academic sectors.</Text>
                </View>
                <View style={styles.heroRight}>
                    <TouchableOpacity style={styles.heroGhostBtn}>
                        <Filter size={14} color="#43474E" />
                        <Text style={styles.heroGhostText}>Filter</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.heroPrimaryBtn} onPress={() => {}}>
                        <PlusCircle size={14} color="#241A00" />
                        <Text style={styles.heroPrimaryText}>Add Department</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={[styles.statCard, styles.statPrimary]}>
                    <View style={styles.statIconWrap}><GraduationCap size={16} color="#AFBFD7" /></View>
                    <Text style={styles.statNumber}>{departments.length}</Text>
                    <Text style={[styles.statLabel, styles.statLabelPrimary]}>Total Departments</Text>
                    <Text style={styles.statMeta}>Academic units onboarded</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={styles.statIconWrapSoft}><ShieldCheck size={16} color="#476083" /></View>
                    <Text style={styles.statNumberSoft}>{Object.values(deptAdmins).filter(Boolean).length}</Text>
                    <Text style={styles.statLabel}>Assigned Admins</Text>
                    <Text style={styles.statMetaSoft}>Operational governance</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={styles.statIconWrapSoft}><Landmark size={16} color="#735C00" /></View>
                    <Text style={styles.statNumberGold}>{admins.length}</Text>
                    <Text style={styles.statLabel}>Admin Pool</Text>
                    <Text style={styles.statMetaSoft}>Available for assignment</Text>
                </View>
            </View>

            <View style={styles.addCard}>
                <Text style={styles.sectionTitle}>University Name (Global)</Text>
                {universityNameLocked ? (
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>University name is locked after initial setup and cannot be edited.</Text>
                    </View>
                ) : null}
                <View style={styles.addRow}>
                    <TextInput
                        style={[styles.input, !canEditUniversityName && styles.inputDisabled]}
                        value={universityName}
                        onChangeText={setUniversityName}
                        placeholder="Enter university name"
                        editable={canEditUniversityName}
                    />
                    <TouchableOpacity
                        style={[styles.addBtn, (!canEditUniversityName || savingUniversity) && styles.addBtnDisabled]}
                        onPress={handleSaveUniversity}
                        disabled={!canEditUniversityName || savingUniversity}
                    >
                        <Text style={styles.addBtnText}>{savingUniversity ? 'Saving...' : (universityNameLocked ? 'Locked' : 'Save')}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.sectionDivider} />

                <Text style={styles.sectionTitle}>Add New Department</Text>
                {!canAddDepartment ? (
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>Only Super Admin can add departments. Regular admins can view and assign.</Text>
                    </View>
                ) : null}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <View style={styles.addRow}>
                    <View style={styles.searchRow}>
                        <Search size={14} color="#43474E" />
                        <TextInput
                            style={styles.searchInput}
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search departments"
                            placeholderTextColor="#74777F"
                        />
                    </View>
                </View>
                <View style={styles.addRow}>
                    <TextInput
                        style={[styles.input, !canAddDepartment && styles.inputDisabled]}
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter department name (e.g. cse)"
                        autoCapitalize="none"
                        editable={canAddDepartment}
                    />
                    <TouchableOpacity style={[styles.addBtn, (!canAddDepartment || saving) && styles.addBtnDisabled]} onPress={handleAdd} disabled={!canAddDepartment || saving}>
                        <PlusCircle size={14} color="#FFFFFF" />
                        <Text style={styles.addBtnText}>{saving ? 'Adding...' : 'Add Department'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.listCard}>
                <View style={styles.listHeader}>
                    <Text style={styles.sectionTitle}>All Departments ({filteredDepartments.length})</Text>
                    <View style={styles.liveChip}>
                        <Sparkles size={12} color="#2F486A" />
                        <Text style={styles.liveChipText}>Live</Text>
                    </View>
                </View>

                {filteredDepartments.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Building2 size={32} color="#94A3B8" />
                        <Text style={styles.emptyText}>No departments found.</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.scrollArea}>
                        <View style={styles.grid}>
                            {filteredDepartments.map((d) => {
                            const colors = DEPT_COLORS[d.toLowerCase()] || { bg: '#F1F5F9', text: '#475569' };
                            return (
                                <View key={d} style={[styles.deptCard, { backgroundColor: colors.bg }]}>
                                    <View style={styles.deptHeader}>
                                        <View style={styles.deptTitleWrap}>
                                            <View style={styles.deptIcon}>{getDeptIcon(d)}</View>
                                            <View>
                                                <Text style={[styles.deptName, { color: colors.text }]}>{d.toUpperCase()}</Text>
                                                <Text style={styles.deptGroup}>{DEPT_GROUPS[d.toLowerCase()] || 'Academic Department'}</Text>
                                            </View>
                                        </View>
                                        {canAddDepartment && (
                                            <TouchableOpacity onPress={() => handleDelete(d)} style={styles.deleteBtn}>
                                                <Trash2 size={14} color="#BA1A1A" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {canAddDepartment ? (
                                        <View style={styles.assignSection}>
                                            <Text style={styles.assignLabel}>Assign Admin:</Text>
                                            <select
                                                value={pendingAssignments[d] || deptAdmins[d] || ''}
                                                onChange={(e) => handleSelectAdmin(d, e.target.value)}
                                                disabled={assigning === d}
                                                style={styles.select}
                                            >
                                                <option value="">Select Admin</option>
                                                {admins.map((a) => (
                                                    <option key={a.id} value={a.id}>{a.profile?.firstName || a.email}</option>
                                                ))}
                                            </select>
                                            {pendingAssignments[d] !== undefined && pendingAssignments[d] !== deptAdmins[d] ? (
                                                <TouchableOpacity
                                                    style={[styles.saveBtn, { backgroundColor: pendingAssignments[d] === '' ? '#EF4444' : '#3B82F6' }]}
                                                    onPress={() => handleAssign(d)}
                                                    disabled={assigning === d}
                                                >
                                                    <Text style={styles.saveBtnText}>
                                                        {assigning === d ? 'Saving...' : pendingAssignments[d] === '' ? 'Unassign' : 'Save'}
                                                    </Text>
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                    ) : null}
                                    {deptAdmins[d] ? (
                                        <View style={styles.assignedBadge}>
                                            <Text style={styles.assignedText}>Assigned: {admins.find((a) => a.id === deptAdmins[d])?.profile?.firstName || 'Admin'}</Text>
                                        </View>
                                    ) : (
                                        !canAddDepartment && (
                                            <View style={styles.assignedBadge}>
                                                <Text style={styles.unassignedText}>Not assigned</Text>
                                            </View>
                                        )
                                    )}

                                    <TouchableOpacity style={styles.manageLink}>
                                        <Text style={styles.manageLinkText}>Manage Details</Text>
                                        <ArrowRight size={14} color="#735C00" />
                                    </TouchableOpacity>
                                </View>
                            );
                            })}
                        </View>
                    </ScrollView>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    page: { gap: 16 },
    hero: {
        marginBottom: 2,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E0E3E5',
        paddingHorizontal: 18,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
    },
    heroLeft: { maxWidth: 700 },
    heroRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    kicker: {
        color: '#6F88AD',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '700',
        marginBottom: 4,
    },
    title: { color: '#001F3F', fontSize: 32, fontWeight: '900', letterSpacing: -0.8 },
    subtitle: { color: '#43474E', fontSize: 13, fontWeight: '500', marginTop: 3 },
    heroGhostBtn: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#C4C6CF',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    heroGhostText: { color: '#43474E', fontSize: 12, fontWeight: '700' },
    heroPrimaryBtn: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        backgroundColor: '#FED65B',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E9C349',
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    heroPrimaryText: { color: '#241A00', fontSize: 12, fontWeight: '800' },
    statsRow: { flexDirection: 'row', gap: 14, marginBottom: 4, flexWrap: 'wrap' },
    statCard: {
        flex: 1,
        minWidth: 200,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E3E5',
        gap: 4,
    },
    statPrimary: {
        backgroundColor: '#001F3F',
        borderColor: '#001F3F',
    },
    statIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: '#2F486A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statIconWrapSoft: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: '#EAF0F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statNumber: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
    statNumberSoft: { fontSize: 28, fontWeight: '900', color: '#001F3F' },
    statNumberGold: { fontSize: 28, fontWeight: '900', color: '#735C00' },
    statLabel: { color: '#43474E', fontSize: 11, fontWeight: '800', marginTop: 2, textTransform: 'uppercase' },
    statLabelPrimary: { color: '#B8C8DB' },
    statMeta: { color: '#AFC0D6', fontSize: 11, fontWeight: '500' },
    statMetaSoft: { color: '#74777F', fontSize: 11, fontWeight: '500' },
    addCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 2, borderWidth: 1, borderColor: '#E0E3E5' },
    sectionTitle: { color: '#001F3F', fontSize: 15, fontWeight: '800', marginBottom: 12 },
    sectionDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 14 },
    infoBox: { backgroundColor: '#EAF3FF', borderRadius: 10, padding: 11, marginBottom: 12, borderWidth: 1, borderColor: '#D4E3FF' },
    infoText: { color: '#2F486A', fontSize: 12, fontWeight: '600' },
    errorText: { color: '#BA1A1A', fontSize: 13, fontWeight: '700', marginBottom: 12 },
    addRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#E0E3E5',
        backgroundColor: '#F1F4F6',
        borderRadius: 10,
        paddingHorizontal: 12,
        minWidth: 300,
        flex: 1,
    },
    searchInput: { flex: 1, paddingVertical: 10, color: '#181C1E', fontSize: 13, fontWeight: '500' },
    input: { flex: 1, borderWidth: 1, borderColor: '#E0E3E5', borderRadius: 10, backgroundColor: '#F8FAFC', paddingHorizontal: 14, paddingVertical: 12, fontSize: 13 },
    inputDisabled: { backgroundColor: '#F1F5F9', color: '#94A3B8' },
    addBtn: { backgroundColor: '#476083', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
    addBtnDisabled: { backgroundColor: '#94A3B8' },
    addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
    listCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E0E3E5' },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    liveChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#DDE9F7',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    liveChipText: { color: '#2F486A', fontSize: 11, fontWeight: '700' },
    scrollArea: { maxHeight: 620 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
    deptCard: { flexBasis: '31%', flexGrow: 1, minWidth: 280, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E0E3E5' },
    deptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    deptTitleWrap: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    deptIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F1F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deptName: { fontSize: 16, fontWeight: '900' },
    deptGroup: { color: '#74777F', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    deleteBtn: { padding: 6, borderRadius: 8, backgroundColor: '#FFDAD6' },
    assignSection: { marginTop: 10 },
    assignLabel: { color: '#43474E', fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
    select: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        fontSize: 12,
        backgroundColor: '#FFFFFF',
        width: '100%',
        marginBottom: 8,
    } as any,
    saveBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
    saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
    assignedBadge: {
        marginTop: 8,
        borderRadius: 8,
        backgroundColor: '#EAF7EF',
        borderWidth: 1,
        borderColor: '#BDE5CA',
        paddingHorizontal: 9,
        paddingVertical: 6,
        alignSelf: 'flex-start',
    },
    assignedText: { color: '#156B4D', fontSize: 11, fontWeight: '700' },
    unassignedText: { color: '#74777F', fontSize: 11, fontWeight: '700' },
    manageLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, alignSelf: 'flex-end' },
    manageLinkText: { color: '#735C00', fontSize: 12, fontWeight: '700' },
    emptyState: { padding: 48, alignItems: 'center' },
    emptyText: { color: '#74777F', fontSize: 14, marginTop: 10 },
});
