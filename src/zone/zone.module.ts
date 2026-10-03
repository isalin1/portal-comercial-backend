import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ZoneController } from './zone.controller';
import { ZoneService } from './zone.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ZoneController],
  providers: [ZoneService],
})
export class ZoneModule {}
