import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { AgendaService } from './agenda.service';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { CreateAgendaServiceDto } from './dto/create-agenda-service.dto';
import { UpdateAgendaServiceDto } from './dto/update-agenda-service.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateAppointmentPaymentDto } from './dto/create-appointment-payment.dto';
import { UpdateAgendaAccessDto } from './dto/update-agenda-access.dto';

@Controller('agenda')
@Auth(UserType.EMPRESARIO, UserType.ADMIN)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get('access/me')
  accessMe(@GetUser() user: AuthUser) {
    return this.agendaService.accessMe(user);
  }

  @Get('access')
  @Auth(UserType.ADMIN)
  listAccess() {
    return this.agendaService.listAccess();
  }

  @Patch('access/:userId')
  @Auth(UserType.ADMIN)
  setAccess(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateAgendaAccessDto,
  ) {
    return this.agendaService.setAccess(userId, dto.enabled);
  }

  @Get('businesses')
  businesses(@GetUser() user: AuthUser) {
    return this.agendaService.businesses(user);
  }

  @Get(':businessId/slots')
  slots(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query('date') date: string,
    @Query('serviceId', ParseIntPipe) serviceId: number,
    @GetUser() user: AuthUser,
  ) {
    return this.agendaService.slots(businessId, date, serviceId, user);
  }

  @Get(':businessId/days')
  days(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Query('date') date: string | undefined,
    @GetUser() user: AuthUser,
  ) {
    return this.agendaService.days(businessId, user, date);
  }

  @Get(':businessId/appointments')
  appointments(@Param('businessId', ParseIntPipe) businessId: number, @GetUser() user: AuthUser) {
    return this.agendaService.appointments(businessId, user);
  }

  @Post(':businessId/services')
  createService(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Body() dto: CreateAgendaServiceDto,
    @GetUser() user: AuthUser,
  ) {
    return this.agendaService.createService(businessId, dto, user);
  }

  @Post(':businessId/appointments')
  createAppointment(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Body() dto: CreateAppointmentDto,
    @GetUser() user: AuthUser,
  ) {
    return this.agendaService.createAppointment(businessId, dto, user);
  }

  @Put(':businessId')
  save(
    @Param('businessId', ParseIntPipe) businessId: number,
    @Body() dto: UpdateAgendaDto,
    @GetUser() user: AuthUser,
  ) {
    return this.agendaService.save(businessId, dto, user);
  }

  @Get(':businessId')
  get(@Param('businessId', ParseIntPipe) businessId: number, @GetUser() user: AuthUser) {
    return this.agendaService.get(businessId, user);
  }

  @Patch('services/:serviceId')
  updateService(
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Body() dto: UpdateAgendaServiceDto,
    @GetUser() user: AuthUser,
  ) {
    return this.agendaService.updateService(serviceId, dto, user);
  }

  @Post('appointments/:appointmentId/payments')
  addPayment(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() dto: CreateAppointmentPaymentDto,
    @GetUser() user: AuthUser,
  ) {
    return this.agendaService.addPayment(appointmentId, dto, user);
  }

  @Patch('appointments/:appointmentId/confirm')
  confirm(@Param('appointmentId', ParseIntPipe) appointmentId: number, @GetUser() user: AuthUser) {
    return this.agendaService.confirm(appointmentId, user);
  }

  @Patch('appointments/:appointmentId/cancel')
  cancel(@Param('appointmentId', ParseIntPipe) appointmentId: number, @GetUser() user: AuthUser) {
    return this.agendaService.cancel(appointmentId, user);
  }
}
