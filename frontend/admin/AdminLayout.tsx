import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Platform, TouchableOpacity, TextInput, Image } from 'react-native';
import { Search, Bell, ChevronRight } from 'lucide-react-native';
import axiosClient from '../api/axiosClient';
import AdminSidebar from './AdminSidebar';
import AdminDashboard from './AdminDashboard';
import AdminsManagementPage from './AdminsManagementPage';
import UsersTable from './UsersTable';
import AlumniManagementPage from './AlumniManagementPage';
import DepartmentManagementPage from './DepartmentManagementPage';
import { getDepartmentAdmins } from './api/departmentAdminClient';
import LogsPage from './LogsPage';
import AdminSettingsPage from './AdminSettingsPage';

type Section = 'dashboard' | 'admins' | 'users' | 'alumni' | 'departments' | 'logs' | 'settings';

type EditForm = {
    id: string;
    originalRole: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isVerified: string;
    alumniStatus: string;
    college: string;
    graduationYear: string;
    department: string;
    currentCompany: string;
    skills: string;
    bio: string;
    profilePicture: string;
};

const DEFAULT_DEPARTMENTS = ['cse', 'it', 'ece', 'eee', 'mech', 'aids', 'csbs'];

interface Props {
    initialSection?: string;
    currentUser: any;
    onLogout: () => Promise<void>;
}

