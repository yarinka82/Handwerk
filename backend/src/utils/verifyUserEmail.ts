import { prisma } from "../prisma";


export const verifyUserEmail = async (userId: number) => {
  await prisma.user.updateMany({
    where: {
      id: userId,
      emailVerifiedAt: null,
    },
    data: {
      emailVerifiedAt: new Date(),
    },
  });
};
