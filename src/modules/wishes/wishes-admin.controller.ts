import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { WishesService } from './wishes.service';
import { QueryWishDto } from './dto/query-wish.dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin/wishes')
@UseGuards(AdminAuthGuard)
export class WishesAdminController {
  constructor(@Inject(WishesService) private readonly wishesService: WishesService) {}

  @Get()
  async getAdminWishes(@Query() query: QueryWishDto) {
    return this.wishesService.getWishes(query.limit, query.offset);
  }

  @Post()
  @Patch()
  @Delete()
  @Put()
  rejectDisallowedMethods() {
    throw new HttpException('Phương thức không được hỗ trợ.', HttpStatus.METHOD_NOT_ALLOWED);
  }
}
