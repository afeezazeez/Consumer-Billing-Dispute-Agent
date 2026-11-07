export interface AppConfig {
  port: number;
  webOrigin: string;
  databaseUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  sessionSecret: string;
  isProduction: boolean;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 3001),
    webOrigin: requiredValue("WEB_ORIGIN"),
    databaseUrl: requiredValue("DATABASE_URL"),
    googleClientId: requiredValue("GOOGLE_CLIENT_ID"),
    googleClientSecret: requiredValue("GOOGLE_CLIENT_SECRET"),
    googleRedirectUri: requiredValue("GOOGLE_REDIRECT_URI"),
    sessionSecret: requiredValue("SESSION_SECRET"),
    isProduction: process.env.NODE_ENV === "production",
  };
}

function requiredValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
