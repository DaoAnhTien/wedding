import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class BodyValidatorMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (['POST', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('application/json')) {
        throw new HttpException('Vui lòng gửi dữ liệu JSON.', HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      }

      if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
        throw new BadRequestException('Dữ liệu không hợp lệ.');
      }
    }
    next();
  }
}
