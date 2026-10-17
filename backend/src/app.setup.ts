import { INestApplication, ValidationPipe } from '@nestjs/common';

// Shared by main.ts and the e2e tests, so the tests run the same config.
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  // transform: query strings become typed DTOs, with their defaults applied.
  // whitelist: properties without validation decorators are stripped.
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
}
