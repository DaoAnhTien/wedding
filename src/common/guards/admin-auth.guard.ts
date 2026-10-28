import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const adminToken = this.configService?.get<string>('ADMIN_TOKEN') || process.env.ADMIN_TOKEN || '';

    if (!adminToken) {
      throw new ServiceUnavailableException('Chưa cấu hình khóa quản trị trên máy chủ.');
    }

    const authHeader = request.headers.authorization || '';
    const rawProvided = authHeader.replace(/^Bearer\s+/i, '');

    const provided = Buffer.from(rawProvided);
    const expected = Buffer.from(adminToken);

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new UnauthorizedException('Khóa quản trị không đúng hoặc đã hết hiệu lực.');
    }

    return true;
  }
}
