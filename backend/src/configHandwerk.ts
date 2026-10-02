import { getEnvVar } from './utils/getEnvVar';

export const configHandwerk = {
  resendApiKey: getEnvVar('RESEND_API_KEY'),
  clientId: getEnvVar('GOOGLE_AUTH_CLIENT_ID'),
  clientSecret: getEnvVar('GOOGLE_AUTH_CLIENT_SECRET'),
  port: +getEnvVar('PORT', '3000'),
  dataBaseUrl: getEnvVar('DATABASE_URL'),
  smtpHost: getEnvVar('SMTP_HOST'),
  smtpPort: getEnvVar('SMTP_PORT'),
  smtpBrevoUser: getEnvVar('BREVO_SMTP_USER'),
  smtpBrevoPassword: getEnvVar('BREVO_SMTP_PASSWORD'),
  smtpFrom: getEnvVar('SMTP_FROM'),
  secret: getEnvVar('JWT_SECRET'),
  domain: getEnvVar('APP_DOMAIN'),
  redis: {
    host: getEnvVar('REDIS_HOST', 'localhost'),
    port: getEnvVar('REDIS_PORT', '6379'),
    password: getEnvVar('REDIS_HOST', ""),
  },
};
