import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryWishDto {
  @IsOptional()
  @Transform(({ value }) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? Math.min(100, Math.max(1, Math.floor(num))) : 30;
  })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 30;

  @IsOptional()
  @Transform(({ value }) => {
    const num = Number(value);
    return Number.isFinite(num) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(num))) : 0;
  })
  @IsInt()
  @Min(0)
  offset: number = 0;
}
