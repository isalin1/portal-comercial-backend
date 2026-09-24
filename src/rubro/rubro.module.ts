import { Module } from '@nestjs/common';
import { RubroService } from './rubro.service';
import { RubroController } from './rubro.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, UploadModule, AuthModule],
  controllers: [RubroController],
  providers: [RubroService],
  exports: [RubroService],
})
export class RubroModule {}
