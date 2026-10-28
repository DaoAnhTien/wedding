import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  HttpException,
  Inject,
} from '@nestjs/common';
import { WishesService } from './wishes.service';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { QueryWishDto } from './dto/query-wish.dto';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

function parseAndValidateWishId(rawId: string): number {
  if (!/^[1-9]\d*$/.test(rawId)) {
    throw new BadRequestException('Mã lời chúc không hợp lệ.');
  }
  const id = Number(rawId);
  if (!Number.isSafeInteger(id)) {
    throw new BadRequestException('Mã lời chúc không hợp lệ.');
  }
  return id;
}

@Controller('wishes')
export class WishesController {
  constructor(@Inject(WishesService) private readonly wishesService: WishesService) {}

  @Get()
  async getWishes(@Query() query: QueryWishDto) {
    return this.wishesService.getWishes(query.limit, query.offset);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimiterGuard)
  async createWish(@Body() dto: CreateWishDto) {
    return this.wishesService.createWish(dto);
  }

  @Patch()
  @Delete()
  @Put()
  rejectDisallowedCollectionMethods() {
    throw new HttpException('Phương thức không được hỗ trợ.', HttpStatus.METHOD_NOT_ALLOWED);
  }

  @Get(':id')
  async getWishById(@Param('id') idParam: string) {
    const id = parseAndValidateWishId(idParam);
    return this.wishesService.getWishById(id);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard, RateLimiterGuard)
  async updateWish(
    @Param('id') idParam: string,
    @Body() dto: UpdateWishDto,
  ) {
    const id = parseAndValidateWishId(idParam);
    return this.wishesService.updateWish(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async deleteWish(@Param('id') idParam: string) {
    const id = parseAndValidateWishId(idParam);
    return this.wishesService.deleteWish(id);
  }

  @Put(':id')
  @Post(':id')
  rejectDisallowedItemMethods() {
    throw new HttpException('Phương thức không được hỗ trợ.', HttpStatus.METHOD_NOT_ALLOWED);
  }
}
