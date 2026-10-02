import Joi from 'joi';
import { validateCode } from '../utils/googleOAuth2';
import { joiPasswordExtendCore } from 'joi-password';

const JoiPassword = Joi.extend(joiPasswordExtendCore);

export const BaseUserSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().optional().messages({
    'email.email': 'Die E-Mail muss eine gültige Adresse sein',
  }),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?\d{10,15}$/)
    .optional(),
})
  .xor('email', 'phone')
  .custom((value, helpers) => {
    if (value.email) {
      value.channel = 'email';
      value.value = value.email.toLowerCase().trim();
    } else if (value.phone) {
      const cleanPhone = value.phone.replace(/\D/g, '');

      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        return helpers.message({
          custom: 'Phone number must contain between 10 and 15 digits',
        });
      }

      value.channel = 'phone';
      value.value = `+${cleanPhone}`;
    }

    delete value.email;
    delete value.phone;

    return value;
  });

export const registerUserSchema = BaseUserSchema.concat(
  Joi.object({
    name: Joi.string().trim().min(3).max(20).required().messages({
      'string.base': 'Der Name muss eine Zeichenkette sein',
      'string.min': 'Der Name muss mindestens {#limit} Zeichen haben',
      'string.max': 'Der Name darf höchstens {#limit} Zeichen haben',
      'string.required': 'Der Name ist erforderlich',
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
        'password.noWhiteSpaces':
          'Das Passwort darf keine Leerzeichen enthalten',
        'password.min':
          'Das Passwort muss mindestens {#limit} Zeichen lang sein',
      }),
  }),
);

export const loginUserSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'email.email': 'Email should be valid email',
    'email.required': 'Email should be required',
  }),
  password: JoiPassword.string().trim().required().messages({
    'password.required': 'Password should be required',
  }),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().optional().messages({
    'email.email': 'Email should be valid email',
    'email.required': 'Email should be required',
  }),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?\d{10,15}$/)
    .optional(),
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
})
  .xor('email', 'phone')
  .xor('token', 'code')
  .custom((value, helpers) => {
    if (value.email) {
      value.channel = 'email';
      value.value = value.email.toLowerCase().trim();
    } else if (value.phone) {
      const cleanPhone = value.phone.replace(/\D/g, '');

      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        return helpers.message({
          custom: 'Phone number must contain between 10 and 15 digits',
        });
      }

      value.channel = 'phone';
      value.value = `+${cleanPhone}`;
    }

    delete value.email;
    delete value.phone;

    return value;
  });

export const baseIdentitySchema = Joi.object({
  email: Joi.string().trim().lowercase().max(128).email().optional(),
  phone: Joi.string().trim().optional(),
  telegramId: Joi.string().trim().optional(),

  googleToken: Joi.string().trim().optional(),
})
  .xor('email', 'phone', 'telegramId', 'googleToken')
  .messages({
    'object.missing':
      'Es muss entweder eine E-Mail, Telefonnummer, Telegram-ID oder ein Google-Token angegeben werden',
    'string.email': 'Die E-Mail muss eine gültige Adresse sein',
    'string.max': 'Die E-Mail darf höchstens {#limit} Zeichen haben',
    'string.base': 'Ungültiger Eingabetyp',
  })
  .custom(async (value, helpers) => {
    if (value.googleToken) {
      try {
        const { ticket, googleTokens } = await validateCode(value.googleCode);

        const payload = ticket.getPayload();
        if (!payload || !payload.sub) {
          return helpers.message({ custom: 'Invalid Google token payload' });
        }

        value.channel = 'googleId';
        value.value = payload.sub;

        value.googleAccessToken = googleTokens.access_token || undefined;
        value.googleRefreshToken = googleTokens.refresh_token || undefined;

        if (payload.email) {
          value.email = payload.email.toLowerCase();
        }
      } catch (error) {
        console.error(error);
        return helpers.message({ custom: 'Google authentication failed' });
      }

      delete value.googleToken;
      return value;
    }

    if (value.email) {
      value.channel = 'email';
      value.value = value.email;
    } else if (value.phone) {
      const cleanPhone = value.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        return helpers.message({
          custom: 'Phone number must contain between 10 and 15 digits',
        });
      }
      value.channel = 'phone';
      value.value = `+${cleanPhone}`;
    } else if (value.telegramId) {
      value.channel = 'telegramId';
      value.value = value.telegramId;
    }
    delete value.email;
    delete value.phone;
    delete value.telegramId;

    return value;
  });

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

export const confirmSchema = Joi.object({
  code: Joi.string().trim().optional(),
  token: Joi.string().trim().optional(),
})
  .xor('code', 'token')
  .messages({
    'object.missing':
      'Es muss entweder ein Code oder ein Token angegeben werden',
    'string.base': 'Ungültiger Eingabetyp für Bestätigung',
  });

export const quickConfirmSchema = baseIdentitySchema.concat(confirmSchema);

export const confirmRequestOrderSchema = baseIdentitySchema
  .concat(
    Joi.object({
      code: Joi.string().optional(),
      token: Joi.string().optional(),

      order: Joi.object({
        masterId: Joi.number().integer().positive().required(),
        description: Joi.string().max(500).required(),
        startAt: Joi.string().isoDate().required(),
        endAt: Joi.string().isoDate().required(),
      }).required(),
    }),
  )
  .xor('token', 'code')
  .messages({
    'object.missing':
      'Es muss entweder ein Code oder ein Token angegeben werden',
    'string.base': 'Ungültiger Eingabetyp für Bestätigung',
  });

export const confirmOrderSchema = baseIdentitySchema.concat(
  Joi.object({
    masterId: Joi.number().integer().positive().required(),
    description: Joi.string().max(500).required(),
    startAt: Joi.string().isoDate().required(),
    endAt: Joi.string().isoDate().required(),
  }),
);

export const changeProfileSchema = Joi.object({
  name: Joi.string().trim().max(50).optional(),
  password: Joi.string().min(6).optional(),
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
