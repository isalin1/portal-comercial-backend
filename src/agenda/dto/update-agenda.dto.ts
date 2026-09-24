import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return value;
}

export class UpdateAgendaDto {
  @IsInt()
  @Min(5)
  @Max(240)
  slotMinutes: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  opensAt: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  closesAt: string;

  @Matches(/^[0-6](,[0-6])*$/)
  openDays: string;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  notifyClient: boolean;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  notifyProfessional: boolean;

  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  requiresPayment: boolean;

  @IsOptional()
  @IsInt()
  businessId?: number;
}
