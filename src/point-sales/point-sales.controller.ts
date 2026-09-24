import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import { PointSalesService } from './point-sales.service';
import { CreatePointSaleDto } from './dto/create-point-sale.dto';
import { UpdatePointSaleDto } from './dto/update-point-sale.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';

@Controller('point-sales')
export class PointSalesController {
  constructor(private readonly pointSalesService: PointSalesService) {}

  @Get()
  @Auth(UserType.ADMIN, UserType.EMPRESARIO)
  findAll(
    @GetUser() user: AuthUser,
    @Query('businessId') businessId?: string,
  ) {
    return this.pointSalesService.findAll(
      user,
      businessId ? Number(businessId) : undefined,
    );
  }

  @Get(':id')
  @Auth(UserType.ADMIN, UserType.EMPRESARIO)
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: AuthUser) {
    return this.pointSalesService.findOne(id, user);
  }

  @Post()
  @Auth(UserType.EMPRESARIO)
  create(@Body() dto: CreatePointSaleDto, @GetUser() user: AuthUser) {
    return this.pointSalesService.create(dto, user);
  }

  @Patch(':id')
  @Auth(UserType.ADMIN, UserType.EMPRESARIO)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePointSaleDto,
    @GetUser() user: AuthUser,
  ) {
    return this.pointSalesService.update(id, dto, user);
  }
}
