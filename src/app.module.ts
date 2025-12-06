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
import { BusinesModule } from './busines/busines.module';
import { PointsaleModule } from './pointsale/pointsale.module';
import { ServiceCategoryModule } from './servicecategory/servicecategory.module';
import { ListServiceModule } from './listservice/listservice.module';
import { PointSaleServiceModule } from './pointsaleservice/pointsaleservice.module';
import { EmailModule } from './email/email.module';
import { ServiceOrderModule } from './orderservice/serviceorder.module';
import { SalesOrderModule } from './salesorder/salesorder.module';
import { PaymentModule } from './payment/payment.module';
import { ExpenseModule } from './expenses/expense.module';
import { PlansModule } from './plans/plans.module';
import { PlanPaymentsModule } from './plan-payments/plan-payments.module';
import { BusinessPlansModule } from './business-plans/business-plans.module';
import { CashContributionsModule } from './cash-contributions/cash-contributions.module';
import { CashWithdrawalsModule } from './cash-withdrawals/cash-withdrawals.module';
import { TestController } from './test.controller';
import { UserService } from './user/user.service';
import { AnalyticsModule } from './analytics/analytics.module';

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
    BusinesModule, 
    PointsaleModule, 
    ServiceCategoryModule, 
    ListServiceModule, 
    PointSaleServiceModule, 
    EmailModule,
    ServiceOrderModule,
    SalesOrderModule,
    PaymentModule,
    ExpenseModule,
    PlansModule,
    PlanPaymentsModule,
    BusinessPlansModule,
    CashContributionsModule,
    CashWithdrawalsModule,
    AnalyticsModule,
  ],
  controllers: [AppController, TestController],
  providers: [AppService, UserService],
})
export class AppModule {}
