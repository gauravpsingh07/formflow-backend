import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhooksService } from './webhooks.service';

@Controller('v1/webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateWebhookDto) {
    return this.webhooks.create(req.user.sub, dto);
  }

  @Get()
  list(@Req() req: any) {
    return this.webhooks.list(req.user.sub);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooks.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.webhooks.remove(req.user.sub, id);
  }

  @Get(':id/deliveries')
  listDeliveries(@Req() req: any, @Param('id') id: string) {
    return this.webhooks.listDeliveries(req.user.sub, id);
  }

  @Post(':id/test')
  test(@Req() req: any, @Param('id') id: string) {
    return this.webhooks.sendTest(req.user.sub, id);
  }
}

@Controller('internal/jobs/webhooks')
export class WebhooksJobsController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('retry')
  retry(
    @Headers('x-job-secret') jobSecret: string | undefined,
    @Body('limit') limit: number | undefined,
  ) {
    const expectedSecret = process.env.INTERNAL_JOB_SECRET;

    if (expectedSecret && jobSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid job secret');
    }

    return this.webhooks.retryDue(limit);
  }
}
