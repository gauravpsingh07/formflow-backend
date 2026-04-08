process.env.DATABASE_URL ??=
  'postgresql://formflow:formflow@localhost:5432/formflow?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET ??= 'test-jwt-secret';
process.env.JWT_ACCESS_TTL_SECONDS ??= '900';
process.env.INTERNAL_JOB_SECRET ??= 'test-job-secret';
