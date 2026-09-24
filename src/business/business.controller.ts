import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserType } from '@prisma/client';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { ChooseBusinessCategoryDto } from './dto/choose-business-category.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { UploadService } from 'src/upload/upload.service';
import { UploadedImage } from 'src/upload/uploaded-image';

const imageUpload = FileInterceptor('image', { storage: memoryStorage() });

@Controller('businesses')
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
  @Auth(UserType.ADMIN, UserType.EMPRESARIO)
  findAll(@GetUser() user: AuthUser) {
    return this.businessService.findAll(user);
  }

  @Get(':id')
  @Auth(UserType.ADMIN, UserType.EMPRESARIO)
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: AuthUser) {
    return this.businessService.findOne(id, user);
  }

  @Post()
  @Auth(UserType.EMPRESARIO)
  @UseInterceptors(imageUpload)
  async create(
    @Body() dto: CreateBusinessDto,
    @GetUser() user: AuthUser,
    @UploadedFile() image?: UploadedImage,
  ) {
    const imageUrl = image
      ? await this.uploadService.uploadImage(image, 'negocios')
      : undefined;
    return this.businessService.create(dto, user, imageUrl);
  }

  @Patch(':id/category')
  @Auth(UserType.ADMIN, UserType.EMPRESARIO)
  chooseCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChooseBusinessCategoryDto,
    @GetUser() user: AuthUser,
  ) {
    return this.businessService.chooseCategory(id, dto.categoryId, user);
  }

  @Patch(':id')
  @Auth(UserType.ADMIN, UserType.EMPRESARIO)
  @UseInterceptors(imageUpload)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessDto,
    @GetUser() user: AuthUser,
    @UploadedFile() image?: UploadedImage,
  ) {
    const imageUrl = image
      ? await this.uploadService.uploadImage(image, 'negocios')
      : undefined;
    return this.businessService.update(id, dto, user, imageUrl);
  }
}
