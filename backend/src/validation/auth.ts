import Joi from 'joi';
import { joiPasswordExtendCore } from 'joi-password';
import { parseIdentifier } from '../utils/parseIdentifier';

const JoiPassword = Joi.extend(joiPasswordExtendCore);

export const emailSchema = Joi.string().email().lowercase().trim();

export const phoneSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{7,14}$/)
  .trim();
export const BaseIdentifierSchema = Joi.string()
  .trim()
  .required()
  .custom((value, helpers) => {
    const identity = parseIdentifier(value);

    if (!identity) {
      return helpers.error('Invalid identifier');
    }

    return identity;
  });

export const quickIdentityschema = Joi.object({
  identifier: BaseIdentifierSchema,
});

export const registerUserSchema = Joi.object({
  identifier: BaseIdentifierSchema,
  name: Joi.string().trim().min(3).max(20).optional().messages({
    'string.base': 'Der Name muss eine Zeichenkette sein',
    'string.min': 'Der Name muss mindestens {#limit} Zeichen haben',
    'string.max': 'Der Name darf höchstens {#limit} Zeichen haben',
  }),
  password: JoiPassword.string()
    .trim()
    .minOfUppercase(1)
    .minOfLowercase(1)
    .minOfSpecialCharacters(1)
    .minOfNumeric(1)
    .noWhiteSpaces()
    .min(8)
    .required()
    .messages({
      'string.required': 'Passwort ist erforderlich',
      'password.minOfUppercase':
        'Das Passwort muss mindestens einen Großbuchstaben enthalten',
      'password.minOfLowercase':
        'Das Passwort muss mindestens einen Kleinbuchstaben enthalten',
      'password.minOfSpecialCharacters':
        'Das Passwort muss mindestens ein Sonderzeichen enthalten',
      'password.minOfNumeric':
        'Das Passwort muss mindestens eine Zahl enthalten',
      'password.noWhiteSpaces': 'Das Passwort darf keine Leerzeichen enthalten',
      'password.min': 'Das Passwort muss mindestens {#limit} Zeichen lang sein',
    }),
});

export const loginUserSchema = Joi.object({
  identifier: BaseIdentifierSchema,
  password: JoiPassword.string().trim().required().messages({
    'password.required': 'Password should be required',
  }),
});

export const resetPasswordSchema = Joi.object({
  identifier: BaseIdentifierSchema,
  password: JoiPassword.string()
    .trim()
    .minOfUppercase(1)
    .minOfLowercase(1)
    .minOfSpecialCharacters(1)
    .minOfNumeric(1)
    .noWhiteSpaces()
    .min(8)
    .required()
    .messages({
      'string.required': 'Passwort ist erforderlich',
      'password.minOfUppercase':
        'Das Passwort muss mindestens einen Großbuchstaben enthalten',
      'password.minOfLowercase':
        'Das Passwort muss mindestens einen Kleinbuchstaben enthalten',
      'password.minOfSpecialCharacters':
        'Das Passwort muss mindestens ein Sonderzeichen enthalten',
      'password.minOfNumeric':
        'Das Passwort muss mindestens eine Zahl enthalten',
      'password.noWhiteSpaces': 'Das Passwort darf keine Leerzeichen enthalten',
      'password.min': 'Das Passwort muss mindestens {#limit} Zeichen lang sein',
    }),
  token: Joi.string().optional().messages({
    'string.base': 'Token must be a string',
    'string.empty': 'Token is required',
    'any.required': 'Token is required',
  }),
  code: Joi.string().optional().messages({
    'string.base': 'Token must be a string',
    'string.empty': 'Token is required',
    'any.required': 'Token is required',
  }),
}).xor('token', 'code');

export const changePasswordSchema = Joi.object({
  password: JoiPassword.string()
    .trim()
    .minOfUppercase(1)
    .minOfLowercase(1)
    .minOfSpecialCharacters(1)
    .minOfNumeric(1)
    .noWhiteSpaces()
    .min(8)
    .required()
    .messages({
      'string.required': 'Passwort ist erforderlich',
      'password.minOfUppercase':
        'Das Passwort muss mindestens einen Großbuchstaben enthalten',
      'password.minOfLowercase':
        'Das Passwort muss mindestens einen Kleinbuchstaben enthalten',
      'password.minOfSpecialCharacters':
        'Das Passwort muss mindestens ein Sonderzeichen enthalten',
      'password.minOfNumeric':
        'Das Passwort muss mindestens eine Zahl enthalten',
      'password.noWhiteSpaces': 'Das Passwort darf keine Leerzeichen enthalten',
      'password.min': 'Das Passwort muss mindestens {#limit} Zeichen lang sein',
    }),
});

export const changePhoneSchema = Joi.object({
  password: Joi.string().trim().required().messages({
    'any.required': 'password is required',
    'string.empty': 'password cannot be empty',
  }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{7,14}$/)
    .trim()
    .messages({
      'any.required': 'Phone is required',
      'string.empty': 'Phone cannot be empty',
      'string.pattern.base': 'Phone must be a valid phone number',
    }),
});

export const changeEmailSchema = Joi.object({
  password: Joi.string().trim().required().messages({
    'any.required': 'password is required',
    'string.empty': 'password cannot be empty',
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Email must be a valid email',
    'any.required': 'Email is required',
    'string.empty': 'Email cannot be empty',
  }),
});

export const changeProfileSchema = Joi.object({
  name: Joi.string().trim().max(50).optional(),
  email: Joi.string().trim().lowercase().max(128).email().optional().messages({
    'email.max': 'Email should have at most {#limit} characters',
    'email.email': 'Email should be valid email',
  }),
  googleId: Joi.string().trim().optional(),
  telegramId: Joi.string().trim().optional(),
  phone: Joi.string()
    .trim()
    .optional()
    .custom((value, helpers) => {
      const cleanPhone = value.replace(/\D/g, '');

      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        return helpers.message({
          custom: 'Phone number must contain between 10 and 15 digits',
        });
      }
      return `+${cleanPhone}`;
    }),
  preferredChannel: Joi.string()
    .valid('email', 'phone', 'telegramId')
    .optional(),
})
  .min(1)
  .custom((value, helpers) => {
    const user = helpers.prefs.context?.user;

    if (value.preferredChannel) {
      const channel = value.preferredChannel;

      const hasEmail = !!value.email || !!user?.email;
      const hasPhone = !!value.phone || !!user?.phone;
      const hasTelegram = !!value.telegramId || !!user?.telegramId;

      if (channel === 'email' && !hasEmail) {
        return helpers.message({
          custom:
            'Cannot set preferred channel to Email because email is missing',
        });
      }
      if (channel === 'phone' && !hasPhone) {
        return helpers.message({
          custom:
            'Cannot set preferred channel to Phone because phone number is missing',
        });
      }
      if (channel === 'telegramId' && !hasTelegram) {
        return helpers.message({
          custom:
            'Cannot set preferred channel to Telegram because Telegram ID is missing',
        });
      }
    }

    return value;
  });
