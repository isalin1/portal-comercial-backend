import { Module } from '@nestjs/common';
import { ItemService } from './item.service';
import { ItemController } from './item.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { AuthModule } from 'src/auth/auth.module';
import { PublicationModule } from 'src/publication/publication.module';

@Module({
  imports: [PrismaModule, UploadModule, AuthModule, PublicationModule],
  controllers: [ItemController],
  providers: [ItemService],
  exports: [ItemService],
})
export class ItemModule {}
