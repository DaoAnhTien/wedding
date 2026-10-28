import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const VALIDATION_ERROR_MSG = 'Vui lòng nhập tên (tối đa 100 ký tự) và lời nhắn hợp lệ (tối đa 2.000 ký tự).';

export class CreateWishDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: VALIDATION_ERROR_MSG })
  @IsNotEmpty({ message: VALIDATION_ERROR_MSG })
  @MaxLength(100, { message: VALIDATION_ERROR_MSG })
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: VALIDATION_ERROR_MSG })
  @IsNotEmpty({ message: VALIDATION_ERROR_MSG })
  @MaxLength(2000, { message: VALIDATION_ERROR_MSG })
  message: string;
}
