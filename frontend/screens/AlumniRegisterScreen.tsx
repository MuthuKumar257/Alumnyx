import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import axiosClient from '../api/axiosClient';
import { alumnyxTheme } from '../theme/alumnyxTheme';

type Step = 'form' | 'success';

const CURRENT_YEAR = new Date().getFullYear();
const DEPARTMENTS = ['cse', 'it', 'ece', 'eee', 'mech', 'aids', 'csbs'];

export default function AlumniRegisterScreen({ navigation }: any) {
    const [step, setStep] = useState<Step>('form');
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        college: '',
        graduationYear: '',
        department: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');

    const err = (key: string) => errors[key] ? styles.inputError : undefined;
    const set = (key: string, value: string) => {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: '' }));
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.firstName.trim()) e.firstName = 'First name is required';
        if (!form.email.trim()) e.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
        if (!form.password) e.password = 'Password is required';
        else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
        if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
        if (!form.college.trim()) e.college = 'College is required';
        if (!form.graduationYear.trim()) e.graduationYear = 'Graduation year is required';
        else {
            const yr = parseInt(form.graduationYear, 10);
            if (isNaN(yr) || yr < 1950 || yr > CURRENT_YEAR + 6) e.graduationYear = 'Enter a valid graduation year';
        }
        if (!form.department.trim()) e.department = 'Department is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        setServerError('');
        try {
            await axiosClient.post('/auth/alumni/register', {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                password: form.password,
                college: form.college.trim(),
                graduationYear: form.graduationYear.trim(),
                department: form.department.trim(),
            });
            setStep('success');
        } catch (err: any) {
            setServerError(err?.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <View style={styles.successContainer}>
                <View style={styles.successCard}>
                    <Text style={styles.successIcon}>✅</Text>
                    <Text style={styles.successTitle}>Registration Submitted!</Text>
                    <Text style={styles.successBody}>
                        Your alumni account request has been submitted successfully.{'\n\n'}
                        Your account is currently <Text style={styles.bold}>pending admin approval</Text>. You will be able to log in once an administrator approves your account.
                    </Text>
                    <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginBtnTxt}>Go to Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
                <Text style={styles.title}>Alumni Registration</Text>
                <Text style={styles.subtitle}>Create your account. Access is granted after admin approval.</Text>
            </View>

            {serverError ? (
                <View style={styles.serverError}>
                    <Text style={styles.serverErrorTxt}>{serverError}</Text>
                </View>
            ) : null}

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Personal Details</Text>
                <View style={styles.row}>
                    <View style={styles.half}>
                        <Text style={styles.label}>First Name <Text style={styles.req}>*</Text></Text>
                        <TextInput
                            style={[styles.input, err('firstName')]}
                            placeholder="First name"
                            value={form.firstName}
                            onChangeText={(v) => set('firstName', v)}
                        />
                        {errors.firstName ? <Text style={styles.errorTxt}>{errors.firstName}</Text> : null}
                    </View>
                    <View style={styles.half}>
                        <Text style={styles.label}>Last Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Last name"
                            value={form.lastName}
                            onChangeText={(v) => set('lastName', v)}
                        />
                    </View>
                </View>

                <Text style={styles.label}>Email Address <Text style={styles.req}>*</Text></Text>
                <TextInput
                    style={[styles.input, err('email')]}
                    placeholder="your@email.com"
                    value={form.email}
                    onChangeText={(v) => set('email', v)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                {errors.email ? <Text style={styles.errorTxt}>{errors.email}</Text> : null}

                <View style={styles.row}>
                    <View style={styles.half}>
                        <Text style={styles.label}>Password <Text style={styles.req}>*</Text></Text>
                        <TextInput
                            style={[styles.input, err('password')]}
                            placeholder="Min. 6 characters"
                            value={form.password}
                            onChangeText={(v) => set('password', v)}
                            secureTextEntry
                        />
                        {errors.password ? <Text style={styles.errorTxt}>{errors.password}</Text> : null}
                    </View>
                    <View style={styles.half}>
                        <Text style={styles.label}>Confirm Password <Text style={styles.req}>*</Text></Text>
                        <TextInput
                            style={[styles.input, err('confirmPassword')]}
                            placeholder="Re-enter password"
                            value={form.confirmPassword}
                            onChangeText={(v) => set('confirmPassword', v)}
                            secureTextEntry
                        />
                        {errors.confirmPassword ? <Text style={styles.errorTxt}>{errors.confirmPassword}</Text> : null}
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Academic Details</Text>

                <Text style={styles.label}>College / University <Text style={styles.req}>*</Text></Text>
                <TextInput
                    style={[styles.input, err('college')]}
                    placeholder="e.g. University of Technology"
                    value={form.college}
                    onChangeText={(v) => set('college', v)}
                />
                {errors.college ? <Text style={styles.errorTxt}>{errors.college}</Text> : null}

                <View style={styles.row}>
                    <View style={styles.half}>
                        <Text style={styles.label}>Department <Text style={styles.req}>*</Text></Text>
                        <View style={[styles.departmentWrap, err('department')]}> 
                            {DEPARTMENTS.map((d) => (
                                <TouchableOpacity
                                    key={d}
                                    style={[styles.departmentChip, form.department === d && styles.departmentChipActive]}
                                    onPress={() => set('department', d)}
                                >
                                    <Text style={[styles.departmentChipText, form.department === d && styles.departmentChipTextActive]}>{d.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {errors.department ? <Text style={styles.errorTxt}>{errors.department}</Text> : null}
                    </View>
                    <View style={styles.half}>
                        <Text style={styles.label}>Graduation Year <Text style={styles.req}>*</Text></Text>
                        <TextInput
                            style={[styles.input, err('graduationYear')]}
                            placeholder={`e.g. ${CURRENT_YEAR}`}
                            value={form.graduationYear}
                            onChangeText={(v) => set('graduationYear', v)}
                            keyboardType="numeric"
                            maxLength={4}
                        />
                        {errors.graduationYear ? <Text style={styles.errorTxt}>{errors.graduationYear}</Text> : null}
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading
                    ? <ActivityIndicator color="#FFFFFF" />
                    : <Text style={styles.submitBtnTxt}>Submit Registration</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.backLinkTxt}>Already have an account? Log In</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: alumnyxTheme.colors.backgroundLight,
        flexGrow: 1,
        maxWidth: Platform.OS === 'web' ? 640 : '100%',
        width: '100%',
        alignSelf: 'center',
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: alumnyxTheme.colors.primary,
        fontFamily: alumnyxTheme.typography.heading,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: alumnyxTheme.colors.muted,
        textAlign: 'center',
    },
    serverError: {
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    serverErrorTxt: {
        color: '#DC2626',
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        backgroundColor: alumnyxTheme.colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
        ...alumnyxTheme.shadow.card,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: alumnyxTheme.colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 14,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    half: {
        flex: 1,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: alumnyxTheme.colors.textMain,
        marginBottom: 5,
        marginTop: 10,
    },
    req: {
        color: '#EF4444',
    },
    input: {
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: alumnyxTheme.colors.textMain,
        backgroundColor: alumnyxTheme.colors.surface,
    },
    inputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    departmentWrap: {
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
        borderRadius: 8,
        backgroundColor: alumnyxTheme.colors.surface,
        padding: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    departmentChip: {
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: alumnyxTheme.colors.surface,
    },
    departmentChipActive: {
        backgroundColor: alumnyxTheme.colors.primary,
        borderColor: alumnyxTheme.colors.primary,
    },
    departmentChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: alumnyxTheme.colors.textMain,
    },
    departmentChipTextActive: {
        color: '#FFFFFF',
    },
    errorTxt: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 3,
    },
    submitBtn: {
        backgroundColor: alumnyxTheme.colors.primary,
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    submitBtnDisabled: {
        backgroundColor: '#93C5FD',
    },
    submitBtnTxt: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    backLink: {
        marginTop: 16,
        alignItems: 'center',
    },
    backLinkTxt: {
        color: alumnyxTheme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    // Success screen
    successContainer: {
        flex: 1,
        backgroundColor: alumnyxTheme.colors.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    successCard: {
        backgroundColor: alumnyxTheme.colors.surface,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        maxWidth: 480,
        width: '100%',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    successIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: alumnyxTheme.colors.textMain,
        marginBottom: 12,
    },
    successBody: {
        fontSize: 15,
        color: alumnyxTheme.colors.muted,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    bold: {
        fontWeight: '700',
        color: alumnyxTheme.colors.textMain,
    },
    loginBtn: {
        backgroundColor: alumnyxTheme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
    },
    loginBtnTxt: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
});
