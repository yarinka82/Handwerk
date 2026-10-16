import Joi from 'joi';
import { BaseIdentifierSchema } from './auth';

export const BaseConfirmSchema = Joi.object({
  code: Joi.string().trim().required().messages({
    'any.required': 'Code is required',
    'string.empty': 'Code is required',
  }),
});

export const confirmSchema = Joi.object({
  identifier: BaseIdentifierSchema.required().messages({
    'string.required': 'E-mail is required',
  }),
  code: Joi.string().trim().required().messages({
    'any.required': 'Code is required',
    'string.empty': 'Code is required',
  }),
});

export const confirmTokenSchema = Joi.object({
  token: Joi.string().trim().optional().messages({
    'object.missing': 'Es muss entweder ein Token angegeben werden',
    'string.base': 'Ungültiger Eingabetyp für Bestätigung',
  }),
});
