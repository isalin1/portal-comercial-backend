import { Module } from '@nestjs/common';
import { DirectoryService } from './directory.service';
import { DirectoryController } from './directory.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PublicationModule } from 'src/publication/publication.module';

@Module({
  imports: [PrismaModule, PublicationModule],
  controllers: [DirectoryController],
  providers: [DirectoryService],
})
export class DirectoryModule {}
