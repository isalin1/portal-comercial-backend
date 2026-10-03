import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { DismissRejectionDto } from './dto/dismiss-rejection.dto';
import { PublicationService } from './publication.service';

@Controller('auditoria')
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  @Get()
  @Auth(UserType.ADMIN)
  list() {
    return this.publicationService.list();
  }

  @Get('negocios/:businessId')
  @Auth(UserType.ADMIN)
  detail(@Param('businessId', ParseIntPipe) businessId: number) {
    return this.publicationService.detail(businessId);
  }

  @Post('negocios/:businessId/aprobar')
  @Auth(UserType.ADMIN)
  approveBusiness(@Param('businessId', ParseIntPipe) businessId: number) {
    return this.publicationService.approveBusiness(businessId);
  }

  @Post('cambios/:id/aprobar')
  @Auth(UserType.ADMIN)
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.publicationService.approve(id);
  }

  @Post('cambios/:id/rechazar')
  @Auth(UserType.ADMIN)
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.publicationService.reject(id);
  }

  @Post('rechazos/quitar')
  @Auth(UserType.EMPRESARIO)
  dismiss(@Body() dto: DismissRejectionDto, @GetUser() user: AuthUser) {
    return this.publicationService.dismiss(user, dto.scope, dto.recordId);
  }
}
