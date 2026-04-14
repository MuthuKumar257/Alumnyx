import React, { useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import AdminLayout from '../admin/AdminLayout';

export default function AdminPanelScreen() {
    const { user, logout } = useContext(AuthContext);
    // DEBUG: Log user object to console
    if (typeof window !== 'undefined') {
        console.log('AdminPanelScreen user:', user);
    }
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    useEffect(() => {
        if (!user || user.role !== 'ADMIN') {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.history.replaceState({}, '', '/login');
            }
            navigation.replace('Login');
        }
    }, [user]);

    if (!user || user.role !== 'ADMIN') return null;

    return (
        <AdminLayout
            initialSection={route?.params?.section}
            currentUser={user}
            onLogout={async () => {
                await logout();
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.history.replaceState({}, '', '/login');
                }
                navigation.replace('Login');
            }}
        />
    );
}
