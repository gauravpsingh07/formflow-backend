import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { ResponsesController } from './responses/responses.controller';
import { ResponsesService } from './responses/responses.service';
import { FieldsController } from './fields/fields.controller';
import { FieldsService } from './fields/fields.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    FormsController,
    FieldsController,
    ResponsesController,
    AnalyticsController,
  ],
  providers: [FormsService, FieldsService, ResponsesService, AnalyticsService],
})
export class FormsModule {}
