import createHttpError from 'http-errors';

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateBody =
  (schema: Joi.ObjectSchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next(
        createHttpError(400, 'Bad request', {
          data: {
            message: 'Please provide contact details before submitting',
            errors: ['No fields were provided'],
          },
        }),
      );
    }

    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        context: { user: req.user },
      });
    } catch (error) {
      const errorMessage = error.details.map((d) => d.message).join(', ');
      return next(createHttpError(400, errorMessage));
    }
    req.body = value;
    next();
  };
