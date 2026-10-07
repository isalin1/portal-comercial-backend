import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { TrackEngagementDto } from './dto/track-engagement.dto';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Post('public/metrics/events')
  track(@Body() dto: TrackEngagementDto) {
    return this.metricsService.track(dto);
  }

  @Get('metrics/whatsapp-day')
  @Auth(UserType.ADMIN)
  whatsappDay(@Query('date') date?: string, @Query('zoneId') zoneId?: string) {
    return this.metricsService.whatsappOrdersDay(date, zoneId);
  }
}
