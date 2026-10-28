import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { RSVPStatus } from '../interfaces/rsvp.interface';

const VALIDATION_ERROR_MSG = 'Vui lòng nhập tên (tối đa 100 ký tự) và lời nhắn hợp lệ (tối đa 2.000 ký tự).';
const STATUS_ERROR_MSG = 'Vui lòng chọn trạng thái tham dự hợp lệ.';

export class CreateRsvpDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: VALIDATION_ERROR_MSG })
  @IsNotEmpty({ message: VALIDATION_ERROR_MSG })
  @MaxLength(100, { message: VALIDATION_ERROR_MSG })
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString({ message: VALIDATION_ERROR_MSG })
  @MaxLength(2000, { message: VALIDATION_ERROR_MSG })
  @IsOptional()
  message?: string = '';

  @IsIn(['attending', 'not-attending', 'maybe'], { message: STATUS_ERROR_MSG })
  status: RSVPStatus;
}
