import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type AnalyticsPoint = {
  date: string;
  count: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFormAnalytics(formId: string, userId: string, days = 14) {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        fields: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            label: true,
            type: true,
            required: true,
            order: true,
          },
        },
      },
    });

    if (!form) throw new NotFoundException('Form not found');
    if (form.ownerId !== userId) throw new ForbiddenException('Not your form');

    const safeDays = Math.min(Math.max(days, 7), 90);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (safeDays - 1));

    const responses = await this.prisma.formResponse.findMany({
      where: { formId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        durationMs: true,
        answers: {
          select: {
            fieldId: true,
            value: true,
          },
        },
      },
    });

    const submissionsOverTime = this.buildSeries(responses, start, safeDays);
    const fieldIds = new Set(form.fields.map((field) => field.id));
    const requiredFieldIds = new Set(
      form.fields.filter((field) => field.required).map((field) => field.id),
    );
    const denominator = requiredFieldIds.size || fieldIds.size;

    let completionAccumulator = 0;
    let answersAccumulator = 0;
    let durationAccumulator = 0;
    let durationCount = 0;

    const fieldSummary = form.fields.map((field) => {
      const values = new Map<string, number>();
      let responseCount = 0;

      for (const response of responses) {
        const answer = response.answers.find(
          (item) => item.fieldId === field.id,
        );
        const normalized = this.normalizeAnswerValue(answer?.value);
        if (!normalized) continue;

        responseCount += 1;
        values.set(normalized, (values.get(normalized) ?? 0) + 1);
      }

      return {
        fieldId: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        responseCount,
        completionRatePercent: responses.length
          ? Math.round((responseCount / responses.length) * 100)
          : 0,
        topValues: [...values.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([value, count]) => ({ value, count })),
      };
    });

    for (const response of responses) {
      const answeredFieldIds = new Set(
        response.answers
          .filter((answer) => this.normalizeAnswerValue(answer.value))
          .map((answer) => answer.fieldId)
          .filter((fieldId) => fieldIds.has(fieldId)),
      );

      const answeredRequiredCount = requiredFieldIds.size
        ? [...requiredFieldIds].filter((fieldId) =>
            answeredFieldIds.has(fieldId),
          ).length
        : answeredFieldIds.size;

      completionAccumulator += denominator
        ? answeredRequiredCount / denominator
        : 1;
      answersAccumulator += answeredFieldIds.size;

      if (response.durationMs && response.durationMs > 0) {
        durationAccumulator += response.durationMs;
        durationCount += 1;
      }
    }

    return {
      form: {
        id: form.id,
        title: form.title,
        slug: form.slug,
        status: form.status,
        publishedAt: form.publishedAt,
      },
      summary: {
        totalResponses: responses.length,
        responsesInRange: submissionsOverTime.reduce(
          (total, point) => total + point.count,
          0,
        ),
        lastResponseAt: responses.at(-1)?.createdAt ?? null,
        completionRatePercent: responses.length
          ? Math.round((completionAccumulator / responses.length) * 100)
          : 0,
        averageAnswersPerResponse: responses.length
          ? Number((answersAccumulator / responses.length).toFixed(1))
          : 0,
        averageCompletionTimeSeconds: durationCount
          ? Math.round(durationAccumulator / durationCount / 1000)
          : null,
        totalFields: form.fields.length,
        requiredFields: requiredFieldIds.size,
      },
      submissionsOverTime,
      fieldSummary,
    };
  }

  private buildSeries(
    responses: Array<{ createdAt: Date }>,
    start: Date,
    days: number,
  ): AnalyticsPoint[] {
    const series = new Map<string, number>();

    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      series.set(this.dateKey(date), 0);
    }

    for (const response of responses) {
      if (response.createdAt < start) continue;
      const key = this.dateKey(response.createdAt);
      if (series.has(key)) {
        series.set(key, (series.get(key) ?? 0) + 1);
      }
    }

    return [...series.entries()].map(([date, count]) => ({ date, count }));
  }

  private dateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private normalizeAnswerValue(value: string | null | undefined) {
    if (value === null || value === undefined) return '';

    const normalized = String(value).trim();
    return normalized.length ? normalized : '';
  }
}
