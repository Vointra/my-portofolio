import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { config } from './config.js';

export const pg = new Pool({ connectionString: config.databaseUrl });
export const mongo = new MongoClient(config.mongoUri);
