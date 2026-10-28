import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const rawOrigins = this.configService?.get<string>('CORS_ORIGINS') || process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173';
    const allowedOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean);

    const origin = req.headers.origin;

    if (origin) {
      if (!allowedOrigins.includes(origin)) {
        res.status(403).json({
          statusCode: 403,
          message: 'Nguồn truy cập không được phép.',
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
  }
}
