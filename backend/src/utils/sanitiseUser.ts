import { User } from "@prisma/client";

export const sanitizeUser = (user: User) => {
  if (!user) return null;
  const { password: _password, ...sanitized } = user;

  return sanitized;

}
