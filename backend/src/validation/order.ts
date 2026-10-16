import Joi from 'joi';
import { BaseIdentifierSchema } from './auth';

export const createOrderSchema = Joi.object({
  identifier: BaseIdentifierSchema.optional(),
  order: Joi.object({
    masterId: Joi.number().integer().positive().required(),
    description: Joi.string().max(500).required(),
    startAt: Joi.string().isoDate().required(),
    endAt: Joi.string().isoDate().required(),
  }).required(),
});

export const confirmOrderSchema = Joi.object({
  identifier: BaseIdentifierSchema,
  masterId: Joi.number().integer().positive().required(),
  description: Joi.string().max(500).required(),
  startAt: Joi.string().isoDate().required(),
  endAt: Joi.string().isoDate().required(),
});
