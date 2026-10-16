import { Identity } from '../types/types';
import { emailSchema, phoneSchema } from '../validation/auth';

export const parseIdentifier = (value: string): Identity | null => {
  const emailResult = emailSchema.validate(value);

  if (!emailResult.error) {
    return {
      channel: 'email',
      value: emailResult.value,
    };
  }

  const phoneResult = phoneSchema.validate(value);

  if (!phoneResult.error) {
    const cleanPhone = phoneResult.value.replace(/\D/g, '');

    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      throw new Error('identifier must be a valid phone number or email');
    }
    return {
      channel: 'phone',
      value: `+${cleanPhone}`,
    };
  }

  return null;
};
