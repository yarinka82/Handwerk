import { prisma } from "../prisma";


export const findUserByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
    },
  });
  return user;
};
