import { Wish, PaginatedResult } from './wish.interface';

export interface IWishesRepository {
  findAll(limit: number, offset: number): Promise<PaginatedResult<Wish>>;
  findById(id: number): Promise<Wish | null>;
  create(name: string, message: string): Promise<Wish>;
  update(id: number, name: string, message: string): Promise<Wish | null>;
  delete(id: number): Promise<boolean>;
}
