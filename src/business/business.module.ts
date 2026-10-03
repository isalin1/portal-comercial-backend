import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { AuthModule } from 'src/auth/auth.module';
import { PublicationModule } from 'src/publication/publication.module';

@Module({
  imports: [PrismaModule, UploadModule, AuthModule, PublicationModule],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}
