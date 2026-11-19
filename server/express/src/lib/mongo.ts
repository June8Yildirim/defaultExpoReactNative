import mongoose from 'mongoose';

import { env } from '../config/env.js';

export async function connectMongo(uri = env.MONGODB_URI): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
  console.log(`[mongo] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

/** Round-trips to the server; throws if MongoDB is unreachable. */
export async function pingMongo(): Promise<void> {
  const db = mongoose.connection.db;
  if (mongoose.connection.readyState !== 1 || !db) throw new Error('MongoDB is not connected');
  await db.admin().ping();
}
