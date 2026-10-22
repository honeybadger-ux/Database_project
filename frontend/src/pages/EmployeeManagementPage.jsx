import React, { useState, useEffect } from 'react';
import { adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import {
  Users,
  PlusCircle,
  Edit2,
  RefreshCw,
  AlertCircle,
  Building,
  Mail,
  Phone,
  Shield,
  Filter,
  Search,
  Lock,
} from 'lucide-react';

const ALL_ROLES = [
  { value: 'HUB_MANAGER', label: 'Hub Manager' },
  { value: 'CLERK', label: 'Front-Desk Clerk' },
  { value: 'COURIER', label: 'Last-Mile Courier' },
  { value: 'DRIVER', label: 'Linehaul Fleet Driver' },
  { value: 'WAREHOUSE_STAFF', label: 'Warehouse Staff' },
];

export const EmployeeManagementPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCourierAdmin = user?.role === 'COURIER_ADMIN';
  const isHubManager = user?.role === 'HUB_MANAGER';
  const isExecutive = isSuperAdmin || isCourierAdmin;
  const canFilterHubs = isExecutive || isHubManager;

  const availableRoles = isSuperAdmin
    ? [{ value: 'COURIER_ADMIN', label: 'Courier Partner Admin' }, ...ALL_ROLES]
    : isCourierAdmin
    ? ALL_ROLES
    : ALL_ROLES.filter((r) => r.value !== 'HUB_MANAGER');

  const [employees, setEmployees] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [hubFilter, setHubFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    hub_id: '1',
    full_name: '',
    email: '',
    phone: '',
    role: 'CLERK',
    password: '',
    is_active: true,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, hubsRes] = await Promise.all([
        adminService.getEmployees({ limit: 100 }).catch(() => ({ data: [] })),
        adminService.getHubs().catch(() => ({ data: [] })),
      ]);

      const empList = Array.isArray(empRes.data)
        ? empRes.data
        : empRes.data?.employees || [];
      const hubList = Array.isArray(hubsRes.data)
        ? hubsRes.data
        : hubsRes.data?.hubs || [];

      setEmployees(empList);
      setHubs(hubList);
      if (hubList.length > 0 && !formData.hub_id) {
        setFormData((prev) => ({ ...prev, hub_id: String(hubList[0].hub_id) }));
      }
    } catch (err) {
      console.error('Failed to load employee personnel:', err);
      setError('Unable to load employee workforce roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingEmployee(null);
    const defaultHubId = isExecutive
      ? (hubs[0]?.hub_id ? String(hubs[0].hub_id) : '1')
      : String(user?.hub_id || '1');
    setFormData({
      hub_id: defaultHubId,
      full_name: '',
      email: '',
      phone: '',
      role: 'CLERK',
      password: '',
      is_active: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      hub_id: String(emp.hub_id || (hubs[0]?.hub_id || '1')),
      full_name: emp.full_name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      role: emp.role || 'CLERK',
      password: '',
      is_active: emp.is_active ?? true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        hub_id: parseInt(formData.hub_id, 10),
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        is_active: formData.is_active,
      };

      if (!editingEmployee && !formData.password) {
        setFormError('Password is required for new employee account creation.');
        setModalSubmitting(false);
        return;
      }

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingEmployee) {
        const empId = editingEmployee.employee_id || editingEmployee.id;
        const isEditingSelf = empId === user?.employee_id;
        const isEditingRoot = empId === 1;
        if (isEditingSelf || isEditingRoot) {
          payload.is_active = true;
          payload.role = editingEmployee.role;
        }
        await adminService.updateEmployee(empId, payload);
      } else {
        await adminService.createEmployee(payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save employee:', err);
      setFormError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'Failed to commit employee changes.'
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  const toggleEmployeeActive = async (emp) => {
    const empId = emp.employee_id || emp.id;
    if (empId === user?.employee_id) {
      setError('Security Action Prohibited: You cannot deactivate your own account.');
      return;
    }
    if (empId === 1) {
      setError('Security Action Prohibited: The Root Administrator account cannot be deactivated.');
      return;
    }
    try {
      await adminService.updateEmployee(empId, {
        ...emp,
        is_active: !emp.is_active,
      });
      await loadData();
    } catch (err) {
      console.error('Failed to toggle employee status:', err);
      setError('Could not update employee status.');
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      !searchQuery.trim() ||
      emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone?.includes(searchQuery);

    const matchesRole = !roleFilter || emp.role === roleFilter;
    const matchesHub = !hubFilter || String(emp.hub_id) === String(hubFilter);

    return matchesSearch && matchesRole && matchesHub;
  });

  const totalEmployees = filteredEmployees.length;
  const paginatedEmployees = filteredEmployees.slice((page - 1) * pageSize, page * pageSize);

  const editingEmpId = editingEmployee?.employee_id || editingEmployee?.id;
  const isEditingSelf = Boolean(editingEmployee && editingEmpId === user?.employee_id);
  const isEditingRoot = Boolean(editingEmployee && editingEmpId === 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Workforce & Roles</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {totalEmployees} Staff
            </span>
            {!isExecutive && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                Jurisdiction: {user?.hub_name || `Hub #${user?.hub_id}`}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Provision staff profiles, assign operational roles, and manage hub facility allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh employees"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by full name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Hub filter for managers & executives */}
          {canFilterHubs ? (
            <select
              value={hubFilter}
              onChange={(e) => {
                setHubFilter(e.target.value);
                setPage(1);
              }}
              className="py-2 px-3 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700 w-full md:w-44"
            >
              <option value="">All Hubs</option>
              {hubs.map((h) => (
                <option key={h.hub_id} value={h.hub_id}>
                  {h.hub_name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1.5 py-2 px-3 text-xs sm:text-sm border border-slate-200 bg-slate-50 text-slate-700 font-bold rounded-xl whitespace-nowrap">
              <Building className="w-3.5 h-3.5 text-indigo-600" />
              <span>{user?.hub_name || `Hub #${user?.hub_id}`}</span>
            </div>
          )}

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700 w-full md:w-44"
          >
            <option value="">All Roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {(searchQuery || roleFilter || hubFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('');
                setHubFilter('');
                setPage(1);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm flex items-center gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner size="lg" message="Loading workforce personnel..." />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
            <h3 className="text-base font-bold text-slate-800">No employees found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              No staff members match the selected hub or role filter.
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Employee
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Assigned Hub</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedEmployees.map((emp) => {
                  const empId = emp.employee_id || emp.id;
                  const isActive = emp.is_active ?? true;
                  const hubObj = hubs.find((h) => String(h.hub_id) === String(emp.hub_id));
                  const hubDisplay = emp.hub_name || hubObj?.hub_name || `Hub #${emp.hub_id}`;

                  const isSelf = empId === user?.employee_id;
                  const isRoot = emp.role === 'SUPER_ADMIN' || empId === 1;
                  const canEditEmp =
                    isSuperAdmin ||
                    (isCourierAdmin && emp.role !== 'COURIER_ADMIN' && emp.role !== 'SUPER_ADMIN') ||
                    (isHubManager && emp.role !== 'HUB_MANAGER' && emp.hub_id === user?.hub_id);
                  const canToggleActive = canEditEmp && !isSelf && !isRoot;

                  return (
                    <tr key={empId} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {emp.full_name ? emp.full_name.charAt(0).toUpperCase() : 'E'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{emp.full_name}</div>
                            <div className="text-[11px] text-slate-400 font-normal font-mono">
                              {emp.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={emp.role} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          <span className="font-semibold text-slate-800">{hubDisplay}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-mono whitespace-nowrap">
                        {emp.phone || 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {canToggleActive ? (
                          <button
                            type="button"
                            onClick={() => toggleEmployeeActive(emp)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Click to toggle account authorization"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {isActive ? 'Active' : 'Inactive'}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            } ${isSelf || isRoot ? 'cursor-default' : ''}`}
                            title={
                              isSelf
                                ? 'Your account is protected from self-deactivation'
                                : isRoot
                                ? 'Root Administrator cannot be deactivated'
                                : undefined
                            }
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {isActive ? 'Active' : 'Inactive'}
                            {(isSelf || isRoot) && (
                              <Lock className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
                            )}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canEditEmp ? (
                          <button
                            onClick={() => openEditModal(emp)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-200 cursor-default"
                            title="Protected Tier (Equal or higher organizational authority)"
                          >
                            <Lock className="w-3 h-3 text-slate-400" /> Protected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(totalEmployees / pageSize))}
          onPageChange={(newPage) => setPage(newPage)}
          totalItems={totalEmployees}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[15, 25, 50, 100]}
          itemLabel="staff members"
        />
      </div>

      {/* Add / Edit Employee Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEmployee ? `Edit Employee: ${editingEmployee.full_name}` : 'Provision New Staff Account'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleFormChange}
              placeholder="e.g. Ramesh Chandra"
              required
              className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="ramesh@courier.com"
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                placeholder="9800000099"
                required
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Role Assignment *
              </label>
              {isEditingSelf || isEditingRoot ? (
                <div className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-slate-100 text-slate-700 font-bold flex items-center justify-between">
                  <span>
                    {availableRoles.find((r) => r.value === formData.role)?.label ||
                      ALL_ROLES.find((r) => r.value === formData.role)?.label ||
                      formData.role}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Locked
                  </span>
                </div>
              ) : (
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                  required
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  {availableRoles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}
              {(isEditingSelf || isEditingRoot) && (
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  Administrative authority tier is locked to prevent accidental lockout.
                </p>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Hub *
              </label>
              {isExecutive ? (
                <select
                  name="hub_id"
                  value={formData.hub_id}
                  onChange={handleFormChange}
                  required
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  {hubs.map((h) => (
                    <option key={h.hub_id} value={h.hub_id}>
                      {h.hub_name} ({h.city})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-slate-100 text-slate-700 font-bold flex items-center justify-between">
                  <span>{user?.hub_name || `Hub #${user?.hub_id}`}</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Assigned Hub</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password {editingEmployee ? '(Leave blank to keep current)' : '*'}
            </label>
            <div className="relative">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleFormChange}
                placeholder={editingEmployee ? '••••••••••••' : 'Enter account password'}
                required={!editingEmployee}
                className="w-full py-2.5 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="empActiveCheck"
                name="is_active"
                checked={isEditingSelf || isEditingRoot ? true : formData.is_active}
                disabled={isEditingSelf || isEditingRoot}
                onChange={handleFormChange}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 disabled:opacity-60"
              />
              <label htmlFor="empActiveCheck" className="font-bold text-slate-700">
                Account is Active and authorized to login
              </label>
            </div>
            {(isEditingSelf || isEditingRoot) && (
              <p className="text-[11px] text-amber-600 font-semibold mt-1.5 flex items-center gap-1.5 pl-6">
                <Shield className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>
                  {isEditingRoot
                    ? 'Root Administrator account is permanently active and cannot be deactivated.'
                    : 'You cannot deactivate your own account.'}
                </span>
              </p>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm disabled:opacity-50"
            >
              {modalSubmitting ? 'Saving...' : editingEmployee ? 'Update Account' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeeManagementPage;
