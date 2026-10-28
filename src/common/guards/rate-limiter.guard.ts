import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface RateRecord {
  count: number;
  expires: number;
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly limits = new Map<string, RateRecord>();
  private readonly maxRequests = 10;
  private readonly windowMs = 60_000;

  constructor() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.limits) {
        if (value.expires < now) {
          this.limits.delete(key);
        }
      }
    }, 60_000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = this.limits.get(ip);

    if (record && record.expires > now && record.count >= this.maxRequests) {
      const retryAfter = Math.ceil((record.expires - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      throw new HttpException(
        'Bạn gửi hơi nhanh. Vui lòng thử lại sau một phút.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (record && record.expires > now) {
      this.limits.set(ip, { ...record, count: record.count + 1 });
    } else {
      this.limits.set(ip, { count: 1, expires: now + this.windowMs });
    }

    return true;
  }
}
