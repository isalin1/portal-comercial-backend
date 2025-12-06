import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @Roles('SUPERADMIN')
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.plansService.create(createPlanDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERADMIN')
  findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(+id);
  }

  @Patch(':id')
  @Roles('SUPERADMIN')
  update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.plansService.update(+id, updatePlanDto);
  }

  @Delete(':id')
  @Roles('SUPERADMIN')
  remove(@Param('id') id: string) {
    return this.plansService.remove(+id);
  }
}


