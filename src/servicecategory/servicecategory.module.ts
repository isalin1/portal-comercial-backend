import { Module } from '@nestjs/common';
import { ServiceCategoryService } from './servicecategory.service';
import { ServiceCategoryController } from './servicecategory.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceCategoryController],
  providers: [ServiceCategoryService],
  exports: [ServiceCategoryService],
})
export class ServiceCategoryModule {}
