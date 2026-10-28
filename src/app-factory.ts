import 'reflect-metadata';
import mongoose from 'mongoose';

// Fix for tsx/esbuild synthetic module namespace where nextConnectionId is read-only
const origCreateConnection = mongoose.createConnection;
mongoose.createConnection = function (...args: any[]) {
  return origCreateConnection.apply(mongoose, args as any);
};

import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  BadRequestException,
  INestApplication,
  NestApplicationOptions,
  LogLevel,
} from '@nestjs/common';
import { json } from 'express';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

export interface AppOptions {
  databasePath?: string;
  adminToken?: string;
  origins?: string[];
  logger?: LogLevel[] | false;
}

export async function createNestApp(options: AppOptions = {}): Promise<INestApplication> {
  if (options.databasePath !== undefined) {
    process.env.DATABASE_PATH = options.databasePath;
  }
  if (options.adminToken !== undefined) {
    process.env.ADMIN_TOKEN = options.adminToken;
  }
  if (options.origins !== undefined) {
    process.env.CORS_ORIGINS = options.origins.join(',');
  }

  const nestOptions: NestApplicationOptions = {
    logger: options.logger ?? false,
  };

  const app = await NestFactory.create(AppModule, nestOptions);

  // Global CORS and Preflight handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    const rawOrigins = process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173';
    const allowedOrigins = [
      ...(options.origins === undefined ? ['https://vansangthuydung.netlify.app'] : []),
      ...rawOrigins.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean),
    ];
    const origin = req.headers.origin;

    if (origin) {
      if (!allowedOrigins.includes(origin)) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.status(403).json({
          statusCode: 403,
          message: 'Nguồn truy cập không được phép.',
          timestamp: new Date().toISOString(),
          path: req.url,
        });
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  });

  // Body parser with 8KB limit
  app.use(json({ limit: '8kb' }));

  // Request Body & Content-Type validation
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('application/json')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.status(415).json({
          statusCode: 415,
          message: 'Vui lòng gửi dữ liệu JSON.',
          timestamp: new Date().toISOString(),
          path: req.url,
        });
        return;
      }

      if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.status(400).json({
          statusCode: 400,
          message: 'Dữ liệu không hợp lệ.',
          timestamp: new Date().toISOString(),
          path: req.url,
        });
        return;
      }
    }
    next();
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: (errors) => {
        const firstError = errors[0];
        const constraints = firstError?.constraints;
        const firstMsg = constraints ? Object.values(constraints)[0] : 'Dữ liệu không hợp lệ.';
        return new BadRequestException(firstMsg);
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  return app;
}
