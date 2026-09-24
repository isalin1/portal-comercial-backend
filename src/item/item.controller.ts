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
import { ItemService } from './item.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { UploadService } from 'src/upload/upload.service';
import { UploadedImage } from 'src/upload/uploaded-image';

const imageUpload = FileInterceptor('image', { storage: memoryStorage() });

@Controller('items')
export class ItemController {
  constructor(
    private readonly itemService: ItemService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
  @Auth(UserType.ADMIN, UserType.EMPRESARIO)
  findAll(
    @GetUser() user: AuthUser,
    @Query('pointSaleId') pointSaleId?: string,
  ) {
    return this.itemService.findAll(
      user,
      pointSaleId ? Number(pointSaleId) : undefined,
    );
  }

  @Get(':id')
  @Auth(UserType.ADMIN, UserType.EMPRESARIO)
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: AuthUser) {
    return this.itemService.findOne(id, user);
  }

  @Post()
  @Auth(UserType.EMPRESARIO)
  @UseInterceptors(imageUpload)
  async create(
    @Body() dto: CreateItemDto,
    @GetUser() user: AuthUser,
    @UploadedFile() image?: UploadedImage,
  ) {
    const imageUrl = image
      ? await this.uploadService.uploadImage(image, 'items')
      : undefined;
    if (typeof dto.descriptions === 'string') {
      dto.descriptions = JSON.parse(dto.descriptions as unknown as string);
    }
    return this.itemService.create(dto, user, imageUrl);
  }

  @Patch(':id')
  @Auth(UserType.ADMIN, UserType.EMPRESARIO)
  @UseInterceptors(imageUpload)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
    @GetUser() user: AuthUser,
    @UploadedFile() image?: UploadedImage,
  ) {
    const imageUrl = image
      ? await this.uploadService.uploadImage(image, 'items')
      : undefined;
    if (typeof dto.descriptions === 'string') {
      dto.descriptions = JSON.parse(dto.descriptions as unknown as string);
    }
    return this.itemService.update(id, dto, user, imageUrl);
  }

  @Delete(':id')
  @Auth(UserType.EMPRESARIO)
  remove(@Param('id', ParseIntPipe) id: number, @GetUser() user: AuthUser) {
    return this.itemService.remove(id, user);
  }
}
