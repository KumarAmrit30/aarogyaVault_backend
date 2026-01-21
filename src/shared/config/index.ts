import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  
  // Database
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.string().transform(Number).pipe(z.number().int().positive()),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().default(''), // Empty for local peer auth
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY: z.string().default('7d'),
  
  // S3 Storage
  S3_ENDPOINT: z.string().url(),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_REGION: z.string().default('us-east-1'),
});

// Validate and parse environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const config = parseResult.data;

// Export typed config for easier access
export const dbConfig = {
  host: config.POSTGRES_HOST,
  port: config.POSTGRES_PORT,
  database: config.POSTGRES_DB,
  user: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
};

export const jwtConfig = {
  secret: config.JWT_SECRET,
  expiry: config.JWT_EXPIRY,
};

export const s3Config = {
  endpoint: config.S3_ENDPOINT,
  bucket: config.S3_BUCKET,
  accessKey: config.S3_ACCESS_KEY,
  secretKey: config.S3_SECRET_KEY,
  region: config.S3_REGION,
};
