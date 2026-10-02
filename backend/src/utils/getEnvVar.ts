import { configDotenv } from 'dotenv';

configDotenv();

export function getEnvVar(name: string, defaultValue?: string) {
  const value = process.env[name];

  if (value) return value;

  if (defaultValue) return defaultValue;

  throw new Error(`Missing process env['${name}'].`);
}
