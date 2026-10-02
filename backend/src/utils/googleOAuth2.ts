import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import createHttpError from 'http-errors';
import { PrismaClient } from '@prisma/client/extension';
import { configHandwerk } from '../configHandwerk';
import { redisConnection } from './redis';

const PATH_JSON = path.join(process.cwd(), 'google-oauth.json');

const oauthConfig = JSON.parse(await readFile(PATH_JSON, 'utf-8'));

const prisma = new PrismaClient();

const googleOAuthClient = new OAuth2Client({
  clientId: configHandwerk.clientId as string,
  clientSecret: configHandwerk.clientSecret as string,
  redirectUri: oauthConfig.web.redirect_uris[0],
});

export const generateAuthUrl = () => {
  return googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com',
    ],
  });
};

export const validateCode = async (code: string) => {
  const response = await googleOAuthClient.getToken(code);

  if (!response.tokens.id_token) throw createHttpError(401, 'Unauthorized');

  const ticket = await googleOAuthClient.verifyIdToken({
    idToken: response.tokens.id_token,
    audience: configHandwerk.clientId as string,
  });

  return {
    ticket,
    googleTokens: response.tokens,
  };
};

export const getFullNameFromGoogleTokenPayload = (payload: TokenPayload) => {
  let fullName = 'Guest';

  if (payload.given_name && payload.family_name) {
    fullName = `${payload.given_name} ${payload.family_name}`;
  } else if (payload.given_name) {
    fullName = `${payload.given_name}`;
  }
  return fullName;
};

export const getGoogleAuthClient = async (sessionId: string) => {
  const rawSession = await redisConnection.get(`session:${sessionId}`);

  if (!rawSession) throw createHttpError('Session Smartrlog not found');

  const session = JSON.parse(rawSession);

  const oauth2Client = new OAuth2Client({
    client_id: configHandwerk.clientId,
    clientSecret: configHandwerk.clientSecret,
  });

  oauth2Client.setCredentials({
    access_token: session.googleAccessToken,
    refresh_token: session.googleRefreshToken || undefined,
  });

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      const latestRawSession = await redisConnection.get(
        `session:${sessionId}`,
      );

      if (latestRawSession) {
        const latestSession = JSON.parse(latestRawSession);

        latestSession.googleAccessToken = tokens.access_token;

        if (tokens.refresh_token) {
          latestSession.googleRefreshToken = tokens.refresh_token;
        }
        await redisConnection.set(
          `session:${sessionId}`,
          JSON.stringify(latestSession),
          'EX',
          'THIRTY_DAY',
        );
      }
    }
  });

  return oauth2Client;
};
