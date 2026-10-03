import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PublicationController } from './publication.controller';
import { PublicationService } from './publication.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublicationController],
  providers: [PublicationService],
  exports: [PublicationService],
})
export class PublicationModule {}
