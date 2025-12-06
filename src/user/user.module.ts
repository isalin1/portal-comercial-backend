import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessPlansModule } from '../business-plans/business-plans.module';

@Module({
  imports: [PrismaModule, BusinessPlansModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
