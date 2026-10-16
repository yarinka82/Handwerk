import { getEnvVar } from './utils/getEnvVar';

export const configHandwerk = {
  resendApiKey: getEnvVar('RESEND_API_KEY'),
  clientId: getEnvVar('GOOGLE_AUTH_CLIENT_ID'),
  clientSecret: getEnvVar('GOOGLE_AUTH_CLIENT_SECRET'),
  googleRedirectUri: getEnvVar('GOOGLE_REDIRECT_URI'),
  port: +getEnvVar('PORT', '3000'),
  dataBaseUrl: getEnvVar('DATABASE_URL'),
  smtpHost: getEnvVar('SMTP_HOST'),
  smtpPort: getEnvVar('SMTP_PORT'),
  smtpBrevoUser: getEnvVar('BREVO_SMTP_USER'),
  smtpBrevoPassword: getEnvVar('BREVO_SMTP__PASSWORD'),
  smtpFrom: getEnvVar('SMTP_FROM'),
  secret: getEnvVar('JWT_SECRET'),
  domain: getEnvVar('APP_DOMAIN'),
  cloudinary: {
    name: getEnvVar('CLOUD_NAME'),
    key: getEnvVar('API_KEY'),
    secret: getEnvVar('API_SECRET'),
    enable: getEnvVar('ENABLE_CLOUDINARY'),
  },
  redis: {
    host: getEnvVar('REDIS_HOST', 'localhost'),
    port: getEnvVar('REDIS_PORT', '6379'),
    password: getEnvVar('REDIS_HOST', ''),
  },
  firebase: {
    projectId: getEnvVar('FIREBASE_PROJECT_ID'),
    clientEmail: getEnvVar('FIREBASE_CLIENT_EMAIL'),
    privateKey: getEnvVar('FIREBASE_PRIVATE_KEY'),
  },
};
