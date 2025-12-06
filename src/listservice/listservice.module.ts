import { Module } from '@nestjs/common';
import { ListServiceService } from './listservice.service';
import { ListserviceController } from './listservice.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ListserviceController],
  providers: [ListServiceService],
  exports: [ListServiceService],
})
export class ListServiceModule {}
