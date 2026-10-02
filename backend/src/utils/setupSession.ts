import { THIRTY_DAY } from '../constants';
import { Response } from 'express';
import { Session } from '../types/types';

export const setupSession = (res: Response, session: Session) => {
  res.cookie('refreshToken', session.refreshToken, {
    httpOnly: true,
    expires: new Date(Date.now() + THIRTY_DAY),
  });
  res.cookie('sessionId', session.sessionId, {
    httpOnly: true,
    expires: new Date(Date.now() + THIRTY_DAY),
  });
};
