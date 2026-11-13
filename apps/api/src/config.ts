import type { CloudinaryConfig } from "./storage/cloudinary-attachment-storage";

export interface AppConfig {
  port: number;
  webOrigin: string;
  database: PostgresConfig;
  redisUrl: string;
  cloudinary?: CloudinaryConfig;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  gmailConnector?: GmailConnectorConfig;
  sessionSecret: string;
  openAiApiKey: string | undefined;
  openAiModel: string;
  isProduction: boolean;
}

export interface GmailConnectorConfig {
  redirectUri: string;
  tokenEncryptionKey: string;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export function loadConfig(): AppConfig {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    port: Number(process.env.PORT ?? 3001),
    webOrigin: requiredValue("WEB_ORIGIN"),
    redisUrl: requiredValue("REDIS_URL"),
    database: {
      host: requiredValue("DB_HOST"),
      port: Number(process.env.DB_PORT ?? 5432),
      database: requiredValue("DB_NAME"),
      username: requiredValue("DB_USER"),
      password: readDatabasePassword(isProduction),
    },
    cloudinary: readCloudinaryConfig(),
    googleClientId: requiredValue("GOOGLE_CLIENT_ID"),
    googleClientSecret: requiredValue("GOOGLE_CLIENT_SECRET"),
    googleRedirectUri: requiredValue("GOOGLE_REDIRECT_URI"),
    gmailConnector: readGmailConnectorConfig(),
    sessionSecret: requiredValue("SESSION_SECRET"),
    openAiApiKey: optionalValue("OPENAI_API_KEY"),
    openAiModel: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra",
    isProduction,
  };
}

function readGmailConnectorConfig(): GmailConnectorConfig | undefined {
  const redirectUri = optionalValue("GMAIL_GOOGLE_REDIRECT_URI");
  const tokenEncryptionKey = optionalValue("GMAIL_TOKEN_ENCRYPTION_KEY");
  if (!redirectUri || !tokenEncryptionKey) return undefined;
  if (!/^[\da-f]{64}$/i.test(tokenEncryptionKey)) {
    throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY must be a 32-byte hexadecimal value");
  }
  return { redirectUri, tokenEncryptionKey };
}

function readDatabasePassword(isProduction: boolean): string {
  const password = process.env.DB_PASSWORD?.trim() ?? "";
  if (isProduction && !password) throw new Error("Missing required environment variable: DB_PASSWORD");
  return password;
}

function requiredValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optionalValue(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}


function readCloudinaryConfig(): CloudinaryConfig | undefined {
  const cloud_name = optionalValue("CLOUDINARY_CLOUD_NAME");
  const api_key = optionalValue("CLOUDINARY_API_KEY");
  const api_secret = optionalValue("CLOUDINARY_API_SECRET");
  if (cloud_name && api_key && api_secret) return { cloud_name, api_key, api_secret };
}
