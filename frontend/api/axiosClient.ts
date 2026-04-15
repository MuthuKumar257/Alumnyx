import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const PRODUCTION_API_URL = 'https://alumnyx.onrender.com';

const resolveApiUrl = () => {
    // Keep an escape hatch for local testing via Expo extra if needed.
    const configuredBaseUrl =
        Constants.expoConfig?.extra?.apiBaseUrl ||
        (Constants as any).manifest2?.extra?.apiBaseUrl ||
        (Constants as any).manifest?.extra?.apiBaseUrl;

    if (typeof configuredBaseUrl === 'string' && configuredBaseUrl.trim()) {
        return configuredBaseUrl;
    }

    return PRODUCTION_API_URL;
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
