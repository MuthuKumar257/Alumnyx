import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const PRODUCTION_API_URL = 'https://api-alumnyx.onrender.com';

const ensureApiPath = (baseUrl: string) => {
    const trimmed = baseUrl.trim().replace(/\/+$/, '');
    return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
};

const resolveApiUrl = () => {
    // Environment-level override remains available for local testing.
    const configuredBaseUrl =
        process.env.EXPO_PUBLIC_API_BASE_URL ||
        Constants.expoConfig?.extra?.apiBaseUrl ||
        (Constants as any).manifest2?.extra?.apiBaseUrl ||
        (Constants as any).manifest?.extra?.apiBaseUrl;

    if (typeof configuredBaseUrl === 'string' && configuredBaseUrl.trim()) {
        return ensureApiPath(configuredBaseUrl);
    }

    return ensureApiPath(PRODUCTION_API_URL);
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
