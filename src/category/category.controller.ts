import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserType } from '@prisma/client';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { UploadService } from 'src/upload/upload.service';
import { UploadedImage } from 'src/upload/uploaded-image';

const imageUpload = FileInterceptor('image', { storage: memoryStorage() });

@Controller('categories')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
  findAll(@Query('rubroId') rubroId?: string) {
    return this.categoryService.findAll(rubroId ? Number(rubroId) : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @Auth(UserType.ADMIN)
  @UseInterceptors(imageUpload)
  async create(
    @Body() dto: CreateCategoryDto,
    @UploadedFile() image?: UploadedImage,
  ) {
    const imageUrl = image
      ? await this.uploadService.uploadImage(image, 'categorias')
      : undefined;
    return this.categoryService.create({
      ...dto,
      rubroId: Number(dto.rubroId),
      imageUrl,
    });
  }

  @Patch(':id')
  @Auth(UserType.ADMIN)
  @UseInterceptors(imageUpload)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @UploadedFile() image?: UploadedImage,
  ) {
    const imageUrl = image
      ? await this.uploadService.uploadImage(image, 'categorias')
      : undefined;
    return this.categoryService.update(id, {
      ...dto,
      rubroId: dto.rubroId !== undefined ? Number(dto.rubroId) : undefined,
      imageUrl,
    });
  }

  @Delete(':id')
  @Auth(UserType.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }
}
