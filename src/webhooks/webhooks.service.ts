import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  WebhookDeliveryStatus,
  WebhookEventType,
} from '@prisma/client';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

const INTERNAL_TO_EXTERNAL_EVENT: Record<WebhookEventType, string> = {
  RESPONSE_CREATED: 'response.created',
  FORM_PUBLISHED: 'form.published',
  FORM_UNPUBLISHED: 'form.unpublished',
};

const EXTERNAL_TO_INTERNAL_EVENT: Record<string, WebhookEventType> = {
  'response.created': 'RESPONSE_CREATED',
  'form.published': 'FORM_PUBLISHED',
  'form.unpublished': 'FORM_UNPUBLISHED',
};

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWebhookDto) {
    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        ownerId: userId,
        url: dto.url,
        secret: dto.secret,
        enabled: dto.enabled ?? true,
        events: dto.events.map((event) => EXTERNAL_TO_INTERNAL_EVENT[event]),
      },
    });

    return this.toPublicEndpoint(endpoint);
  }

  async list(userId: string) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return endpoints.map((endpoint) => this.toPublicEndpoint(endpoint));
  }

  async update(userId: string, id: string, dto: UpdateWebhookDto) {
    await this.assertOwner(id, userId);

    const endpoint = await this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.secret !== undefined ? { secret: dto.secret } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.events !== undefined
          ? {
              events: dto.events.map(
                (event) => EXTERNAL_TO_INTERNAL_EVENT[event],
              ),
            }
          : {}),
      },
    });

    return this.toPublicEndpoint(endpoint);
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(id, userId);
    await this.prisma.webhookEndpoint.delete({ where: { id } });
    return { ok: true };
  }

  async listDeliveries(userId: string, id: string) {
    await this.assertOwner(id, userId);

    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: { endpointId: id },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        eventType: true,
        attempt: true,
        status: true,
        statusCode: true,
        lastError: true,
        nextRetryAt: true,
        deliveredAt: true,
        createdAt: true,
      },
    });

    return deliveries.map((delivery) => ({
      ...delivery,
      event: INTERNAL_TO_EXTERNAL_EVENT[delivery.eventType],
    }));
  }

  async sendTest(userId: string, id: string) {
    const endpoint = await this.assertOwner(id, userId);
    const eventType = endpoint.events[0] ?? 'RESPONSE_CREATED';
    const payload = {
      test: true,
      timestamp: new Date().toISOString(),
      endpointId: endpoint.id,
      message: 'FormFlow test delivery',
    };

    return this.deliver(endpoint, eventType, payload);
  }

  async retryDue(limit = 25) {
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: 'FAILED',
        nextRetryAt: {
          lte: new Date(),
        },
      },
      include: {
        endpoint: true,
      },
      orderBy: { nextRetryAt: 'asc' },
      take: Math.min(Math.max(limit, 1), 100),
    });

    const results: Array<{
      id: string;
      status: WebhookDeliveryStatus;
      statusCode?: number;
      error?: string;
    }> = [];
    for (const delivery of deliveries) {
      results.push(
        await this.deliver(
          delivery.endpoint,
          delivery.eventType,
          this.toJsonObject(delivery.payload),
          delivery.attempt + 1,
          delivery.id,
        ),
      );
    }

    return {
      retried: results.length,
      results,
    };
  }

  async emitForOwner(
    userId: string,
    eventType: WebhookEventType,
    payload: Prisma.InputJsonObject,
  ) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        ownerId: userId,
        enabled: true,
        events: {
          has: eventType,
        },
      },
    });

    await Promise.allSettled(
      endpoints.map((endpoint) => this.deliver(endpoint, eventType, payload)),
    );
  }

  private async assertOwner(id: string, userId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: { id },
    });

    if (!endpoint) throw new NotFoundException('Webhook not found');
    if (endpoint.ownerId !== userId) {
      throw new ForbiddenException('You do not own this webhook');
    }

    return endpoint;
  }

  private async deliver(
    endpoint: {
      id: string;
      url: string;
      secret: string;
      enabled: boolean;
    },
    eventType: WebhookEventType,
    payload: Prisma.InputJsonObject,
    attempt = 1,
    deliveryId?: string,
  ) {
    const body = JSON.stringify({
      id: deliveryId ?? undefined,
      type: INTERNAL_TO_EXTERNAL_EVENT[eventType],
      createdAt: new Date().toISOString(),
      data: payload,
    });

    const signature = createHmac('sha256', endpoint.secret)
      .update(body)
      .digest('hex');

    const delivery =
      deliveryId === undefined
        ? await this.prisma.webhookDelivery.create({
            data: {
              endpointId: endpoint.id,
              eventType,
              payload,
              attempt,
            },
          })
        : await this.prisma.webhookDelivery.update({
            where: { id: deliveryId },
            data: {
              attempt,
              status: 'PENDING',
              statusCode: null,
              lastError: null,
              nextRetryAt: null,
              deliveredAt: null,
            },
          });

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-formflow-event': INTERNAL_TO_EXTERNAL_EVENT[eventType],
          'x-formflow-signature': `sha256=${signature}`,
          'x-formflow-delivery-id': delivery.id,
        },
        body,
      });

      const status =
        response.ok || response.status < 500
          ? WebhookDeliveryStatus.SUCCESS
          : WebhookDeliveryStatus.FAILED;

      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status,
          statusCode: response.status,
          deliveredAt: response.ok ? new Date() : null,
          nextRetryAt:
            status === WebhookDeliveryStatus.FAILED
              ? this.nextRetryAt(attempt)
              : null,
          lastError: response.ok ? null : `HTTP ${response.status}`,
        },
      });

      return {
        id: delivery.id,
        status,
        statusCode: response.status,
      };
    } catch (error: any) {
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: WebhookDeliveryStatus.FAILED,
          lastError: error?.message ?? 'Network error',
          nextRetryAt: this.nextRetryAt(attempt),
        },
      });

      return {
        id: delivery.id,
        status: WebhookDeliveryStatus.FAILED,
        error: error?.message ?? 'Network error',
      };
    }
  }

  private nextRetryAt(attempt: number) {
    const delayMinutes = Math.min(2 ** Math.max(attempt - 1, 0), 60);
    return new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  private toJsonObject(value: Prisma.JsonValue): Prisma.InputJsonObject {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Prisma.InputJsonObject;
  }

  private toPublicEndpoint(endpoint: {
    id: string;
    url: string;
    enabled: boolean;
    events: WebhookEventType[];
    createdAt: Date;
    updatedAt: Date;
    secret: string;
  }) {
    return {
      id: endpoint.id,
      url: endpoint.url,
      enabled: endpoint.enabled,
      events: endpoint.events.map((event) => INTERNAL_TO_EXTERNAL_EVENT[event]),
      createdAt: endpoint.createdAt,
      updatedAt: endpoint.updatedAt,
      secretPreview: `••••${endpoint.secret.slice(-4)}`,
    };
  }
}
