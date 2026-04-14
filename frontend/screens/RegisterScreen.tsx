import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform, Image } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { alumnyxTheme } from '../theme/alumnyxTheme';

export default function RegisterScreen({ navigation }: any) {
    const { register } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        college: '',
        graduationYear: '',
        role: 'STUDENT',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleRegister = async () => {
        const { email, password, firstName, lastName } = formData;
        if (!email || !password || !firstName || !lastName) {
            Alert.alert('Error', 'Please fill in the required fields');
            return;
        }
        setLoading(true);
        try {
            await register(formData);
        } catch (error: any) {
            Alert.alert('Registration Failed', error.toString());
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Image source={require('../assets/mobiletext.png')} style={styles.titleImage} />
            <Text style={styles.subtitle}>Join Network</Text>

            <View style={styles.roleContainer}>
                <TouchableOpacity
                    style={[styles.roleButton, formData.role === 'STUDENT' && styles.roleActive]}
                    onPress={() => handleChange('role', 'STUDENT')}
                >
                    <Text style={[styles.roleText, formData.role === 'STUDENT' && styles.roleTextActive]}>Student</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.roleButton, formData.role === 'ALUMNI' && styles.roleActive]}
                    onPress={() => handleChange('role', 'ALUMNI')}
                >
                    <Text style={[styles.roleText, formData.role === 'ALUMNI' && styles.roleTextActive]}>Alumni</Text>
                </TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="First Name *" value={formData.firstName} onChangeText={(val) => handleChange('firstName', val)} />
            <TextInput style={styles.input} placeholder="Last Name *" value={formData.lastName} onChangeText={(val) => handleChange('lastName', val)} />
            <TextInput style={styles.input} placeholder="Email Address *" value={formData.email} onChangeText={(val) => handleChange('email', val)} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Password *" value={formData.password} onChangeText={(val) => handleChange('password', val)} secureTextEntry />
            <TextInput style={styles.input} placeholder="College" value={formData.college} onChangeText={(val) => handleChange('college', val)} />
            <TextInput style={styles.input} placeholder="Graduation Year (e.g., 2024)" value={formData.graduationYear} onChangeText={(val) => handleChange('graduationYear', val)} keyboardType="numeric" />

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Signing up...' : 'Sign Up'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkContainer} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Already have an account? Log In</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: alumnyxTheme.colors.backgroundLight,
        flexGrow: 1,
        justifyContent: 'center',
        maxWidth: Platform.OS === 'web' ? 400 : '100%',
        width: '100%',
        alignSelf: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: alumnyxTheme.colors.primary,
        fontFamily: alumnyxTheme.typography.heading,
        marginBottom: 20,
        textAlign: 'center',
    },
    titleImage: {
        width: 180,
        height: 36,
        resizeMode: 'contain',
        alignSelf: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '700',
        color: alumnyxTheme.colors.primary,
        textAlign: 'center',
        marginBottom: 16,
    },
    roleContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        justifyContent: 'space-between',
    },
    roleButton: {
        flex: 1,
        padding: 10,
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.primary,
        alignItems: 'center',
        marginHorizontal: 5,
        borderRadius: 8,
        backgroundColor: alumnyxTheme.colors.surface,
    },
    roleActive: {
        backgroundColor: alumnyxTheme.colors.primary,
    },
    roleText: {
        color: alumnyxTheme.colors.primary,
        fontWeight: 'bold',
    },
    roleTextActive: {
        color: '#FFF',
    },
    input: {
        backgroundColor: alumnyxTheme.colors.surface,
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: alumnyxTheme.colors.border,
    },
    button: {
        backgroundColor: alumnyxTheme.colors.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    linkContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: alumnyxTheme.colors.primary,
        fontSize: 14,
    },
});
