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
import { CashWithdrawalsService } from './cash-withdrawals.service';
import { CreateCashWithdrawalDto } from './dto/create-cash-withdrawal.dto';
import { UpdateCashWithdrawalDto } from './dto/update-cash-withdrawal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('cash-withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashWithdrawalsController {
  constructor(private readonly cashWithdrawalsService: CashWithdrawalsService) {}

  @Post()
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  create(@Body() createCashWithdrawalDto: CreateCashWithdrawalDto) {
    return this.cashWithdrawalsService.create(createCashWithdrawalDto);
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
    return this.cashWithdrawalsService.findAll(params);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERADMIN', 'COLABORADOR')
  findOne(@Param('id') id: string) {
    return this.cashWithdrawalsService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  update(
    @Param('id') id: string,
    @Body() updateCashWithdrawalDto: UpdateCashWithdrawalDto,
  ) {
    return this.cashWithdrawalsService.update(+id, updateCashWithdrawalDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  remove(@Param('id') id: string) {
    return this.cashWithdrawalsService.remove(+id);
  }
}


