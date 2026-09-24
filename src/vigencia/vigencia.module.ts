import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from 'src/prisma/prisma.module';
import { VigenciaService } from './vigencia.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [VigenciaService],
  exports: [VigenciaService],
})
export class VigenciaModule {}
