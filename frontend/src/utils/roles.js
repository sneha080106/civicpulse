// Mirrors backend/src/utils/roles.js. UI checks are for convenience only —
// the backend is what actually enforces access.
export const ROLES = {
  CITIZEN: 'citizen',
  OFFICER: 'officer',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const STAFF_ROLES = [ROLES.OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN];
export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

export const ROLE_LABELS = {
  citizen: 'Citizen',
  officer: 'Officer',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export const roleLabel = (role) => ROLE_LABELS[role] || role;
export const isStaffRole = (role) => STAFF_ROLES.includes(role);
