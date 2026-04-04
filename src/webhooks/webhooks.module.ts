import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WebhooksController, WebhooksJobsController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [WebhooksController, WebhooksJobsController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
