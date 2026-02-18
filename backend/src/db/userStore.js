const { randomUUID } = require("crypto");
const { ROLES } = require("../config/roles");

const usersById = new Map();
const usersByEmail = new Map();

function toUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    restaurantId: user.restaurantId,
    name: user.name,
    phone: user.phone || null
  };
}

async function createUser({ email, password, role = ROLES.VIEWER, restaurantId, name, phone }) {
  if (usersByEmail.has(email)) {
    return null;
  }

  const user = {
    id: randomUUID(),
    email,
    password,
    role,
    restaurantId,
    name,
    phone: phone || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  usersById.set(user.id, user);
  usersByEmail.set(user.email, user);
  return user;
}

async function findByEmail(email) {
  return usersByEmail.get(email) || null;
}

async function findById(id) {
  return usersById.get(id) || null;
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  toUserResponse
};
