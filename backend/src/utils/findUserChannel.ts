import createHttpError from 'http-errors';
import { BaseUser, Channel } from '../types/types';

export const findUserChannel = (user: BaseUser): Channel => {
  if (user.preferredChannel) {
    return user.preferredChannel as Channel;
  } else if (user.email) {
    return 'email';
  } else if (user.phone) {
    return 'phone';
  } else if (user.telegramId) {
    return 'telegramId';
  }
  throw createHttpError(404, 'Not found available chanal message');
};
