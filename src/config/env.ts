import 'dotenv/config';

export function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is missing. Copy .env.example to .env and set a safe local value before starting FormFlow.`,
    );
  }

  return value;
}
