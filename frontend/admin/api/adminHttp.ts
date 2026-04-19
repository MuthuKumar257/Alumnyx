import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axiosClient from '../../api/axiosClient';

const isWeb = Platform.OS === 'web';

const addTokenToUrl = (url: string, token: string) => {
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
};

const toFormBody = (data: Record<string, any>) =>
  new URLSearchParams(
    Object.entries(data || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

export const adminGet = async (url: string) => {
  if (!isWeb) return axiosClient.get(url);
  const token = (await AsyncStorage.getItem('token')) || '';
  const urlWithToken = addTokenToUrl(url, token);
  return axiosClient.get(urlWithToken, { skipAuth: true } as any);
};

export const adminPost = async (url: string, data: any = {}) => {
  if (!isWeb) return axiosClient.post(url, data);

  const token = (await AsyncStorage.getItem('token')) || '';

  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    if (token) data.append('token', token);
    return axiosClient.post(url, data, { skipAuth: true } as any);
  }

  const formBody = toFormBody({ ...(data || {}), token });
  return axiosClient.post(url, formBody, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    skipAuth: true,
  } as any);
};

export const adminPut = async (url: string, data: any = {}, webPostAlias?: string) => {
  if (!isWeb) return axiosClient.put(url, data);
  return adminPost(webPostAlias || url, data);
};

export const adminDelete = async (url: string, data: any = {}, webPostAlias?: string) => {
  if (!isWeb) return axiosClient.delete(url, { data });
  return adminPost(webPostAlias || `${url}/delete`, data);
};
