const need = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Env ${key} wajib diisi`);
  return v;
};

export const config = {
  port: Number(process.env.PORT ?? 4000),
  isProd: process.env.NODE_ENV === 'production',
  databaseUrl: need('DATABASE_URL'),
  mongoUri: need('MONGODB_URI'),
  jwtAccessSecret: need('JWT_ACCESS_SECRET'),
  refreshSecret: need('JWT_REFRESH_SECRET'),
  accessTtl: '15m',
  refreshTtlMs: 7 * 24 * 60 * 60 * 1000,
};
