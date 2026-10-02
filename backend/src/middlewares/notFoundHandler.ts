import { NextFunction } from 'express';
import createHttpError from 'http-errors';

export const notFoundHandler = async (next: NextFunction) => {
  next(createHttpError(404, 'Route not found'));
};
