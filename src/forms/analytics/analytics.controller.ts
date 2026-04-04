import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('v1/forms/:formId/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  getAnalytics(
    @Param('formId') formId: string,
    @Query('days') days = '14',
    @Req() req: any,
  ) {
    return this.analytics.getFormAnalytics(formId, req.user.sub, Number(days));
  }
}
