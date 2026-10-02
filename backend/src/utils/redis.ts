import { configHandwerk } from '../configHandwerk';
import Redis from 'ioredis';

export const connection = {
  host: configHandwerk.redis.host,
  port: Number(configHandwerk.redis.port),
  password: configHandwerk.redis.password,
};

export const redisConnection = new Redis(connection);
