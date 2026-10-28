import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Chưa thể xử lý yêu cầu. Vui lòng thử lại.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const anyRes = res as Record<string, any>;
        if (Array.isArray(anyRes.message)) {
          message = anyRes.message[0];
        } else if (anyRes.message) {
          message = anyRes.message;
        }
      }

      if (status === HttpStatus.NOT_FOUND && typeof message === 'string' && message.startsWith('Cannot ')) {
        const urlPath = request.url.split('?')[0];
        if (
          ['/api/wishes', '/api/rsvp'].includes(urlPath) &&
          ['PATCH', 'DELETE', 'PUT'].includes(request.method)
        ) {
          status = HttpStatus.METHOD_NOT_ALLOWED;
          message = 'Phương thức không được hỗ trợ.';
        } else if (
          urlPath === '/api/admin/wishes' &&
          request.method !== 'GET'
        ) {
          status = HttpStatus.METHOD_NOT_ALLOWED;
          message = 'Phương thức không được hỗ trợ.';
        } else if (
          /^\/api\/wishes\/\d+$/.test(urlPath) &&
          !['GET', 'PATCH', 'DELETE'].includes(request.method)
        ) {
          status = HttpStatus.METHOD_NOT_ALLOWED;
          message = 'Phương thức không được hỗ trợ.';
        } else {
          message = 'Không tìm thấy API.';
        }
      }
    } else if (typeof exception === 'object' && exception !== null) {
      const anyErr = exception as Record<string, any>;
      if (anyErr.type === 'entity.too.large' || anyErr.status === 413) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = 'Nội dung quá dài.';
      } else if (anyErr.type === 'entity.parse.failed' || anyErr instanceof SyntaxError) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Dữ liệu không hợp lệ.';
      }
    } else {
      this.logger.error('Unhandled exception:', exception);
    }

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
