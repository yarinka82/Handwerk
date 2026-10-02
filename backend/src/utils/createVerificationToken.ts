import crypto from 'node:crypto';
import { BaseOrder, Channel, VerificationType } from '../types/types';
import createHttpError from 'http-errors';
import { redisConnection } from './redis';

export type CreateVerificationToken = {
  channel: Channel;
  value: string;
  inputData?: string;
  type: VerificationType;
  order?: BaseOrder;
  requestId?: string;
};

export const createVerificationToken = async (
  payload: CreateVerificationToken,
) => {
  const { channel, value, type, order, inputData, requestId } = payload;

  const prefix = type.toLowerCase();

  const code = crypto.randomInt(100000, 1000000).toString();
  const token = crypto.randomBytes(32).toString('hex');

  const dataToSave = { code, token, order, channel, value, inputData };
 const codeKeyId = requestId ? requestId : value;

  if (channel === 'email') {
    const redisKeyCode = `${prefix}:${code}:email:${codeKeyId}`;
    const redisKeyToken = `${prefix}:token:${token}`;

    await redisConnection.set(
      redisKeyCode,
      JSON.stringify(dataToSave),
      'EX',
      15 * 60,
    );
    await redisConnection.set(
      redisKeyToken,
      JSON.stringify(dataToSave),
      'EX',
      15 * 60,
    );
    return { token, code };
  } else if (channel === 'phone' || channel === 'telegramId') {
    const redisKeyCode = `${prefix}:${code}:phone:${value}`;

    await redisConnection.set(
      redisKeyCode,
      JSON.stringify(dataToSave),
      'EX',
      15 * 60,
    );
    return { code };
  } else {
    throw createHttpError(
      '400',
      'To send the verification code, at least one of the channels must be selected: email or phone number',
    );
  }
};
