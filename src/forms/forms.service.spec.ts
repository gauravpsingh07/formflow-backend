import { BadRequestException } from '@nestjs/common';
import { FormsService } from './forms.service';

describe('FormsService', () => {
  let service: FormsService;
  let prisma: {
    form: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    formField: {
      count: jest.Mock;
    };
  };
  let webhooks: {
    emitForOwner: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      form: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      formField: {
        count: jest.fn(),
      },
    };

    webhooks = {
      emitForOwner: jest.fn(),
    };

    service = new FormsService(prisma as never, webhooks as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a form with trimmed values and a generated slug', async () => {
    prisma.form.findFirst.mockResolvedValue(null);
    prisma.form.create.mockResolvedValue({
      id: 'form-1',
      title: 'Summer Internship Application',
      description: 'Share your portfolio',
      slug: 'summer-internship-application-abc123',
      status: 'DRAFT',
      publishedAt: null,
      createdAt: new Date('2026-04-05T00:00:00.000Z'),
      updatedAt: new Date('2026-04-05T00:00:00.000Z'),
      _count: {
        fields: 0,
        responses: 0,
      },
    });

    const result = await service.create('user-1', {
      title: '  Summer Internship Application  ',
      description: '  Share your portfolio  ',
    });

    expect(prisma.form.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 'user-1',
          title: 'Summer Internship Application',
          description: 'Share your portfolio',
          slug: expect.stringMatching(/^summer-internship-application-/),
        }),
      }),
    );
    expect(result.slug).toMatch(/^summer-internship-application-/);
  });

  it('rejects publishing a form with no fields', async () => {
    prisma.form.findUnique.mockResolvedValue({
      id: 'form-1',
      ownerId: 'user-1',
      status: 'DRAFT',
    });
    prisma.formField.count.mockResolvedValue(0);

    await expect(service.publish('user-1', 'form-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.form.update).not.toHaveBeenCalled();
    expect(webhooks.emitForOwner).not.toHaveBeenCalled();
  });

  it('publishes a form and emits a webhook event', async () => {
    const publishedAt = new Date('2026-04-05T12:00:00.000Z');

    prisma.form.findUnique.mockResolvedValue({
      id: 'form-1',
      ownerId: 'user-1',
      status: 'DRAFT',
    });
    prisma.formField.count.mockResolvedValue(2);
    prisma.form.update.mockResolvedValue({
      id: 'form-1',
      title: 'Candidate Survey',
      description: null,
      slug: 'candidate-survey',
      status: 'PUBLISHED',
      publishedAt,
      createdAt: new Date('2026-04-05T00:00:00.000Z'),
      updatedAt: publishedAt,
      _count: {
        fields: 2,
        responses: 0,
      },
    });

    const result = await service.publish('user-1', 'form-1');

    expect(prisma.form.update).toHaveBeenCalled();
    expect(webhooks.emitForOwner).toHaveBeenCalledWith(
      'user-1',
      'FORM_PUBLISHED',
      expect.objectContaining({
        formId: 'form-1',
        title: 'Candidate Survey',
        slug: 'candidate-survey',
        publishedAt,
      }),
    );
    expect(result.status).toBe('PUBLISHED');
  });
});
