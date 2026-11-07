export interface AppConfig {
  port: number;
  webOrigin: string;
  database: PostgresConfig;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  sessionSecret: string;
  isProduction: boolean;
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
    database: {
      host: requiredValue("DB_HOST"),
      port: Number(process.env.DB_PORT ?? 5432),
      database: requiredValue("DB_NAME"),
      username: requiredValue("DB_USER"),
      password: readDatabasePassword(isProduction),
    },
    googleClientId: requiredValue("GOOGLE_CLIENT_ID"),
    googleClientSecret: requiredValue("GOOGLE_CLIENT_SECRET"),
    googleRedirectUri: requiredValue("GOOGLE_REDIRECT_URI"),
    sessionSecret: requiredValue("SESSION_SECRET"),
    isProduction,
  };
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
