import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CashContributionsService } from './cash-contributions.service';
import { CreateCashContributionDto } from './dto/create-cash-contribution.dto';
import { UpdateCashContributionDto } from './dto/update-cash-contribution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('cash-contributions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashContributionsController {
  constructor(private readonly cashContributionsService: CashContributionsService) {}

  @Post()
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  create(@Body() createCashContributionDto: CreateCashContributionDto) {
    return this.cashContributionsService.create(createCashContributionDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  findAll(
    @Query('pointsaleId') pointsaleId?: string,
    @Query('date') date?: string,
  ) {
    const params: any = {};
    if (pointsaleId) {
      params.pointsaleId = parseInt(pointsaleId, 10);
    }
    if (date) {
      params.date = date;
    }
    return this.cashContributionsService.findAll(params);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  findOne(@Param('id') id: string) {
    return this.cashContributionsService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  update(
    @Param('id') id: string,
    @Body() updateCashContributionDto: UpdateCashContributionDto,
  ) {
    return this.cashContributionsService.update(+id, updateCashContributionDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  remove(@Param('id') id: string) {
    return this.cashContributionsService.remove(+id);
  }
}


