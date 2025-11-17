export const ADMIN_COOKIE_NAME = "adminAuth";

export function getAdminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  };
}

