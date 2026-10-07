import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { DepartmentsModule } from './departments/departments.module';
import { ProvincesModule } from './provinces/provinces.module';
import { DistrictsModule } from './districts/districts.module';
import { EmailModule } from './email/email.module';
import { UploadModule } from './upload/upload.module';
import { VigenciaModule } from './vigencia/vigencia.module';
import { RubroModule } from './rubro/rubro.module';
import { CategoryModule } from './category/category.module';
import { BusinessModule } from './business/business.module';
import { PointSalesModule } from './point-sales/point-sales.module';
import { ItemModule } from './item/item.module';
import { DirectoryModule } from './directory/directory.module';
import { AgendaModule } from './agenda/agenda.module';
import { UnitModule } from './unit/unit.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { SettingsModule } from './settings/settings.module';
import { PlanModule } from './plan/plan.module';
import { MarketModule } from './market/market.module';
import { ZoneModule } from './zone/zone.module';
import { PublicationModule } from './publication/publication.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    DepartmentsModule,
    ProvincesModule,
    DistrictsModule,
    EmailModule,
    UploadModule,
    VigenciaModule,
    RubroModule,
    CategoryModule,
    BusinessModule,
    PointSalesModule,
    ItemModule,
    DirectoryModule,
    AgendaModule,
    UnitModule,
    PedidosModule,
    SettingsModule,
    PlanModule,
    MarketModule,
    ZoneModule,
    PublicationModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
