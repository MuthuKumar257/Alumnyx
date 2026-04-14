import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosClient from '../api/axiosClient';

interface User {
    id: string;
    email: string;
    role: string;
    isVerified: boolean;
    isSuperAdmin?: boolean;
    profile?: any;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (data: any, expectedRole?: string) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => { },
    register: async () => { },
    logout: async () => { },
    updateUser: async () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkUser = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                const response = await axiosClient.get('/auth/me');
                setUser(response.data);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.log('checkUser fail', error)
            setUser(null);
            await AsyncStorage.removeItem('token');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkUser();

        // Keep auth state in sync if token is removed outside explicit logout.
        const tokenCheckInterval = setInterval(async () => {
            const tk = await AsyncStorage.getItem('token');
            if (!tk) {
                setUser((prev) => (prev ? null : prev));
            }
        }, 3000);

        return () => clearInterval(tokenCheckInterval);
    }, []);

    const login = async (data: any, expectedRole?: string) => {
        try {
            const response = await axiosClient.post('/auth/login', data);
            const userData = response.data;
            if (expectedRole && userData.role !== expectedRole) {
                const roleName = expectedRole.charAt(0) + expectedRole.slice(1).toLowerCase();
                throw `No ${roleName} account found with these credentials. Please select the correct role.`;
            }
            await AsyncStorage.setItem('token', userData.token);
            setUser(userData);
        } catch (error: any) {
            if (typeof error === 'string') throw error;
            throw error.response?.data?.message || 'Login failed';
        }
    };

    const register = async (data: any) => {
        try {
            const response = await axiosClient.post('/auth/register', data);
            await AsyncStorage.setItem('token', response.data.token);
            setUser(response.data);
        } catch (error: any) {
            throw error.response?.data?.message || 'Registration failed';
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('token');
        setUser(null);
    };

    const updateUser = async () => {
        await checkUser();
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};
