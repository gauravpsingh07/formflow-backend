import { WebhookDeliveryStatus } from '@prisma/client';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: {
    webhookDelivery: {
      findMany: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
    webhookEndpoint: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      webhookDelivery: {
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      webhookEndpoint: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new WebhooksService(prisma as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('retries due webhook deliveries and marks 5xx responses as failed', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-05T15:00:00.000Z'));

    prisma.webhookDelivery.findMany.mockResolvedValue([
      {
        id: 'delivery-1',
        endpointId: 'endpoint-1',
        endpoint: {
          id: 'endpoint-1',
          ownerId: 'user-1',
          url: 'https://example.com/hooks/formflow',
          secret: 'super-secret-key',
          enabled: true,
          events: ['RESPONSE_CREATED'],
        },
        eventType: 'RESPONSE_CREATED',
        payload: {
          responseId: 'response-1',
        },
        attempt: 1,
      },
    ]);
    prisma.webhookDelivery.update
      .mockResolvedValueOnce({
        id: 'delivery-1',
      })
      .mockResolvedValueOnce({
        id: 'delivery-1',
      });

    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 500 } as Response);

    const result = await service.retryDue();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/hooks/formflow',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-formflow-event': 'response.created',
          'x-formflow-delivery-id': 'delivery-1',
        }),
      }),
    );
    expect(prisma.webhookDelivery.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'delivery-1' },
        data: expect.objectContaining({
          status: WebhookDeliveryStatus.FAILED,
          statusCode: 500,
          lastError: 'HTTP 500',
          nextRetryAt: expect.any(Date),
        }),
      }),
    );
    expect(result).toEqual({
      retried: 1,
      results: [
        {
          id: 'delivery-1',
          status: WebhookDeliveryStatus.FAILED,
          statusCode: 500,
        },
      ],
    });
  });
});
