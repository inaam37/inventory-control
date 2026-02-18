const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  VIEWER: "VIEWER"
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ["*"],
  [ROLES.MANAGER]: [
    "items:read",
    "items:write",
    "users:read",
    "users:write",
    "overview:read"
  ],
  [ROLES.STAFF]: ["items:read", "items:write", "overview:read"],
  [ROLES.VIEWER]: ["items:read", "overview:read"]
};

function hasPermission(role, permission) {
  if (!role || !permission) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes("*") || permissions.includes(permission);
}

module.exports = {
  ROLES,
  ROLE_PERMISSIONS,
  hasPermission
};
