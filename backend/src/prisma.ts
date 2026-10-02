import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { configHandwerk } from './configHandwerk';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: configHandwerk.dataBaseUrl });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });


