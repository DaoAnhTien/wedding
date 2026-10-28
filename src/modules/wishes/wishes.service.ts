import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { WISHES_REPOSITORY } from '../../common/constants/injection-tokens';
import { IWishesRepository } from './interfaces/wishes-repository.interface';
import { Wish, PaginatedResult } from './interfaces/wish.interface';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';

@Injectable()
export class WishesService {
  constructor(
    @Inject(WISHES_REPOSITORY)
    private readonly wishesRepository: IWishesRepository,
  ) { }

  async getWishes(limit: number, offset: number): Promise<PaginatedResult<Wish>> {
    return this.wishesRepository.findAll(limit, offset);
  }

  async getWishById(id: number): Promise<Wish> {
    const wish = await this.wishesRepository.findById(id);
    if (!wish) {
      throw new NotFoundException('Lời chúc không còn tồn tại.');
    }
    return wish;
  }

  async createWish(dto: CreateWishDto): Promise<Wish> {
    return this.wishesRepository.create(dto.name, dto.message);
  }

  async updateWish(id: number, dto: UpdateWishDto): Promise<Wish> {
    const existing = await this.wishesRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Lời chúc không còn tồn tại.');
    }
    const updated = await this.wishesRepository.update(id, dto.name, dto.message);
    if (!updated) {
      throw new NotFoundException('Lời chúc không còn tồn tại.');
    }
    return updated;
  }

  async deleteWish(id: number): Promise<{ id: number; deleted: boolean }> {
    const existing = await this.wishesRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Lời chúc không còn tồn tại.');
    }
    await this.wishesRepository.delete(id);
    return { id, deleted: true };
  }
}
