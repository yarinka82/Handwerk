import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import { redisConnection } from '../utils/redis';
import { prisma } from '../prisma';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.cookies;
    const authHeader = req.get('Authorization');

    if (!authHeader) {
      next(createHttpError(401, 'Please provide Authorization header'));
      return;
    }

    const [bearer, token] = authHeader.split(' ', 2);

    if (
      (bearer && bearer.toLowerCase() !== 'bearer') ||
      typeof token !== 'string'
    ) {
      next(
        createHttpError(401, "Authorization header should be of type Bearer'"),
      );
      return;
    }

    const rawSession = await redisConnection.get(`session:${sessionId}`);

    if (!rawSession) {
      next(createHttpError(401, 'Session not found'));
      return;
    }

    const session = JSON.parse(rawSession);

    if (session.accessToken !== token) {
      next(createHttpError(401, 'Invalid access token'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.userId,
      },
    });

    if (!user) {
      next(createHttpError(401, 'User not found'));
      return;
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error(error);
  }
  next();
};
