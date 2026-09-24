import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserType } from '@prisma/client';
import { RubroService } from './rubro.service';
import { CreateRubroDto } from './dto/create-rubro.dto';
import { UpdateRubroDto } from './dto/update-rubro.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { UploadService } from 'src/upload/upload.service';
import { UploadedImage } from 'src/upload/uploaded-image';

const imageUpload = FileInterceptor('image', { storage: memoryStorage() });

@Controller('rubros')
export class RubroController {
  constructor(
    private readonly rubroService: RubroService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
  findAll() {
    return this.rubroService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rubroService.findOne(id);
  }

  @Post()
  @Auth(UserType.ADMIN)
  @UseInterceptors(imageUpload)
  async create(
    @Body() dto: CreateRubroDto,
    @UploadedFile() image?: UploadedImage,
  ) {
    const imageUrl = image
      ? await this.uploadService.uploadImage(image, 'rubros')
      : undefined;
    return this.rubroService.create({ ...dto, imageUrl });
  }

  @Patch(':id')
  @Auth(UserType.ADMIN)
  @UseInterceptors(imageUpload)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRubroDto,
    @UploadedFile() image?: UploadedImage,
  ) {
    const imageUrl = image
      ? await this.uploadService.uploadImage(image, 'rubros')
      : undefined;
    return this.rubroService.update(id, { ...dto, imageUrl });
  }

  @Delete(':id')
  @Auth(UserType.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rubroService.remove(id);
  }
}
