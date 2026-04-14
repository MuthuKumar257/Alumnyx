import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    Share,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Bell, Bookmark, BookmarkCheck, ArrowLeft, Share2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';
import { alumnyxTheme } from '../theme/alumnyxTheme';

type FilterKey = 'All Opportunities' | 'Remote' | 'Engineering' | 'Finance' | 'Marketing' | 'Internships';

const FILTERS: FilterKey[] = ['All Opportunities', 'Remote', 'Engineering', 'Finance', 'Marketing', 'Internships'];

const containsAny = (source: string, keywords: string[]) => {
    const s = source.toLowerCase();
    return keywords.some((k) => s.includes(k));
};

export default function JobsScreen() {
    const navigation = useNavigation<any>();
    const { user } = useContext(AuthContext);
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [applying, setApplying] = useState(false);
    const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
    const [activeFilter, setActiveFilter] = useState<FilterKey>('All Opportunities');
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [visibleCount, setVisibleCount] = useState(8);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const [jobsRes, savedRes] = await Promise.all([
                axiosClient.get('/jobs'),
                axiosClient.get('/users/saved-jobs'),
            ]);
            setJobs(jobsRes.data || []);
            setSavedJobIds(new Set((savedRes.data || []).map((j: any) => j.id)));
        } catch (error) {
            console.error('Failed to fetch jobs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            const title = String(job.title || '');
            const description = String(job.description || '');
            const requirements = String(job.requirements || '');
            const location = String(job.location || '');
            const searchable = `${title} ${description} ${requirements}`;

            if (activeFilter === 'All Opportunities') return true;
            if (activeFilter === 'Remote') return containsAny(location, ['remote', 'hybrid']);
            if (activeFilter === 'Engineering') return containsAny(searchable, ['engineer', 'developer', 'software', 'frontend', 'backend', 'full-stack']);
            if (activeFilter === 'Finance') return containsAny(searchable, ['finance', 'accounting', 'analyst', 'investment']);
            if (activeFilter === 'Marketing') return containsAny(searchable, ['marketing', 'brand', 'growth', 'content', 'seo']);
            if (activeFilter === 'Internships') return containsAny(searchable, ['intern', 'internship', 'trainee']);
            return true;
        });
    }, [jobs, activeFilter]);

    const visibleJobs = useMemo(() => filteredJobs.slice(0, visibleCount), [filteredJobs, visibleCount]);

    const toggleSave = async (jobId: string) => {
        try {
            setSavingId(jobId);
            if (savedJobIds.has(jobId)) {
                await axiosClient.delete(`/users/saved-jobs/${jobId}`);
            } else {
                await axiosClient.post(`/users/saved-jobs/${jobId}`);
            }
            await fetchJobs();
        } catch (error: any) {
            Alert.alert('Save failed', error?.response?.data?.message || 'Could not update saved jobs.');
        } finally {
            setSavingId(null);
        }
    };

    const applyForJob = async (jobId: string) => {
        let latestUser = user;
        try {
            const me = await axiosClient.get('/auth/me');
            if (me?.data) latestUser = me.data;
        } catch {
            // Fallback to local user context if live refresh fails
        }

        const firstName = String(latestUser?.profile?.firstName || '').trim();
        const lastName = String(latestUser?.profile?.lastName || '').trim();
        const fullName = `${firstName} ${lastName}`.trim();
        const email = String(latestUser?.email || '').trim();
        const phone = String((latestUser as any)?.profile?.phone || '').trim();
        const department = String(latestUser?.profile?.department || '').trim();
        const graduationYear = String(latestUser?.profile?.graduationYear || '').trim();
        const currentCompany = String(latestUser?.profile?.currentCompany || '').trim();
        const college = String(latestUser?.profile?.college || '').trim();
        const resumeUrl = String((latestUser as any)?.profile?.resumeUrl || '').trim();
        const role = String(latestUser?.role || '').toUpperCase();
        const alumniStatus = String((latestUser as any)?.alumniStatus || '').toUpperCase();
        const isVerified = Boolean((latestUser as any)?.isVerified);

        if (!isVerified) {
            Alert.alert('Verification required', 'Your account must be verified before you can apply for jobs.');
            return;
        }

        if (role === 'ALUMNI' && !['APPROVED', 'VERIFIED'].includes(alumniStatus)) {
            Alert.alert('Approval pending', 'Your alumni account is not approved yet. Please wait for admin verification.');
            return;
        }

        if (!fullName || !email) {
            Alert.alert('Incomplete profile', 'Please complete your name and email before applying.');
            return;
        }

        const missingProfileFields: string[] = [];
        if (!firstName) missingProfileFields.push('first name');
        if (!lastName) missingProfileFields.push('last name');
        if (!college) missingProfileFields.push('college');
        if (!department) missingProfileFields.push('department');
        if (!graduationYear) missingProfileFields.push('graduation year');
        if (!resumeUrl) missingProfileFields.push('resume URL');

        if (missingProfileFields.length) {
            Alert.alert('Complete profile', `Please complete: ${missingProfileFields.join(', ')}`);
            return;
        }

        if (!resumeUrl) {
            Alert.alert(
                'Resume required',
                'Please add your resume in Edit Profile before applying.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Add Resume',
                        onPress: () => {
                            setSelectedJob(null);
                            navigation?.navigate?.('EditProfile');
                        },
                    },
                ]
            );
            return;
        }

        const verificationSummary = [
            `Name: ${fullName}`,
            `Email: ${email}`,
            `Phone: ${phone || 'Not provided'}`,
            `Department: ${department || 'Not provided'}`,
            `Graduation Year: ${graduationYear || 'Not provided'}`,
            `Current Company: ${currentCompany || 'Not provided'}`,
            `College: ${college || 'Not provided'}`,
            `Resume: Attached`,
            '',
            'Confirm these details and apply?'
        ].join('\n');

        const confirmed = await new Promise<boolean>((resolve) => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                resolve(window.confirm(verificationSummary));
                return;
            }

            Alert.alert('Verify before apply', verificationSummary, [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Confirm & Apply', onPress: () => resolve(true) },
            ]);
        });

        if (!confirmed) return;

        try {
            setApplying(true);
            const coverNote = [
                `Applicant: ${fullName}`,
                `Email: ${email}`,
                phone ? `Phone: ${phone}` : null,
                department ? `Department: ${department}` : null,
                graduationYear ? `Graduation Year: ${graduationYear}` : null,
                currentCompany ? `Current Company: ${currentCompany}` : null,
                college ? `College: ${college}` : null,
            ].filter(Boolean).join(' | ');

            await axiosClient.post(`/jobs/${jobId}/apply`, {
                fullName,
                email,
                phone: phone || null,
                resumeUrl,
                coverNote,
            });
            Alert.alert('Application sent', 'Your profile and resume have been shared with the alumni poster.');
            setSelectedJob(null);
            await fetchJobs();
        } catch (error: any) {
            Alert.alert('Apply failed', error?.response?.data?.message || 'Could not submit application.');
        } finally {
            setApplying(false);
        }
    };

    const shareJob = async (job: any) => {
        if (!job) return;
        const message = [
            `${job.title || 'Job Opportunity'} at ${job.company || 'Company'}`,
            job.location || 'Location not specified',
            '',
            job.description || 'Shared from Alumnyx',
        ].join('\n');

        try {
            await Share.share({ message });
        } catch {
            Alert.alert('Share unavailable', 'Could not open share options on this device.');
        }
    };

    const renderCard = ({ item }: { item: any }) => {
        const isSaved = savedJobIds.has(item.id);
        const posterName = `${item.poster?.profile?.firstName || 'Alumni'} ${item.poster?.profile?.lastName || ''}`.trim();
        const postedAgo = new Date(item.createdAt).toLocaleDateString();
        const isInternship = containsAny(`${item.title || ''} ${item.description || ''}`, ['intern', 'internship', 'trainee']);

        return (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedJob(item)}>
                <View style={styles.cardTopRow}>
                    <View style={styles.companyMark}>
                        <Text style={styles.companyMarkText}>{String(item.company || 'A')[0]}</Text>
                    </View>
                    <View style={styles.cardTitleBlock}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.companyName} numberOfLines={1}>{item.company}</Text>
                        <Text style={styles.locationText} numberOfLines={1}>{item.location || 'Remote'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleSave(item.id)} disabled={savingId === item.id}>
                        {isSaved ? (
                            <BookmarkCheck size={18} color="#002147" strokeWidth={2.2} style={styles.bookmark} />
                        ) : (
                            <Bookmark size={18} color="#6B7280" strokeWidth={2.2} style={styles.bookmark} />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.metaRow}>
                    <Text style={styles.salaryChip}>{item.salary || 'Compensation not listed'}</Text>
                    <Text style={styles.typeChip}>{isInternship ? 'Internship' : 'Full-time'}</Text>
                    <Text style={styles.postedText}>Posted {postedAgo}</Text>
                </View>

                <View style={styles.posterRow}>
                    <View style={styles.posterAvatar}>
                        <Text style={styles.posterAvatarText}>{posterName[0] || 'A'}</Text>
                    </View>
                    <Text style={styles.posterLine}>Posted by <Text style={styles.posterName}>{posterName}</Text></Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Image source={require('../assets/mobiletext.png')} style={styles.brandImage} />
                <TouchableOpacity onPress={fetchJobs}>
                    <Bell size={18} color="#002147" strokeWidth={2.2} />
                </TouchableOpacity>
            </View>

            <View style={styles.pageHero}>
                <Text style={styles.pageTitle}>Jobs & Internships</Text>
                <Text style={styles.pageSubtitle}>Discover opportunities posted by alumni across industries.</Text>
            </View>

            <ScrollView
                horizontal
                style={styles.filterScroller}
                contentContainerStyle={styles.filterContent}
                showsHorizontalScrollIndicator={false}
            >
                {FILTERS.map((filter) => {
                    const active = activeFilter === filter;
                    return (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipInactive]}
                            onPress={() => {
                                setActiveFilter(filter);
                                setVisibleCount(8);
                            }}
                        >
                            <Text style={[styles.filterText, active ? styles.filterTextActive : styles.filterTextInactive]}>{filter}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {loading ? (
                <ActivityIndicator size="large" color={alumnyxTheme.colors.primary} style={{ marginTop: 28 }} />
            ) : (
                <FlatList
                    data={visibleJobs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderCard}
                    contentContainerStyle={styles.listContent}
                    ListFooterComponent={
                        filteredJobs.length > visibleCount ? (
                            <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setVisibleCount((v) => v + 6)}>
                                <Text style={styles.loadMoreText}>Load More Opportunities</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.endWrap}>
                                <Text style={styles.endText}>No more jobs or internships for this filter.</Text>
                            </View>
                        )
                    }
                />
            )}

            <Modal visible={!!selectedJob} animationType="slide" onRequestClose={() => setSelectedJob(null)}>
                <View style={styles.detailRoot}>
                    <View style={styles.detailHeader}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => setSelectedJob(null)}>
                            <ArrowLeft size={18} color="#002147" strokeWidth={2.2} />
                        </TouchableOpacity>
                        <View style={styles.detailHeaderRight}>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => shareJob(selectedJob)}>
                                <Share2 size={18} color="#002147" strokeWidth={2.2} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => selectedJob && toggleSave(selectedJob.id)}>
                                {selectedJob && savedJobIds.has(selectedJob.id)
                                    ? <BookmarkCheck size={18} color="#002147" strokeWidth={2.2} />
                                    : <Bookmark size={18} color="#6B7280" strokeWidth={2.2} />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={styles.detailBody} contentContainerStyle={styles.detailBodyContent}>
                        <View style={styles.heroRow}>
                            <View style={styles.heroLogo}>
                                <Text style={styles.heroLogoText}>{String(selectedJob?.company || 'A')[0]}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.heroTitle}>{selectedJob?.title}</Text>
                                <Text style={styles.heroCompany}>{selectedJob?.company}</Text>
                                <Text style={styles.heroMeta}>{selectedJob?.location || 'Remote'} • {containsAny(`${selectedJob?.title || ''} ${selectedJob?.description || ''}`, ['intern', 'internship']) ? 'Internship' : 'Full-time'}</Text>
                            </View>
                        </View>

                        <View style={styles.badgeGroup}>
                            <Text style={styles.detailSalary}>{selectedJob?.salary || 'Compensation not listed'}</Text>
                            <Text style={styles.detailBadge}>Benefits</Text>
                            <Text style={styles.detailBadge}>Alumni referral</Text>
                        </View>

                        <View style={styles.posterCard}>
                            <Text style={styles.posterCardHeading}>Posted by Alumni</Text>
                            <Text style={styles.posterCardText}>
                                {selectedJob?.poster?.profile?.firstName || 'Alumni'} {selectedJob?.poster?.profile?.lastName || ''}
                                {'\n'}Class of {selectedJob?.poster?.profile?.graduationYear || 'N/A'}
                            </Text>
                            <Text style={styles.posterQuote}>
                                "Happy to answer questions about this role and team culture."
                            </Text>
                        </View>

                        <Text style={styles.sectionTitle}>About the Role</Text>
                        <Text style={styles.sectionBody}>{selectedJob?.description || 'No description provided.'}</Text>

                        <Text style={styles.sectionTitle}>Requirements</Text>
                        <Text style={styles.sectionBody}>{selectedJob?.requirements || 'Not specified.'}</Text>

                        <Text style={styles.sectionTitle}>Responsibilities</Text>
                        <Text style={styles.sectionBody}>{selectedJob?.description || 'Responsibilities will be shared by the hiring alumni.'}</Text>
                    </ScrollView>

                    <View style={styles.applyBar}>
                        <TouchableOpacity
                            style={[styles.applyBtn, applying && { opacity: 0.6 }]}
                            onPress={() => selectedJob && applyForJob(selectedJob.id)}
                            disabled={applying}
                        >
                            <Text style={styles.applyBtnText}>{applying ? 'Applying...' : 'Apply via Network'}</Text>
                        </TouchableOpacity>
                        <Text style={styles.applyHint}>Your profile will be shared directly with the alumni poster.</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignSelf: 'center',
        width: '100%',
        maxWidth: Platform.OS === 'web' ? 500 : '100%',
        backgroundColor: '#FAF7F2',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        backgroundColor: '#FFFFFF',
    },
    brand: {
        fontSize: 30,
        color: '#002147',
        fontWeight: '800',
        fontFamily: 'serif',
    },
    brandImage: {
        width: 132,
        height: 28,
        resizeMode: 'contain',
    },
    notif: {
        fontSize: 18,
        color: '#002147',
    },
    filterScroller: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        flexGrow: 0,
        maxHeight: 56,
    },
    pageHero: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: '#FAF7F2',
    },
    pageTitle: {
        color: '#002147',
        fontFamily: 'serif',
        fontSize: 26,
        fontWeight: '700',
    },
    pageSubtitle: {
        color: '#737373',
        fontSize: 12,
        marginTop: 2,
    },
    filterContent: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
        alignItems: 'center',
    },
    filterChip: {
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 7,
        alignSelf: 'center',
        minHeight: 34,
        justifyContent: 'center',
    },
    filterChipActive: {
        backgroundColor: '#002147',
        borderColor: '#002147',
    },
    filterChipInactive: {
        backgroundColor: '#FFFFFF',
        borderColor: '#002147',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    filterTextInactive: {
        color: '#002147',
    },
    listContent: {
        padding: 14,
        paddingBottom: 100,
        gap: 10,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 14,
        borderWidth: 1,
        borderColor: 'transparent',
        shadowColor: '#002147',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    companyMark: {
        width: 48,
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        backgroundColor: '#FAF7F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    companyMarkText: {
        color: '#002147',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'serif',
    },
    cardTitleBlock: {
        flex: 1,
        minWidth: 0,
    },
    cardTitle: {
        color: '#002147',
        fontWeight: '700',
        fontSize: 21,
        fontFamily: 'serif',
    },
    companyName: {
        color: '#1A1A1A',
        fontSize: 14,
        marginTop: 2,
        fontWeight: '600',
    },
    locationText: {
        color: '#737373',
        fontSize: 12,
        marginTop: 2,
    },
    bookmark: {
        marginTop: 1,
    },
    bookmarkActive: {},
    metaRow: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    salaryChip: {
        backgroundColor: '#E8F5E9',
        color: '#1A1A1A',
        fontSize: 11,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 5,
        fontWeight: '600',
    },
    typeChip: {
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        color: '#737373',
        fontSize: 11,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 5,
        fontWeight: '600',
    },
    postedText: {
        color: '#737373',
        fontSize: 11,
        marginLeft: 'auto',
    },
    posterRow: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        paddingTop: 9,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    posterAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D4AF37',
        backgroundColor: '#EEF3FA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    posterAvatarText: {
        color: '#002147',
        fontSize: 11,
        fontWeight: '700',
    },
    posterLine: {
        fontSize: 11,
        color: '#1A1A1A',
    },
    posterName: {
        color: '#002147',
        fontWeight: '600',
    },
    loadMoreBtn: {
        borderWidth: 1,
        borderColor: '#002147',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        marginTop: 8,
    },
    loadMoreText: {
        color: '#002147',
        fontWeight: '600',
        fontSize: 14,
    },
    endWrap: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    endText: {
        color: '#737373',
        fontSize: 12,
    },
    detailRoot: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    detailHeaderRight: {
        flexDirection: 'row',
        gap: 8,
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAF7F2',
    },
    iconBtnText: {
        color: '#002147',
        fontSize: 16,
        fontWeight: '700',
    },
    detailBody: {
        flex: 1,
    },
    detailBodyContent: {
        padding: 16,
        paddingBottom: 120,
    },
    heroRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    heroLogo: {
        width: 62,
        height: 62,
        borderRadius: 8,
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroLogoText: {
        color: '#002147',
        fontSize: 22,
        fontWeight: '700',
        fontFamily: 'serif',
    },
    heroTitle: {
        color: '#002147',
        fontSize: 25,
        fontWeight: '700',
        fontFamily: 'serif',
    },
    heroCompany: {
        color: '#1A1A1A',
        marginTop: 3,
        fontSize: 16,
        fontWeight: '600',
    },
    heroMeta: {
        color: '#737373',
        marginTop: 3,
        fontSize: 13,
    },
    badgeGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    detailSalary: {
        backgroundColor: '#E8F5E9',
        color: '#1A1A1A',
        fontSize: 13,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        fontWeight: '700',
    },
    detailBadge: {
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        color: '#1A1A1A',
        fontSize: 13,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    posterCard: {
        backgroundColor: '#FAF7F2',
        borderWidth: 1,
        borderColor: '#D4AF37',
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
    },
    posterCardHeading: {
        color: '#737373',
        fontSize: 11,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    posterCardText: {
        color: '#1A1A1A',
        fontSize: 14,
        marginTop: 8,
        lineHeight: 20,
    },
    posterQuote: {
        marginTop: 10,
        color: '#1A1A1A',
        fontSize: 13,
        fontStyle: 'italic',
    },
    sectionTitle: {
        color: '#002147',
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'serif',
        marginBottom: 8,
        marginTop: 4,
    },
    sectionBody: {
        color: '#1A1A1A',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 16,
    },
    applyBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 22,
        shadowColor: '#002147',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 5,
    },
    applyBtn: {
        backgroundColor: '#D4AF37',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    applyBtnText: {
        color: '#002147',
        fontWeight: '800',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    applyHint: {
        color: '#737373',
        textAlign: 'center',
        fontSize: 11,
        marginTop: 6,
    },
});
