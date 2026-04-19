import { adminDelete, adminGet, adminPost, adminPut } from './adminHttp';

export const getDepartmentAdmins = async () => {
  const res = await adminGet('/admin/departments-admins');
  return res.data;
};

export const assignDepartmentAdmin = async (department: string, adminId: string) => {
  const res = await adminPost('/admin/departments/assign-admin', { department, adminId });
  return res.data;
};

export const deleteDepartment = async (department: string) => {
  const res = await adminDelete('/admin/departments', { department }, '/admin/departments/delete');
  return res.data;
};

export const getUniversityConfig = async () => {
  const res = await adminGet('/admin/university');
  return res.data;
};

export const updateUniversityConfig = async (universityName: string) => {
  const res = await adminPut('/admin/university', { universityName }, '/admin/university/update');
  return res.data;
};
