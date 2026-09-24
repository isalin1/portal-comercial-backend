import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class UpdateAgendaAccessDto {
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0) return false;
    return value;
  })
  @IsBoolean()
  enabled: boolean;
}
