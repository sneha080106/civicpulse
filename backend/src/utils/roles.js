// Single source of truth for roles. Import from here instead of typing role
// strings around the codebase.
//
//   citizen      - public user; can submit requests
//   officer      - government staff; can view/review submitted requests
//   admin        - officer powers + can trigger priority recalculation
//   super_admin  - admin powers + manages officer/admin accounts
const ROLES = {
  CITIZEN: 'citizen',
  OFFICER: 'officer',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

const ALL_ROLES = Object.values(ROLES);
const STAFF_ROLES = [ROLES.OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN];
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

// Roles a super-admin may assign through the API. super_admin itself can only
// be created with the seed script, so it can never be granted over HTTP.
const ASSIGNABLE_ROLES = [ROLES.CITIZEN, ROLES.OFFICER, ROLES.ADMIN];

module.exports = { ROLES, ALL_ROLES, STAFF_ROLES, ADMIN_ROLES, ASSIGNABLE_ROLES };
