import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UnitController } from './unit.controller';
import { UnitService } from './unit.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UnitController],
  providers: [UnitService],
})
export class UnitModule {}
