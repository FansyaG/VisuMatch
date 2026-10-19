import { buildApp } from './app.js';
import { config } from './config/env.js';
import fs from 'fs/promises';

async function start() {
  // Ensure storage directories exist
  await fs.mkdir(config.storageRoot, { recursive: true });

  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`Core API running at http://${config.host}:${config.port}`);
    console.log(`OpenAPI Swagger documentation at http://${config.host}:${config.port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
