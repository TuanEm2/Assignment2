import { NestFactory } from '@nestjs/core';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { AppModule } from './app.module';
import { configureHttp } from './http/app-http.config';

async function bootstrap() {
  const rootEnvFile = resolve(__dirname, '../../../.env');
  if (existsSync(rootEnvFile)) {
    loadEnvFile(rootEnvFile);
  }

  const app = await NestFactory.create(AppModule);

  const allowedOrigins = (process.env.CORS_ORIGINS ??
    'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: allowedOrigins });

  configureHttp(app);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
