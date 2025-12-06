import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BusinessPlansService } from './business-plans.service';

@Injectable()
export class BusinessPlansCronService {
  private readonly logger = new Logger(BusinessPlansCronService.name);

  constructor(private readonly businessPlansService: BusinessPlansService) {}

  /**
   * Ejecuta diariamente a las 2:00 AM para verificar y desactivar planes vencidos
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpiredPlansCheck() {
    this.logger.log('🔄 Iniciando verificación de planes vencidos...');
    
    try {
      const result = await this.businessPlansService.checkAndDeactivateExpiredPlans();
      
      this.logger.log(`✅ Verificación completada. Procesados ${result.processed} planes vencidos`);
      
      if (result.results.length > 0) {
        result.results.forEach((r: any) => {
          if (r.error) {
            this.logger.error(`❌ Error en plan ${r.planId}: ${r.error}`);
          } else {
            this.logger.log(`✅ Plan ${r.planId} (${r.businessName}): ${r.deactivatedUsers} usuarios desactivados`);
          }
        });
      }
    } catch (error) {
      this.logger.error('❌ Error en verificación de planes vencidos:', error);
    }
  }
}


