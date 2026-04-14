import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const resolveApiUrl = () => {
    if (Platform.OS === 'web') {
        return 'http://localhost:5000/api';
    }

    // In Expo Go/dev builds on a physical device, localhost points to the phone.
    // Use the Metro host IP so native clients can reach the backend on the same LAN.
    const hostUri =
        Constants.expoConfig?.hostUri ||
        (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
        (Constants as any).manifest?.debuggerHost ||
        '';

    const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : '';
    if (host) {
        return `http://${host}:5000/api`;
    }

    // Android emulator fallback when host cannot be inferred.
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:5000/api';
    }

    // iOS simulator fallback.
    return 'http://localhost:5000/api';
};

const apiUrl = resolveApiUrl();

const axiosClient = axios.create({
    baseURL: apiUrl,
    timeout: 10000,
});

axiosClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Intercept 401 Unauthorized responses to auto-logout the user if their token expires
axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            // Wait for context to handle the missing token on re-render
            await AsyncStorage.removeItem('token');
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
