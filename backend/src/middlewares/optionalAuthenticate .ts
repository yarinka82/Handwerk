import { Request, Response, NextFunction } from 'express';
import { redisConnection } from '../utils/redis';
import { prisma } from '../prisma';

export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.cookies;
    const AuthHeader = req.get('Authorization');

    if (AuthHeader && AuthHeader.startsWith('Bearer')) {
      const token = AuthHeader.split(' ')[1];

      const rawSession = await redisConnection.get(`session:${sessionId}`);

      if (rawSession) {
        const session = await JSON.parse(rawSession);
        if (token === session.accessToken) {
          const user = await prisma.user.findUnique({
            where: {
              id: session.userId,
            },
          });
          if (user) {
            req.user = user;
            return next();
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
  }

  next();
};
