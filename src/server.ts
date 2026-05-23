import 'dotenv/config';
import { app } from './app.js';
import { testDatabaseConnection } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

async function start() {
  const dbOk = await testDatabaseConnection();
  if (!dbOk && env.NODE_ENV === 'production') {
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'RentWise API listening');
  });
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
