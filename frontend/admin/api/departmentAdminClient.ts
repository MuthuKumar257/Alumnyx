import axiosClient from '../../api/axiosClient';

export const getDepartmentAdmins = async () => {
  const res = await axiosClient.get('/admin/departments-admins');
  return res.data;
};

export const assignDepartmentAdmin = async (department: string, adminId: string) => {
  const res = await axiosClient.post('/admin/departments/assign-admin', { department, adminId });
  return res.data;
};

export const deleteDepartment = async (department: string) => {
  const res = await axiosClient.delete('/admin/departments', { data: { department } });
  return res.data;
};

export const getUniversityConfig = async () => {
  const res = await axiosClient.get('/admin/university');
  return res.data;
};

export const updateUniversityConfig = async (universityName: string) => {
  const res = await axiosClient.put('/admin/university', { universityName });
  return res.data;
};
