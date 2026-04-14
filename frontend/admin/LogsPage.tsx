import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Search, CalendarDays, Filter, ChevronLeft, ChevronRight, MoreHorizontal, ShieldCheck, CircleAlert, CircleCheckBig, Dot, MonitorCog } from 'lucide-react-native';

type LogFilter = 'all' | 'user' | 'alumin' | 'admin';
type DateFilter = '24h' | '7d' | '30d' | 'all';

interface LogsPageProps {
    adminLogs: any[];
}

const detectType = (action: string): LogFilter => {
    const v = String(action || '').toUpperCase();
    if (v.includes('ALUMNI')) return 'alumin';
    if (v.includes('ADMIN')) return 'admin';
    return 'user';
};

const detectSeverity = (action: string) => {
    const value = String(action || '').toUpperCase();
    if (value.includes('DELETE') || value.includes('REMOVE') || value.includes('REJECT')) {
        return { label: 'Critical', tone: 'critical' as const };
    }
    if (value.includes('APPROVE') || value.includes('CREATE') || value.includes('ADD')) {
        return { label: 'Success', tone: 'success' as const };
    }
    if (value.includes('UPDATE') || value.includes('EDIT') || value.includes('ASSIGN')) {
        return { label: 'Modified', tone: 'modified' as const };
    }
    return { label: 'System', tone: 'system' as const };
};

const detectIp = (metadata: any) => {
    if (!metadata) return '-';
    if (typeof metadata === 'string') return '-';
    return String(metadata.ip || metadata.ipAddress || metadata.clientIp || '-');
};

const normalizeDate = (createdAt: any) => {
    const d = createdAt ? new Date(createdAt) : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    return d;
};

