import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { PlanService } from './plan.service';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller('plans')
export class PlanController {
  constructor(private readonly plans: PlanService) {}

  @Get()
  findAll() {
    return this.plans.findAll();
  }

  @Patch(':id')
  @Auth(UserType.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlanDto) {
    return this.plans.update(id, dto);
  }
}
