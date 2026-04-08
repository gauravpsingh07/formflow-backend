import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
  ) {}

  async getPublicFormBySlug(slug: string) {
    const form = await this.prisma.form.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        title: true,
        description: true,
        slug: true,
        status: true,
        publishedAt: true,
        fields: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            type: true,
            label: true,
            required: true,
            order: true,
            placeholder: true,
            options: true,
          },
        },
      },
    });

    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async submitBySlug(slug: string, body: any) {
    const answersObj = body?.answers;
    if (!answersObj || typeof answersObj !== 'object') {
      throw new BadRequestException(
        'Invalid payload: expected { answers: { [fieldId]: value } }',
      );
    }

    const form = await this.prisma.form.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: {
        id: true,
        ownerId: true,
        title: true,
        fields: {
          select: {
            id: true,
            label: true,
            required: true,
            type: true,
            options: true,
          },
        },
      },
    });

    if (!form) throw new NotFoundException('Form not found');

    for (const f of form.fields) {
      const v = answersObj[f.id];
      const empty = this.isEmpty(v);
      if (!f.required && empty) continue;
      if (empty)
        throw new BadRequestException(`Missing required field: ${f.id}`);

      this.validateFieldValue(f, v);
    }

    const durationMs = this.getDurationMs(body?.meta?.startedAt);

    const result = await this.prisma.$transaction(async (tx) => {
      const response = await tx.formResponse.create({
        data: {
          formId: form.id,
          durationMs,
        },
        select: { id: true, createdAt: true },
      });

      const allowedFieldIds = new Set(form.fields.map((f) => f.id));

      const answers = Object.entries(answersObj)
        .filter(([fieldId]) => allowedFieldIds.has(fieldId))
        .map(([fieldId, value]) => ({
          responseId: response.id,
          fieldId,
          value: value === undefined || value === null ? null : String(value),
        }));

      if (answers.length) {
        await tx.formAnswer.createMany({ data: answers });
      }

      return { ok: true, responseId: response.id };
    });

    void this.webhooks.emitForOwner(form.ownerId, 'RESPONSE_CREATED', {
      formId: form.id,
      formTitle: form.title,
      responseId: result.responseId,
      submittedAt: new Date().toISOString(),
    });

    return result;
  }

  private isEmpty(value: unknown) {
    return (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  private getDurationMs(startedAt: unknown) {
    if (typeof startedAt !== 'string') return null;

    const started = new Date(startedAt);
    if (Number.isNaN(started.getTime())) return null;

    const duration = Date.now() - started.getTime();
    if (duration <= 0) return null;

    return duration;
  }

  private validateFieldValue(
    field: { type: string; label: string; options?: unknown },
    value: unknown,
  ) {
    if (this.isEmpty(value)) return;

    if (field.type === 'NUMBER' && Number.isNaN(Number(value))) {
      throw new BadRequestException(`Field "${field.label}" must be a number`);
    }

    if (field.type === 'EMAIL') {
      const email = String(value);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException(
          `Field "${field.label}" must be an email`,
        );
      }
    }

    if (field.type === 'SELECT' || field.type === 'RADIO') {
      const options = Array.isArray(field.options) ? field.options : [];
      if (options.length && !options.includes(String(value))) {
        throw new BadRequestException(
          `Field "${field.label}" has an invalid option`,
        );
      }
    }
  }
}
