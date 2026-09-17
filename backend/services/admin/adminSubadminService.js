/**
 * FSO Admin Subadmin Service — Neon PostgreSQL via Prisma
 * Strictly adheres to Gate 2: No role != CUSTOMER subadmin assumption.
 * Explicitly manages operational subadmins: VENDOR_ONBOARDER, BLOG_CREATOR.
 */

const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');

const ALLOWED_SUBADMIN_ROLES = ['VENDOR_ONBOARDER', 'BLOG_CREATOR'];

/**
 * List operational subadmins (strictly VENDOR_ONBOARDER and BLOG_CREATOR).
 */
const listSubadmins = async () => {
  const subadmins = await prisma.user.findMany({
    where: {
      role: { in: ALLOWED_SUBADMIN_ROLES },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      lastLogin: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return subadmins.map((u) => ({
    ...u,
    _id: u.id,
    role: u.role.toLowerCase(),
  }));
};

/**
 * Create an operational subadmin account.
 */
const createSubadmin = async ({ name, email, password, role }) => {
  if (!name || !email || !password || !role) {
    throw new Error('All fields are required');
  }

  const upperRole = role.toUpperCase().trim();
  if (!ALLOWED_SUBADMIN_ROLES.includes(upperRole)) {
    throw new Error(`Invalid subadmin role specified. Allowed: ${ALLOWED_SUBADMIN_ROLES.map((r) => r.toLowerCase()).join(', ')}`);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const userExists = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (userExists) {
    throw new Error('User already exists with this email');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const subadmin = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: upperRole,
      isEmailVerified: true,
      isAdmin: false,
    },
  });

  return {
    _id: subadmin.id,
    id: subadmin.id,
    name: subadmin.name,
    email: subadmin.email,
    role: subadmin.role.toLowerCase(),
  };
};

/**
 * Reset password for a subadmin account.
 */
const resetSubadminPassword = async (id, newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return { notFound: true };
  }

  if (!ALLOWED_SUBADMIN_ROLES.includes(user.role)) {
    throw new Error('Can only reset password for sub-admins (vendor_onboarder, blog_creator)');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  return { success: true };
};

/**
 * Delete a subadmin account.
 */
const deleteSubadmin = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return { notFound: true };
  }

  if (!ALLOWED_SUBADMIN_ROLES.includes(user.role)) {
    throw new Error('Can only delete operational sub-admins');
  }

  await prisma.user.delete({ where: { id } });
  return { success: true };
};

module.exports = {
  listSubadmins,
  createSubadmin,
  resetSubadminPassword,
  deleteSubadmin,
};
