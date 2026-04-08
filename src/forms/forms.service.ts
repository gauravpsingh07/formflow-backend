import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

@Injectable()
export class FormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
  ) {}

  async create(userId: string, dto: CreateFormDto) {
    const slug = await this.generateUniqueSlug(
      userId,
      slugify(dto.title) || 'untitled-form',
    );

    return this.prisma.form.create({
      data: {
        ownerId: userId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        slug,
      },
      select: this.formSelect(),
    });
  }

  async list(userId: string) {
    return this.prisma.form.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      select: this.formSelect(),
    });
  }

  async getOne(userId: string, formId: string) {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      select: {
        ownerId: true,
        ...this.formSelect(),
      },
    });

    if (!form) throw new NotFoundException('Form not found');
    if (form.ownerId !== userId) throw new ForbiddenException('Not your form');

    const { ownerId, ...rest } = form;
    return rest;
  }

  async updateOne(userId: string, formId: string, dto: UpdateFormDto) {
    await this.assertOwner(formId, userId);

    const title = dto.title?.trim();
    const description =
      dto.description === undefined
        ? undefined
        : dto.description.trim() || null;
    const slug =
      dto.slug === undefined ? undefined : slugify(dto.slug) || 'untitled-form';

    try {
      return await this.prisma.form.update({
        where: { id: formId },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(slug !== undefined ? { slug } : {}),
        },
        select: this.formSelect(),
      });
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('That slug is already in use');
      }
      throw error;
    }
  }

  async deleteOne(userId: string, formId: string) {
    await this.assertOwner(formId, userId);
    await this.prisma.form.delete({ where: { id: formId } });
    return { ok: true };
  }

  async publish(userId: string, formId: string) {
    await this.assertOwner(formId, userId);

    const fieldCount = await this.prisma.formField.count({ where: { formId } });
    if (fieldCount === 0) {
      throw new BadRequestException(
        'Add at least one field before publishing this form',
      );
    }

    const published = await this.prisma.form.update({
      where: { id: formId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      select: this.formSelect(),
    });

    void this.webhooks.emitForOwner(userId, 'FORM_PUBLISHED', {
      formId: published.id,
      title: published.title,
      slug: published.slug,
      publishedAt: published.publishedAt,
    });

    return published;
  }

  async unpublish(userId: string, formId: string) {
    const form = await this.assertOwner(formId, userId);

    const updated = await this.prisma.form.update({
      where: { id: formId },
      data: {
        status: 'DRAFT',
        publishedAt: null,
      },
      select: this.formSelect(),
    });

    if (form.status === 'PUBLISHED') {
      void this.webhooks.emitForOwner(userId, 'FORM_UNPUBLISHED', {
        formId: updated.id,
        title: updated.title,
        slug: updated.slug,
        unpublishedAt: new Date().toISOString(),
      });
    }

    return updated;
  }

  private async assertOwner(formId: string, userId: string) {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        ownerId: true,
        status: true,
      },
    });

    if (!form) throw new NotFoundException('Form not found');
    if (form.ownerId !== userId) throw new ForbiddenException('Not your form');

    return form;
  }

  private formSelect() {
    return {
      id: true,
      title: true,
      description: true,
      slug: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          fields: true,
          responses: true,
        },
      },
    } satisfies Prisma.FormSelect;
  }

  private async generateUniqueSlug(userId: string, base: string) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = `${base}-${Math.random().toString(36).slice(2, 8)}`;
      const exists = await this.prisma.form.findFirst({
        where: { ownerId: userId, slug: candidate },
        select: { id: true },
      });

      if (!exists) {
        return candidate;
      }
    }

    throw new ConflictException('Could not generate a unique slug');
  }
}
