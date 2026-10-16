import { MasterSpecialty } from '@prisma/client';
import Joi from 'joi';

export const MasterSchema = Joi.object({
  speciality: Joi.string()
    .trim()
    .valid(...Object.values(MasterSpecialty))
    .required()
    .messages({
      'any.only': `Speciality must be one of: ${Object.values(MasterSpecialty).join(', ')}`,
      'string.empty': 'Speciality cannot be empty',
      'any.required': 'Speciality is required',
    }),
  description: Joi.string().trim().required().messages({
    'string.empty': 'Description cannot be empty',
    'any.required': 'Description is required',
  }),

  agreedToTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'Sie müssen den Nutzungsbedingungen zustimmen',
  }),

  isActive: Joi.boolean().optional(),

  instagram: Joi.string().trim().allow('', null).optional(),
  facebook: Joi.string().trim().allow('', null).optional(),
  youtube: Joi.string().trim().allow('', null).optional(),

  minPrice: Joi.number().integer().min(0).allow(null).optional(),
  maxPrice: Joi.number().integer().min(0).allow(null).optional(),
});
