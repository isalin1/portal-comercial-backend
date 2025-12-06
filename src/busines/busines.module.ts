import { Module } from '@nestjs/common';
import { BusinesService } from './busines.service';
import { BusinesController } from './busines.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BusinesController],
  providers: [BusinesService],
})
export class BusinesModule {}
