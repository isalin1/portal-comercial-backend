import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PublicationModule } from 'src/publication/publication.module';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';

@Module({
  imports: [PrismaModule, AuthModule, PublicationModule],
  controllers: [AgendaController],
  providers: [AgendaService],
})
export class AgendaModule {}
