import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserType } from '@prisma/client';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { UploadService } from 'src/upload/upload.service';
import { UploadedImage } from 'src/upload/uploaded-image';
import { CreateMarketDto } from './dto/create-market.dto';
import { UpdateMarketDto } from './dto/update-market.dto';
import { MarketService } from './market.service';

const imageUpload = FileInterceptor('image', { storage: memoryStorage() });

@Controller('markets')
export class MarketController {
  constructor(
    private readonly marketService: MarketService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
  findAll() {
    return this.marketService.findAll();
  }

  @Post()
  @Auth(UserType.ADMIN)
  @UseInterceptors(imageUpload)
  async create(@Body() dto: CreateMarketDto, @UploadedFile() image?: UploadedImage) {
    const imageUrl = image ? await this.uploadService.uploadImage(image, 'mercados') : undefined;
    return this.marketService.create(dto, imageUrl);
  }

  @Patch(':id')
  @Auth(UserType.ADMIN)
  @UseInterceptors(imageUpload)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarketDto,
    @UploadedFile() image?: UploadedImage,
  ) {
    const imageUrl = image ? await this.uploadService.uploadImage(image, 'mercados') : undefined;
    return this.marketService.update(id, dto, imageUrl);
  }

  @Delete(':id')
  @Auth(UserType.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.marketService.remove(id);
  }
}