const mapPathToSection = (path: string): Section => {
    const segment = (path || '').replace(/^\//, '').split('/')[1] || '';
    if (segment === 'admins') return 'admins';
    if (segment === 'users') return 'users';
    if (segment === 'alumni') return 'alumni';
    if (segment === 'departments') return 'departments';
    if (segment === 'verification') return 'alumni';
    if (segment === 'logs') return 'logs';
    if (segment === 'settings') return 'settings';
    return 'dashboard';
};

const sectionToPath = (section: Section) => {
    if (section === 'dashboard') return '/admin';
    return `/admin/${section}`;
};

export default function AdminLayout({ initialSection, currentUser, onLogout }: Props) {
    const initial = useMemo(() => {
        if (initialSection) return mapPathToSection(`/admin/${initialSection}`);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            return mapPathToSection(window.location.pathname);
        }
        return 'dashboard';
    }, [initialSection]);

    const [section, setSection] = useState<Section>(initial);
    const [quickActionOpenSection, setQuickActionOpenSection] = useState<Section | null>(null);
    const [quickActionSignal, setQuickActionSignal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({ users: 0, alumni: 0, mentorship: 0 });
    const [admins, setAdmins] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [alumni, setAlumni] = useState<any[]>([]);
    const [pendingAlumni, setPendingAlumni] = useState<any[]>([]);
    const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
    const [departmentAdmins, setDepartmentAdmins] = useState<{ [key: string]: string | null }>({});
    const [adminLogs, setAdminLogs] = useState<any[]>([]);
    const [editForm, setEditForm] = useState<EditForm | null>(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [topSearch, setTopSearch] = useState('');
    const canManageAdmins = Boolean(
        currentUser?.isSuperAdmin ||
        ['admin@alumnyx.com', 'superadmin@alumnyx.com'].includes(String(currentUser?.email || '').toLowerCase())
    );

    const loadAll = async () => {
        setLoading(true);
        try {
            const [statsRes, adminsRes, usersRes, alumniRes, pendingRes, logsRes, departmentsRes] = await Promise.all([
                axiosClient.get('/admin/stats'),
                axiosClient.get('/admin/admins'),
                axiosClient.get('/admin/users'),
                axiosClient.get('/admin/alumni'),
                axiosClient.get('/admin/alumni/pending'),
                axiosClient.get('/admin/logs'),
                axiosClient.get('/admin/departments'),
            ]);

            setStats({
                users: statsRes.data?.users?.total || 0,
                alumni: statsRes.data?.users?.alumni || 0,
                mentorship: statsRes.data?.activeMentorships || 0,
            });
            setAdmins(adminsRes.data || []);
            setUsers(usersRes.data || []);
            setAlumni(alumniRes.data || []);
            setPendingAlumni(pendingRes.data || []);
            setAdminLogs(logsRes.data || []);
            setDepartments(departmentsRes.data?.length ? departmentsRes.data : DEFAULT_DEPARTMENTS);
            try {
                const deptAdmins = await getDepartmentAdmins();
                setDepartmentAdmins(deptAdmins);
            } catch {}
        } catch (error: any) {
            Alert.alert('Admin Error', error?.response?.data?.message || 'Failed to load admin panel data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            (window as any).__adminReload = loadAll;
        }
        return () => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                delete (window as any).__adminReload;
            }
        };
    }, []);

    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const onPop = () => setSection(mapPathToSection(window.location.pathname));
            window.addEventListener('popstate', onPop);
            return () => window.removeEventListener('popstate', onPop);
        }
    }, []);

    const navigate = (next: Section, options?: { preserveQuickAction?: boolean }) => {
        if (!options?.preserveQuickAction) {
            setQuickActionOpenSection(null);
        }
        setSection(next);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.history.pushState({}, '', sectionToPath(next));
        }
    };

    const handleDashboardQuickAction = (target: 'alumni' | 'users' | 'admins' | 'departments' | 'logs') => {
        const nextSection = target as Section;
        setQuickActionOpenSection(nextSection);
        setQuickActionSignal((s) => s + 1);
        navigate(nextSection, { preserveQuickAction: true });
    };

    const handleCreateUser = async (data: { firstName: string; lastName: string; email: string; role: string; college: string; graduationYear: string; department: string; }) => {
        await axiosClient.post('/admin/users', data);
        await loadAll();
    };

    const handleCreateAdmin = async (data: { name: string; email: string; password: string; }) => {
        await axiosClient.post('/admin/admins', data);
        await loadAll();
    };

    const handleCreateAlumni = async (data: { name: string; email: string; password: string; college: string; graduationYear: string; department: string; }) => {
        await axiosClient.post('/admin/alumni', data);
        await loadAll();
    };

    const handleAddDepartment = async (name: string) => {
        await axiosClient.post('/admin/departments', { name });
        await loadAll();
    };

    const handleDeleteDepartment = async (name: string) => {
        await axiosClient.delete('/admin/departments', { data: { department: name } });
        await loadAll();
    };

    const handleDeleteUser = async (id: string, name: string) => {
        const doDelete = async () => {
            try {
                await axiosClient.delete(`/admin/users/${id}`);
                await loadAll();
            } catch (e: any) {
                Alert.alert('Error', e?.response?.data?.message || 'Failed to delete user.');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`Delete user "${name}"? This cannot be undone.`)) {
                await doDelete();
            }
        } else {
            Alert.alert('Delete User', `Delete ${name}? This cannot be undone.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: doDelete },
            ]);
        }
    };

    const handleDeleteAdmin = async (id: string, name: string) => {
        // Prevent deleting any super admin account
        const target = admins.find((a) => a.id === id);
        if (target?.isSuperAdmin) {
            if (Platform.OS === 'web') {
                window.alert('Super Admin accounts cannot be deleted.');
            } else {
                Alert.alert('Not Allowed', 'Super Admin accounts cannot be deleted.');
            }
            return;
        }

        const doDelete = async () => {
            try {
                await axiosClient.delete(`/admin/admins/${id}`);
                await loadAll();
            } catch (e: any) {
                Alert.alert('Error', e?.response?.data?.message || 'Failed to delete admin.');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`Delete admin "${name}"? This cannot be undone.`)) {
                await doDelete();
            }
        } else {
            Alert.alert('Delete Admin', `Delete ${name}? This cannot be undone.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: doDelete },
            ]);
        }
    };

    const handleApproveAlumni = async (id: string) => {
        await axiosClient.put(`/admin/alumni/verify/${id}`);
        await loadAll();
    };

    const handleRejectAlumni = async (id: string) => {
        await axiosClient.put(`/admin/alumni/reject/${id}`);
        await loadAll();
    };

    const handleBulkApproveAlumni = async (ids: string[]) => {
        await axiosClient.put('/admin/alumni/bulk-verify', { ids });
        await loadAll();
    };

    const handleBulkRejectAlumni = async (ids: string[]) => {
        await axiosClient.put('/admin/alumni/bulk-reject', { ids });
        await loadAll();
    };

    const handleResetPassword = async (id: string, name: string) => {
        const doReset = async () => {
            try {
                const res = await axiosClient.put(`/admin/users/${id}/reset-password`);
                const msg = res.data?.message || 'Password reset successfully.';
                if (Platform.OS === 'web') {
                    window.alert(msg);
                } else {
                    Alert.alert('Success', msg);
                }
            } catch (e: any) {
                const errMsg = e?.response?.data?.message || 'Failed to reset password.';
                if (Platform.OS === 'web') {
                    window.alert(errMsg);
                } else {
                    Alert.alert('Error', errMsg);
                }
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`Reset password for "${name}" to default?`)) await doReset();
        } else {
            Alert.alert('Reset Password', `Reset "${name}" to default password?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', onPress: doReset },
            ]);
        }
    };

    const handleEditUser = async (u: any) => {
        if (String(u?.role || '').toUpperCase() === 'ADMIN' && !canManageAdmins) {
            setEditError('Only Super Admin can edit admin accounts.');
            return;
        }

        const profile = u?.profile || {};
        setEditError('');
        setEditForm({
            id: String(u?.id || ''),
            originalRole: String(u?.role || 'STUDENT').toUpperCase(),
            firstName: String(profile.firstName || ''),
            lastName: String(profile.lastName || ''),
            email: String(u?.email || ''),
            role: String(u?.role || 'STUDENT'),
            isVerified: String(Boolean(u?.isVerified)),
            alumniStatus: String(u?.alumniStatus || ''),
            college: String(profile.college || ''),
            graduationYear: String(profile.graduationYear || ''),
            department: String(profile.department || '').toLowerCase(),
            currentCompany: String(profile.currentCompany || ''),
            skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : String(profile.skills || ''),
            bio: String(profile.bio || ''),
            profilePicture: String(profile.profilePicture || ''),
        });
    };

    const setEdit = (key: keyof EditForm, value: string) => {
        setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const closeEditPanel = () => {
        setEditForm(null);
        setEditError('');
        setEditSaving(false);
    };

    const submitEditPanel = async () => {
        if (!editForm) return;
        const isAdminEdit = editForm.originalRole === 'ADMIN';
        if (!editForm.firstName.trim() || !editForm.email.trim()) {
            setEditError('First name and email are required.');
            return;
        }

        if (!canManageAdmins && isAdminEdit) {
            setEditError('Only Super Admin can assign or edit admin accounts.');
            return;
        }

        setEditSaving(true);
        setEditError('');
        try {
            const payload = isAdminEdit
                ? {
                    firstName: editForm.firstName.trim(),
                    lastName: editForm.lastName.trim(),
                    email: editForm.email.trim(),
                    profilePicture: editForm.profilePicture.trim() || null,
                }
                : {
                    firstName: editForm.firstName.trim(),
                    lastName: editForm.lastName.trim(),
                    email: editForm.email.trim(),
                    role: editForm.role,
                    isVerified: editForm.isVerified,
                    alumniStatus: editForm.alumniStatus,
                    college: editForm.college.trim(),
                    graduationYear: editForm.graduationYear.trim(),
                    department: editForm.department.trim().toLowerCase(),
                    currentCompany: editForm.currentCompany.trim(),
                    skills: editForm.skills,
                    bio: editForm.bio,
                    profilePicture: editForm.profilePicture.trim() || null,
                };

            await axiosClient.put(`/admin/users/${editForm.id}`, payload);
            await loadAll();
            closeEditPanel();
        } catch (e: any) {
            setEditError(e?.response?.data?.message || 'Failed to update user details.');
        } finally {
            setEditSaving(false);
        }
    };

    const titleMap: Record<Section, string> = {
        dashboard: 'Dashboard',
        admins: 'Admin Management',
        users: 'Users Management',
        alumni: 'Alumni Management',
        departments: 'Department Management',
        logs: 'Logs',
        settings: 'Settings',
    };

    const isAdminEdit = editForm?.originalRole === 'ADMIN';

    return (
        <View style={styles.root}>
            <AdminSidebar active={section} onNavigate={navigate} onLogout={onLogout} />

            <View style={styles.content}>
                <View style={styles.topBar}>
                    <View style={styles.topLeft}>
                        <View style={styles.topSearchWrap}>
                            <Search size={15} color="#94A3B8" strokeWidth={2.2} />
                            <TextInput
                                style={styles.topSearchInput}
                                placeholder="Search the ledger..."
                                placeholderTextColor="#94A3B8"
                                value={topSearch}
                                onChangeText={setTopSearch}
                            />
                        </View>
                    </View>

                    <View style={styles.topRight}>
                        <TouchableOpacity style={styles.notifyBtn}>
                            <Bell size={17} color="#64748B" strokeWidth={2.2} />
                        </TouchableOpacity>
                        <View style={styles.topDivider} />
                        <View style={styles.adminBlock}>
                            <View style={styles.adminTextWrap}>
                                <Text style={styles.adminName}>Admin Control</Text>
                                <Text style={styles.adminRole}>{currentUser?.isSuperAdmin ? 'Super Admin' : 'Admin'}</Text>
                            </View>
                            <View style={styles.adminAvatar}>
                                <Text style={styles.adminAvatarText}>A</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.breadcrumbWrap}>
                    <Text style={styles.breadcrumbMuted}>Home</Text>
                    <ChevronRight size={12} color="#CBD5E1" strokeWidth={2.5} />
                    <Text style={styles.breadcrumbActive}>{titleMap[section]}</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollBody}>
                    {loading ? <Text style={styles.loading}>Loading...</Text> : null}
                    {!loading && section === 'dashboard' ? <AdminDashboard stats={stats} onQuickAction={handleDashboardQuickAction} /> : null}
                    {!loading && section === 'admins' ? <AdminsManagementPage admins={admins} canManage={canManageAdmins} currentUserEmail={currentUser?.email} onAdd={handleCreateAdmin} onDelete={handleDeleteAdmin} onResetPassword={handleResetPassword} onEdit={handleEditUser} openAddFormSignal={quickActionOpenSection === 'admins' ? quickActionSignal : 0} /> : null}
                    {!loading && section === 'users' ? <UsersTable users={users} departments={departments} onDelete={handleDeleteUser} onAdd={handleCreateUser} onResetPassword={handleResetPassword} onEdit={handleEditUser} openAddFormSignal={quickActionOpenSection === 'users' ? quickActionSignal : 0} /> : null}
                    {!loading && section === 'alumni' ? <AlumniManagementPage alumni={alumni} pendingAlumni={pendingAlumni} departments={departments} onApprove={handleApproveAlumni} onReject={handleRejectAlumni} onBulkApprove={handleBulkApproveAlumni} onBulkReject={handleBulkRejectAlumni} onAdd={handleCreateAlumni} onDelete={handleDeleteUser} onResetPassword={handleResetPassword} onEdit={handleEditUser} openAddFormSignal={quickActionOpenSection === 'alumni' ? quickActionSignal : 0} /> : null}
                    {!loading && section === 'departments' ? <DepartmentManagementPage departments={departments} canAddDepartment={canManageAdmins} onAddDepartment={handleAddDepartment} onDeleteDepartment={handleDeleteDepartment} admins={admins} /> : null}
                    {!loading && section === 'logs' ? <LogsPage adminLogs={adminLogs} /> : null}
                    {!loading && section === 'settings' ? <AdminSettingsPage currentUser={currentUser} canManageAdmins={canManageAdmins} /> : null}
                </ScrollView>

                {editForm ? (
                    <View style={styles.modalOverlay}>
                        <View style={styles.editPanel}>
                            <View style={styles.editPanelHeader}>
                                <Text style={styles.editTitle}>Edit User Details</Text>
                                <TouchableOpacity style={styles.editCloseBtn} onPress={closeEditPanel}>
                                    <Text style={styles.editCloseTxt}>Close</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.permissionNote}>
                                {isAdminEdit
                                    ? 'Admin edit supports First Name, Last Name, Email, and Profile Photo URL.'
                                    : 'Permission: Super Admin can edit Admin, User, and Alumni. Admin can edit only User and Alumni.'}
                            </Text>
                            {editError ? <Text style={styles.editError}>{editError}</Text> : null}

                            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBody}>
                                <View style={styles.photoRow}>
                                    <View style={styles.photoPreviewWrap}>
                                        {editForm.profilePicture ? (
                                            <Image source={{ uri: editForm.profilePicture }} style={styles.photoPreview} />
                                        ) : (
                                            <View style={[styles.photoPreview, styles.photoPlaceholder]}>
                                                <Text style={styles.photoPlaceholderText}>No Photo</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.editFieldWide}>
                                        <Text style={styles.editLabel}>Profile Photo URL</Text>
                                        <TextInput
                                            style={styles.editInput}
                                            value={editForm.profilePicture}
                                            onChangeText={(v) => setEdit('profilePicture', v)}
                                            placeholder="https://example.com/photo.jpg"
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>

                                <View style={styles.editRow}>
                                    <View style={styles.editField}>
                                        <Text style={styles.editLabel}>First Name *</Text>
                                        <TextInput style={styles.editInput} value={editForm.firstName} onChangeText={(v) => setEdit('firstName', v)} placeholder="First name" />
                                    </View>
                                    <View style={styles.editField}>
                                        <Text style={styles.editLabel}>Last Name</Text>
                                        <TextInput style={styles.editInput} value={editForm.lastName} onChangeText={(v) => setEdit('lastName', v)} placeholder="Last name" />
                                    </View>
                                </View>

                                <View style={styles.editRow}>
                                    <View style={styles.editField}>
                                        <Text style={styles.editLabel}>Email *</Text>
                                        <TextInput style={styles.editInput} value={editForm.email} onChangeText={(v) => setEdit('email', v)} placeholder="email@example.com" autoCapitalize="none" />
                                    </View>
                                    {!isAdminEdit ? (
                                        <View style={styles.editField}>
                                            <Text style={styles.editLabel}>Role</Text>
                                            <select value={editForm.role} onChange={(e) => setEdit('role', (e.target as HTMLSelectElement).value)} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#0F172A', background: '#F8FAFC', width: '100%' } as any}>
                                                <option value="STUDENT">STUDENT</option>
                                                <option value="ALUMNI">ALUMNI</option>
                                                {canManageAdmins ? <option value="ADMIN">ADMIN</option> : null}
                                            </select>
                                        </View>
                                    ) : null}
                                </View>

                                {!isAdminEdit ? (
                                    <>
                                        <View style={styles.editRow}>
                                            <View style={styles.editField}>
                                                <Text style={styles.editLabel}>Verified</Text>
                                                <select value={editForm.isVerified} onChange={(e) => setEdit('isVerified', (e.target as HTMLSelectElement).value)} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#0F172A', background: '#F8FAFC', width: '100%' } as any}>
                                                    <option value="true">Yes</option>
                                                    <option value="false">No</option>
                                                </select>
                                            </View>
                                            <View style={styles.editField}>
                                                <Text style={styles.editLabel}>Alumni Status</Text>
                                                <select value={editForm.alumniStatus} onChange={(e) => setEdit('alumniStatus', (e.target as HTMLSelectElement).value)} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#0F172A', background: '#F8FAFC', width: '100%' } as any}>
                                                    <option value="">None</option>
                                                    <option value="PENDING">PENDING</option>
                                                    <option value="APPROVED">APPROVED</option>
                                                    <option value="REJECTED">REJECTED</option>
                                                    <option value="VERIFIED">VERIFIED</option>
                                                </select>
                                            </View>
                                        </View>

                                        <View style={styles.editRow}>
                                            <View style={styles.editField}>
                                                <Text style={styles.editLabel}>College</Text>
                                                <TextInput style={styles.editInput} value={editForm.college} onChangeText={(v) => setEdit('college', v)} placeholder="College" />
                                            </View>
                                            <View style={styles.editField}>
                                                <Text style={styles.editLabel}>Graduation Year</Text>
                                                <TextInput style={styles.editInput} value={editForm.graduationYear} onChangeText={(v) => setEdit('graduationYear', v)} placeholder="e.g. 2024" keyboardType="numeric" />
                                            </View>
                                        </View>

                                        <View style={styles.editRow}>
                                            <View style={styles.editField}>
                                                <Text style={styles.editLabel}>Department</Text>
                                                <select value={editForm.department} onChange={(e) => setEdit('department', (e.target as HTMLSelectElement).value)} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#0F172A', background: '#F8FAFC', width: '100%' } as any}>
                                                    <option value="">None</option>
                                                    {departments.map((d) => (
                                                        <option key={d} value={d}>{d.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                            </View>
                                            <View style={styles.editField}>
                                                <Text style={styles.editLabel}>Current Company</Text>
                                                <TextInput style={styles.editInput} value={editForm.currentCompany} onChangeText={(v) => setEdit('currentCompany', v)} placeholder="Company" />
                                            </View>
                                        </View>

                                        <View style={styles.editRow}>
                                            <View style={styles.editFieldWide}>
                                                <Text style={styles.editLabel}>Skills (comma separated)</Text>
                                                <TextInput style={styles.editInput} value={editForm.skills} onChangeText={(v) => setEdit('skills', v)} placeholder="React, Node.js, SQL" />
                                            </View>
                                        </View>

                                        <View style={styles.editRow}>
                                            <View style={styles.editFieldWide}>
                                                <Text style={styles.editLabel}>Bio</Text>
                                                <TextInput style={[styles.editInput, styles.editBio]} value={editForm.bio} onChangeText={(v) => setEdit('bio', v)} placeholder="Short bio" multiline />
                                            </View>
                                        </View>
                                    </>
                                ) : null}
                            </ScrollView>

                            <View style={styles.editActionRow}>
                                <TouchableOpacity style={styles.editCancelBtn} onPress={closeEditPanel} disabled={editSaving}>
                                    <Text style={styles.editCancelTxt}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.editSaveBtn, editSaving && styles.editSaveBtnDisabled]} onPress={submitEditPanel} disabled={editSaving}>
                                    <Text style={styles.editSaveTxt}>{editSaving ? 'Saving...' : 'Save Changes'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F7FAFC',
    },
    content: {
        flex: 1,
    },
    topBar: {
        minHeight: 64,
        backgroundColor: '#F7FAFC',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(196,198,207,0.35)',
        paddingHorizontal: 24,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    topLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        minWidth: 0,
    },
    brandWord: {
        fontSize: 28,
        fontWeight: '900',
        color: '#001F3F',
        letterSpacing: -0.6,
    },
    brandWordImage: {
        width: 138,
        height: 28,
        resizeMode: 'contain',
    },
    topSearchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F1F4F6',
        borderRadius: 10,
        paddingHorizontal: 12,
        borderWidth: 0,
        width: 330,
        maxWidth: '100%',
    },
    topSearchInput: {
        flex: 1,
        paddingVertical: 8,
        fontSize: 13,
        color: '#1F2937',
        fontWeight: '500',
    },
    breadcrumbWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 28,
        marginBottom: 4,
    },
    breadcrumbMuted: {
        color: '#43474E',
        fontSize: 12,
        fontWeight: '600',
    },
    breadcrumbActive: {
        color: '#001F3F',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    topRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    notifyBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    topDivider: {
        width: 1,
        height: 28,
        backgroundColor: 'rgba(196,198,207,0.3)',
    },
    adminBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    adminTextWrap: {
        alignItems: 'flex-end',
    },
    adminName: {
        color: '#001F3F',
        fontSize: 12,
        fontWeight: '800',
    },
    adminRole: {
        color: '#64748B',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    adminAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FED65B',
        backgroundColor: '#001F3F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    adminAvatarText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    scrollBody: {
        paddingHorizontal: 28,
        paddingTop: 16,
        paddingBottom: 40,
    },
    loading: {
        color: '#64748B',
        fontSize: 15,
    },
    editPanel: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 24,
        width: '92%',
        maxWidth: 960,
        maxHeight: '88%',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 50,
    },
    modalScroll: {
        maxHeight: 520,
    },
    modalBody: {
        paddingBottom: 8,
    },
    photoRow: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    photoPreviewWrap: {
        width: 90,
        height: 90,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    photoPreview: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoPlaceholderText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '600',
    },
    editPanelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    editTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    editCloseBtn: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    editCloseTxt: {
        color: '#475569',
        fontWeight: '700',
        fontSize: 13,
    },
    editError: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
    },
    permissionNote: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '600',
        marginBottom: 16,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    editRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    editField: {
        flex: 1,
        minWidth: 200,
    },
    editFieldWide: {
        flex: 1,
        minWidth: 200,
    },
    editLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    editInput: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
    },
    editBio: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    editActionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 16,
    },
    editCancelBtn: {
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    editCancelTxt: {
        color: '#475569',
        fontSize: 14,
        fontWeight: '700',
    },
    editSaveBtn: {
        backgroundColor: '#3B82F6',
        borderRadius: 10,
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    editSaveBtnDisabled: {
        backgroundColor: '#94A3B8',
    },
    editSaveTxt: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
