import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Alert, Image } from 'react-native';
import { GraduationCap, Landmark } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';

type Role = 'ADMIN' | 'STUDENT' | 'ALUMNI';

const ROLES: { key: Role; label: string; icon: LucideIcon }[] = [
    { key: 'STUDENT', label: 'Student', icon: GraduationCap },
    { key: 'ALUMNI',  label: 'Alumni',  icon: Landmark },
];

export default function LoginScreen({ navigation, route }: any) {
    const { login } = useContext(AuthContext);
    const adminOnly = !!route?.params?.adminOnly;
    const [role, setRole] = useState<Role>(adminOnly ? 'ADMIN' : 'STUDENT');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setError('');
        if (!username.trim() || !password) {
            setError('Please enter your username and password.');
            return;
        }
        setLoading(true);
        try {
            const expectedRole = adminOnly ? 'ADMIN' : role;
            await login({ email: username.trim(), password }, expectedRole);
        } catch (err: any) {
            setError(typeof err === 'string' ? err : 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();
    const emailRaised = emailFocused || !!username.trim();
    const passwordRaised = passwordFocused || !!password;

    return (
        <View style={styles.page}>
            <View style={styles.bgGlow} />

            <View style={styles.hero}>
                <View style={styles.crest}>
                    <Image source={require('../assets/icon.png')} style={styles.logoImage} />
                </View>
                <Image source={require('../assets/mobiletext.png')} style={styles.wordmarkImage} />
                <Text style={styles.tagline}>THE HERITAGE NETWORK</Text>
            </View>

            <View style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>{adminOnly ? 'Admin Access' : 'Secure Access'}</Text>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorTxt}>{error}</Text>
                    </View>
                ) : null}

                {!adminOnly && (
                    <View style={styles.roleRow}>
                        {ROLES.map(({ key, label, icon: Icon }) => (
                            <TouchableOpacity
                                key={key}
                                style={[styles.roleChip, role === key && styles.roleChipActive]}
                                onPress={() => { setRole(key); setError(''); }}
                            >
                                <Icon size={16} color={role === key ? '#002147' : '#6B7280'} strokeWidth={2.2} style={styles.roleIcon} />
                                <Text style={[styles.roleLabel, role === key && styles.roleLabelActive]}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.inputWrap}>
                    <TextInput
                        style={[styles.input, emailFocused && styles.inputFocused]}
                        value={username}
                        onChangeText={(v) => { setUsername(v); setError(''); }}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                    />
                    <Text style={[styles.floatingLabel, emailRaised && styles.floatingLabelRaised]}>Email Address</Text>
                </View>

                <View style={styles.inputWrap}>
                    <TextInput
                        style={[styles.input, styles.passwordInput, passwordFocused && styles.inputFocused]}
                        value={password}
                        onChangeText={(v) => { setPassword(v); setError(''); }}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        secureTextEntry={!showPassword}
                    />
                    <Text style={[styles.floatingLabel, passwordRaised && styles.floatingLabelRaised]}>Password</Text>
                    <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword((v) => !v)}>
                        <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.forgotWrap}>
                    <TouchableOpacity onPress={() => Alert.alert('Password Reset', 'Please contact your department admin to reset your password.')}>
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#FFF" />
                        : <Text style={styles.buttonText}>{adminOnly ? 'Enter Admin Panel' : `Enter Network (${roleLabel})`}</Text>}
                </TouchableOpacity>

                {!adminOnly && (
                    <View style={styles.requestAccessWrap}>
                        <Text style={styles.requestAccessText}>Not a member?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AlumniRegister')}>
                            <Text style={styles.requestAccessLink}>Request Access</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#002147',
        overflow: 'hidden',
        maxWidth: Platform.OS === 'web' ? 480 : '100%',
        width: '100%',
        alignSelf: 'center',
    },
    bgGlow: {
        position: 'absolute',
        top: -140,
        left: -40,
        width: 560,
        height: 560,
        borderRadius: 280,
        backgroundColor: '#D4AF37',
        opacity: 0.12,
    },
    hero: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: 30,
        paddingBottom: 120,
    },
    crest: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: '#D4AF37',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
        backgroundColor: '#002147',
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 3,
    },
    logoImage: {
        width: 36,
        height: 36,
        borderRadius: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        fontFamily: 'serif',
        textAlign: 'center',
        letterSpacing: 0.4,
    },
    wordmarkImage: {
        width: 220,
        height: 42,
        resizeMode: 'contain',
    },
    tagline: {
        marginTop: 6,
        fontSize: 11,
        color: '#D4AF37',
        opacity: 0.88,
        letterSpacing: 2,
        fontWeight: '600',
        textAlign: 'center',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        paddingHorizontal: 22,
        paddingTop: 24,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: 'rgba(212,175,55,0.25)',
        shadowColor: '#002147',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
        marginTop: 'auto',
    },
    handle: {
        width: 48,
        height: 6,
        borderRadius: 999,
        backgroundColor: '#E5E5E5',
        alignSelf: 'center',
        marginBottom: 10,
    },
    sheetTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 16,
        fontFamily: 'serif',
    },
    roleRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    roleChip: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    roleChipActive: {
        borderColor: '#002147',
        backgroundColor: '#F6F8FB',
    },
    roleIcon: {
        marginBottom: 1,
    },
    roleLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#737373',
    },
    roleLabelActive: {
        color: '#002147',
    },
    inputWrap: {
        position: 'relative',
        marginBottom: 10,
    },
    input: {
        height: 56,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingTop: 16,
        paddingBottom: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        fontSize: 15,
        color: '#1A1A1A',
    },
    passwordInput: {
        paddingRight: 64,
    },
    inputFocused: {
        borderColor: '#002147',
    },
    floatingLabel: {
        position: 'absolute',
        left: 14,
        top: 18,
        color: '#737373',
        fontSize: 15,
    },
    floatingLabelRaised: {
        top: -7,
        fontSize: 12,
        color: '#002147',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 4,
    },
    passwordToggle: {
        position: 'absolute',
        right: 12,
        top: 16,
        padding: 2,
    },
    passwordToggleText: {
        color: '#737373',
        fontSize: 12,
        fontWeight: '600',
    },
    forgotWrap: {
        alignItems: 'flex-end',
        marginTop: 2,
        marginBottom: 14,
    },
    forgotText: {
        color: '#737373',
        fontSize: 13,
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#002147',
        height: 56,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    requestAccessWrap: {
        marginTop: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    requestAccessText: {
        color: '#737373',
        fontSize: 13,
    },
    requestAccessLink: {
        color: '#D4AF37',
        fontWeight: '700',
        fontSize: 13,
    },
    errorBox: {
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    errorTxt: {
        color: '#B42318',
        fontSize: 13,
        textAlign: 'center',
    },
});
