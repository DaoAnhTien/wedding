import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  Inject,
} from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { CreateRsvpDto } from './dto/create-rsvp.dto';
import { QueryWishDto } from '../wishes/dto/query-wish.dto';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';

@Controller('rsvp')
export class RsvpController {
  constructor(@Inject(RsvpService) private readonly rsvpService: RsvpService) {}

  @Get()
  async getRsvpList(@Query() query: QueryWishDto) {
    return this.rsvpService.getRsvpList(query.limit, query.offset);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimiterGuard)
  async createRsvp(@Body() dto: CreateRsvpDto) {
    return this.rsvpService.createRsvp(dto);
  }

  @Patch()
  @Delete()
  @Put()
  rejectDisallowedMethods() {
    throw new HttpException('Phương thức không được hỗ trợ.', HttpStatus.METHOD_NOT_ALLOWED);
  }
}
