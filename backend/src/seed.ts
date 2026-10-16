// Entry point of `npm run seed`: loads data/pokemon.json into the database
// without starting the HTTP server.

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { SeedService } from './pokemon/seed.service.js';

const app = await NestFactory.createApplicationContext(AppModule);
try {
  await app.get(SeedService).seed();
} finally {
  await app.close();
}