export default function LogsPage({ adminLogs }: LogsPageProps) {
    const [filter, setFilter] = useState<LogFilter>('all');
    const [dateFilter, setDateFilter] = useState<DateFilter>('24h');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 8;

    const filteredLogs = useMemo(() => {
        let result = adminLogs;

        if (filter !== 'all') {
            result = result.filter((log) => detectType(log.action) === filter);
        }

        if (dateFilter !== 'all') {
            const now = Date.now();
            const range = dateFilter === '24h' ? 24 * 60 * 60 * 1000 : dateFilter === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
            result = result.filter((log) => {
                const d = normalizeDate(log.createdAt);
                if (!d) return false;
                return now - d.getTime() <= range;
            });
        }

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter((log) => {
                const action = String(log.action || '').toLowerCase();
                const target = String(log.targetId || '').toLowerCase();
                const details = typeof log.metadata === 'string'
                    ? log.metadata.toLowerCase()
                    : JSON.stringify(log.metadata || {}).toLowerCase();
                const actor = String(log.actorEmail || log.email || log.user || '').toLowerCase();
                return action.includes(q) || target.includes(q) || details.includes(q) || actor.includes(q);
            });
        }

        return result;
    }, [adminLogs, filter, dateFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
    const pagedLogs = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredLogs.slice(start, start + PAGE_SIZE);
    }, [filteredLogs, page]);

    const total24h = useMemo(() => {
        const now = Date.now();
        return adminLogs.filter((log) => {
            const d = normalizeDate(log.createdAt);
            if (!d) return false;
            return now - d.getTime() <= 24 * 60 * 60 * 1000;
        }).length;
    }, [adminLogs]);

    const pageStart = filteredLogs.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const pageEnd = Math.min(page * PAGE_SIZE, filteredLogs.length);

    useMemo(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    return (
        <View style={styles.container}>
            <View style={styles.topMetaRow}>
                <View style={styles.titleWrap}>
                    <Text style={styles.title}>Activity Logs</Text>
                    <Text style={styles.subtitle}>System-wide audit trail for transparency, compliance, and security tracking.</Text>
                </View>
                <View style={styles.totalCard}>
                    <View>
                        <Text style={styles.totalLabel}>Total Logs (24h)</Text>
                        <Text style={styles.totalValue}>{total24h.toLocaleString()}</Text>
                    </View>
                    <View style={styles.totalIconBox}>
                        <MonitorCog size={18} color="#001F3F" />
                    </View>
                </View>
            </View>

            <View style={styles.filtersCard}>
                <View style={styles.searchWrap}>
                    <Search size={16} color="#43474E" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by action, target, actor, or details..."
                        placeholderTextColor="#74777F"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                <View style={styles.filterControls}>
                    <View style={styles.selectWrap}>
                        <Filter size={14} color="#43474E" />
                        <select
                            value={filter}
                            onChange={(e) => {
                                setFilter((e.target as HTMLSelectElement).value as LogFilter);
                                setPage(1);
                            }}
                            style={styles.select as any}
                        >
                            <option value="all">All Types</option>
                            <option value="user">User</option>
                            <option value="alumin">Alumni</option>
                            <option value="admin">Admin</option>
                        </select>
                    </View>

                    <View style={styles.selectWrap}>
                        <CalendarDays size={14} color="#43474E" />
                        <select
                            value={dateFilter}
                            onChange={(e) => {
                                setDateFilter((e.target as HTMLSelectElement).value as DateFilter);
                                setPage(1);
                            }}
                            style={styles.select as any}
                        >
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                    </View>

                    <TouchableOpacity style={styles.applyBtn} onPress={() => setPage(1)}>
                        <Filter size={14} color="#FFFFFF" />
                        <Text style={styles.applyBtnText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 2 }]}>User</Text>
                    <Text style={[styles.th, { flex: 2.4 }]}>Action</Text>
                    <Text style={[styles.th, { flex: 1.5 }]}>Timestamp</Text>
                    <Text style={[styles.th, { flex: 1.4 }]}>IP Address</Text>
                    <Text style={[styles.th, styles.thRight, { flex: 0.8 }]}>Details</Text>
                </View>

                <ScrollView style={styles.tableBody}>
                    {pagedLogs.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.empty}>No logs found for selected filters.</Text>
                        </View>
                    ) : null}

                    {pagedLogs.map((log, idx) => {
                        const t = detectType(log.action);
                        const sev = detectSeverity(log.action);
                        const stamp = normalizeDate(log.createdAt);
                        const userLabel = String(log.actorEmail || log.email || log.user || 'System User');
                        const initials = userLabel.split('@')[0].split(/[._\s-]+/).map((s: string) => s.charAt(0).toUpperCase()).join('').slice(0, 2) || 'SU';

                        return (
                            <View key={log.id || `${log.action}-${idx}`} style={[styles.row, idx % 2 === 1 && styles.rowAlt]}>
                                <View style={[styles.cell, { flex: 2 }]}> 
                                    <View style={styles.userWrap}>
                                        <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{initials}</Text></View>
                                        <View style={styles.userTextWrap}>
                                            <Text style={styles.userName} numberOfLines={1}>{userLabel.split('@')[0]}</Text>
                                            <Text style={styles.userEmail} numberOfLines={1}>{userLabel}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={[styles.cell, { flex: 2.4 }]}> 
                                    <View style={styles.actionWrap}>
                                        <View style={[styles.dot, sev.tone === 'critical' ? styles.dotCritical : sev.tone === 'success' ? styles.dotSuccess : sev.tone === 'modified' ? styles.dotModified : styles.dotSystem]}>
                                            <Dot size={10} color={sev.tone === 'critical' ? '#BA1A1A' : sev.tone === 'success' ? '#156B4D' : sev.tone === 'modified' ? '#735C00' : '#43474E'} />
                                        </View>
                                        <Text style={styles.actionText} numberOfLines={1}>{String(log.action || 'ADMIN_ACTION').replace(/_/g, ' ')}</Text>
                                        <View style={[styles.badge,
                                            sev.tone === 'critical' ? styles.badgeCritical : sev.tone === 'success' ? styles.badgeSuccess : sev.tone === 'modified' ? styles.badgeModified : styles.badgeSystem,
                                        ]}>
                                            {sev.tone === 'critical' ? <CircleAlert size={11} color="#93000A" /> : sev.tone === 'success' ? <CircleCheckBig size={11} color="#156B4D" /> : sev.tone === 'modified' ? <ShieldCheck size={11} color="#735C00" /> : <MonitorCog size={11} color="#43474E" />}
                                            <Text style={[styles.badgeText,
                                                sev.tone === 'critical' ? styles.badgeTextCritical : sev.tone === 'success' ? styles.badgeTextSuccess : sev.tone === 'modified' ? styles.badgeTextModified : styles.badgeTextSystem,
                                            ]}>{sev.label}</Text>
                                        </View>
                                        <View style={[styles.typeTag, t === 'admin' ? styles.typeAdmin : styles.typeOther]}>
                                            <Text style={[styles.typeTagText, t === 'admin' ? styles.typeAdminText : styles.typeOtherText]}>{t.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={[styles.cell, { flex: 1.5 }]}> 
                                    <Text style={styles.dateMain}>{stamp ? stamp.toLocaleDateString() : '-'}</Text>
                                    <Text style={styles.dateSub}>{stamp ? stamp.toLocaleTimeString() : '-'}</Text>
                                </View>

                                <View style={[styles.cell, { flex: 1.4 }]}> 
                                    <Text style={styles.ipText} numberOfLines={1}>{detectIp(log.metadata)}</Text>
                                </View>

                                <View style={[styles.cell, styles.cellRight, { flex: 0.8 }]}> 
                                    <TouchableOpacity style={styles.moreButton}>
                                        <MoreHorizontal size={14} color="#43474E" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>

            <View style={styles.paginationRow}>
                <Text style={styles.paginationMeta}>Showing {pageStart} to {pageEnd} of {filteredLogs.length} logs</Text>
                <View style={styles.paginationBtns}>
                    <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} disabled={page === 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
                        <ChevronLeft size={14} color={page === 1 ? '#A8A29E' : '#181C1E'} />
                    </TouchableOpacity>
                    <View style={styles.pageBadge}><Text style={styles.pageBadgeText}>{page}</Text></View>
                    <Text style={styles.pageOf}>of {totalPages}</Text>
                    <TouchableOpacity style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]} disabled={page === totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>
                        <ChevronRight size={14} color={page === totalPages ? '#A8A29E' : '#181C1E'} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    topMetaRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
    },
    titleWrap: {
        flex: 2,
        minWidth: 340,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#001F3F',
        letterSpacing: -0.7,
    },
    subtitle: {
        marginTop: 4,
        color: '#43474E',
        fontSize: 13,
        maxWidth: 820,
    },
    totalCard: {
        flex: 1,
        minWidth: 220,
        backgroundColor: '#F1F4F6',
        borderWidth: 1,
        borderColor: '#E0E3E5',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    totalLabel: {
        fontSize: 10,
        color: '#74777F',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontWeight: '800',
    },
    totalValue: {
        color: '#001F3F',
        fontSize: 24,
        fontWeight: '900',
        marginTop: 2,
    },
    totalIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#D4E3FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filtersCard: {
        backgroundColor: '#F1F4F6',
        borderWidth: 1,
        borderColor: '#E0E3E5',
        borderRadius: 12,
        padding: 12,
        gap: 10,
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E3E5',
        borderRadius: 10,
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 13,
        color: '#181C1E',
        fontWeight: '500',
    },
    filterControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    selectWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E3E5',
        borderRadius: 10,
        paddingHorizontal: 10,
    },
    select: {
        border: 'none',
        outline: 'none',
        background: 'transparent',
        padding: '9px 4px',
        fontSize: 12,
        fontWeight: 700,
        color: '#181C1E',
        minWidth: 130,
    } as any,
    applyBtn: {
        marginLeft: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#001F3F',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    applyBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    tableCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E3E5',
        borderRadius: 12,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F4F6',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E3E5',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    th: {
        color: '#74777F',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontSize: 10,
        fontWeight: '900',
    },
    thRight: {
        textAlign: 'right',
    },
    tableBody: {
        maxHeight: 560,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F4F6',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    rowAlt: {
        backgroundColor: '#FCFCFD',
    },
    cell: {
        justifyContent: 'center',
        paddingRight: 10,
    },
    cellRight: {
        alignItems: 'flex-end',
    },
    userWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    userAvatar: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#D4E3FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userAvatarText: {
        color: '#001C3A',
        fontWeight: '900',
        fontSize: 11,
    },
    userTextWrap: {
        flex: 1,
    },
    userName: {
        color: '#181C1E',
        fontWeight: '700',
        fontSize: 13,
    },
    userEmail: {
        color: '#74777F',
        fontSize: 10,
        marginTop: 1,
    },
    actionWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotCritical: { backgroundColor: '#FFDAD6' },
    dotSuccess: { backgroundColor: '#EAF7EF' },
    dotModified: { backgroundColor: '#FFF6DE' },
    dotSystem: { backgroundColor: '#E0E3E5' },
    actionText: {
        color: '#181C1E',
        fontSize: 12,
        fontWeight: '600',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    badgeCritical: { backgroundColor: '#FFDAD6' },
    badgeSuccess: { backgroundColor: '#EAF7EF' },
    badgeModified: { backgroundColor: '#FFF6DE' },
    badgeSystem: { backgroundColor: '#E0E3E5' },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    badgeTextCritical: { color: '#93000A' },
    badgeTextSuccess: { color: '#156B4D' },
    badgeTextModified: { color: '#735C00' },
    badgeTextSystem: { color: '#43474E' },
    typeTag: {
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    typeAdmin: { backgroundColor: '#D4E3FF' },
    typeOther: { backgroundColor: '#E0E3E5' },
    typeTagText: { fontSize: 9, fontWeight: '900' },
    typeAdminText: { color: '#001C3A' },
    typeOtherText: { color: '#43474E' },
    dateMain: {
        color: '#181C1E',
        fontSize: 12,
        fontWeight: '700',
    },
    dateSub: {
        color: '#74777F',
        fontSize: 10,
        marginTop: 2,
    },
    ipText: {
        color: '#43474E',
        fontSize: 11,
        fontFamily: 'monospace',
        backgroundColor: '#F1F4F6',
        borderRadius: 7,
        paddingHorizontal: 8,
        paddingVertical: 5,
        alignSelf: 'flex-start',
    },
    moreButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E3E5',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    emptyState: {
        paddingVertical: 32,
        alignItems: 'center',
    },
    empty: {
        color: '#94A3B8',
        fontSize: 14,
        textAlign: 'center',
    },
    paginationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    paginationMeta: {
        color: '#74777F',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        fontSize: 10,
        fontWeight: '800',
    },
    paginationBtns: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pageBtn: {
        width: 32,
        height: 32,
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
    pageBadge: {
        minWidth: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#FED65B',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    pageBadgeText: {
        color: '#241A00',
        fontWeight: '800',
        fontSize: 12,
    },
    pageOf: {
        color: '#43474E',
        fontSize: 12,
        fontWeight: '700',
    },
});
