import crypto from 'node:crypto';
import { BaseOrder, VerificationType } from '../types/types';
import createHttpError from 'http-errors';
import { redisConnection } from './redis';

export type CreateVerificationToken = {
  inputData?: string;
  order?: BaseOrder;
  requestId?: string;
  type: VerificationType;
  channel?: string;
  value?: string;
  userId?: string;
};

export const createVerificationToken = async (
  payload: CreateVerificationToken,
) => {
  const { userId, channel, value, type, order, inputData, requestId } = payload;
  let isUserId;

  if (
    type === 'EMAIL_CHANGE' ||
    type === 'PHONE_CHANGE' ||
    type === 'PASSWORD_CHANGE'
  ) {
    if (!userId) {
      throw createHttpError(401, 'User ID is required for this operation');
    }
    isUserId =
      type === 'EMAIL_CHANGE' ||
      type === 'PHONE_CHANGE' ||
      type === 'PASSWORD_CHANGE';
  }

  const prefix = type.toLowerCase();

  const code = crypto.randomInt(100000, 1000000).toString();
  const token = crypto.randomBytes(32).toString('hex');

  const dataToSave = {
    code,
    token,
    type,
    order,
    channel,
    userId,
    value,
    inputData,
    requestId,
  };
  const codeKeyId = isUserId ? userId : (requestId ?? value);
  console.log('🚀 ~ createVerificationToken ~ codeKeyId:', codeKeyId);

  const redisKeyCode = isUserId
    ? `${prefix}:${code}:${codeKeyId}`
    : `${prefix}:${code}:${channel}:${codeKeyId}`;
  console.log('🚀 ~ createVerificationToken ~ redisKeyCode:', redisKeyCode);

  await redisConnection.set(
    redisKeyCode,
    JSON.stringify(dataToSave),
    'EX',
    15 * 60,
  );

  if (channel === 'email') {
    const redisKeyToken = `token:${token}`;
    await redisConnection.set(
      redisKeyToken,
      JSON.stringify(dataToSave),
      'EX',
      15 * 60,
    );
    return { token, code };
  }
  return { code };
};
