import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';

@Module({
  imports: [PrismaModule, AuthModule, UploadModule],
  controllers: [MarketController],
  providers: [MarketService],
})
export class MarketModule {}
