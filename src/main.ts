import { Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createNestApp } from './app-factory';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const logLevels: LogLevel[] = ['log', 'error', 'warn'];
  const app = await createNestApp({ logger: logLevels });

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT')) || 3001;
  const host = configService.get<string>('HOST') || '127.0.0.1';

  await app.listen(port, host);
  logger.log(`Wedding API is running on http://${host}:${port}/api`);
}

bootstrap();
