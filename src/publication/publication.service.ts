import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserType } from '@prisma/client';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';
import { PrismaService } from 'src/prisma/prisma.service';

export interface TextDraft {
  field: string;
  label: string;
  before?: string | null;
  after?: string | null;
  value?: string | null;
}

const IDENTITY = ['commercialName', 'commercialDescription'];
const PENDING = ['ALTA', 'CAMBIO'];
const UNPUBLISHED = ['ALTA', 'RECHAZADO'];

@Injectable()
export class PublicationService {
  constructor(private readonly prisma: PrismaService) {}

  private text(value?: string | null) {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : null;
  }

  private reviews(user: AuthUser) {
    return user.userType === UserType.EMPRESARIO;
  }

  async hiddenBusinessIds() {
    const rows = await this.prisma.publicationChange.findMany({
      where: { scope: 'BUSINESS', kind: { in: UNPUBLISHED }, field: { in: IDENTITY } },
      select: { businessId: true },
    });
    return [...new Set(rows.map((row) => row.businessId))];
  }

  async trackCreate(user: AuthUser, businessId: number, scope: string, recordId: number, fields: TextDraft[]) {
    if (!this.reviews(user)) return;
    for (const field of fields) {
      const value = this.text(field.value ?? field.after);
      if (field.field === 'imageUrl' && !value) continue;
      if (!value && field.field !== 'imageUrl') continue;
      await this.prisma.publicationChange.upsert({
        where: { scope_recordId_field: { scope, recordId, field: field.field } },
        create: {
          businessId,
          scope,
          recordId,
          field: field.field,
          label: field.label,
          kind: 'ALTA',
          beforeText: null,
          afterText: value,
        },
        update: { label: field.label, afterText: value, kind: 'ALTA' },
      });
    }
  }

  async reviewFields(user: AuthUser, businessId: number, scope: string, recordId: number, fields: TextDraft[]) {
    const blocked = new Set<string>();
    if (!fields.length) return blocked;
    if (!this.reviews(user)) {
      await this.prisma.publicationChange.deleteMany({
        where: { scope, recordId, field: { in: fields.map((field) => field.field) } },
      });
      return blocked;
    }
    const unpublished = await this.prisma.publicationChange.count({
      where: {
        scope,
        recordId,
        OR: [{ kind: 'ALTA' }, { kind: 'RECHAZADO', beforeText: null }],
      },
    });
    for (const field of fields) {
      const after = this.text(field.after);
      const before = this.text(field.before);
      const current = await this.prisma.publicationChange.findUnique({
        where: { scope_recordId_field: { scope, recordId, field: field.field } },
      });
      if (current?.kind === 'ALTA') {
        if (current.afterText !== after) {
          await this.prisma.publicationChange.update({
            where: { id: current.id },
            data: { afterText: after, label: field.label },
          });
        }
        continue;
      }
      if (current?.kind === 'RECHAZADO') {
        const resubmit = current.beforeText == null ? 'ALTA' : 'CAMBIO';
        if (resubmit === 'CAMBIO' && this.text(current.beforeText) === after) {
          await this.prisma.publicationChange.delete({ where: { id: current.id } });
          blocked.add(field.field);
          continue;
        }
        if (resubmit === 'CAMBIO') blocked.add(field.field);
        await this.prisma.publicationChange.update({
          where: { id: current.id },
          data: {
            kind: resubmit,
            label: field.label,
            afterText: after,
            beforeText: resubmit === 'CAMBIO' ? current.beforeText : null,
          },
        });
        continue;
      }
      if (before === after) {
        if (current) await this.prisma.publicationChange.delete({ where: { id: current.id } });
        continue;
      }
      if (current?.kind === 'CAMBIO' && this.text(current.beforeText) === after) {
        await this.prisma.publicationChange.delete({ where: { id: current.id } });
        blocked.add(field.field);
        continue;
      }
      const kind = unpublished > 0 ? 'ALTA' : 'CAMBIO';
      if (kind === 'CAMBIO') blocked.add(field.field);
      await this.prisma.publicationChange.upsert({
        where: { scope_recordId_field: { scope, recordId, field: field.field } },
        create: {
          businessId,
          scope,
          recordId,
          field: field.field,
          label: field.label,
          kind,
          beforeText: kind === 'CAMBIO' ? before : null,
          afterText: after,
        },
        update: {
          label: field.label,
          afterText: after,
          ...(current ? {} : { kind, beforeText: kind === 'CAMBIO' ? before : null }),
        },
      });
    }
    return blocked;
  }

  async forget(scope: string, recordId: number) {
    await this.prisma.publicationChange.deleteMany({ where: { scope, recordId } });
  }

  async assertPublished(scope: string, recordId: number) {
    const pending = await this.prisma.publicationChange.findFirst({
      where: { scope, recordId, kind: { in: UNPUBLISHED } },
      select: { id: true },
    });
    return !pending;
  }

  private flags(changes: { kind: string }[]) {
    return {
      pendingApproval: changes.some((change) => PENDING.includes(change.kind)),
      rejected: changes.some((change) => change.kind === 'RECHAZADO'),
    };
  }

  private overlay<T extends object>(record: T, changes: { field: string; kind: string; afterText: string | null }[], fields: string[]) {
    const next: Record<string, unknown> = { ...(record as Record<string, unknown>) };
    for (const change of changes) {
      if ((change.kind === 'CAMBIO' || change.kind === 'RECHAZADO') && fields.includes(change.field)) {
        next[change.field] = change.afterText ?? '';
      }
    }
    return next as T;
  }

  async decorateBusinesses<T extends { id: number; pointSales?: unknown[] }>(user: AuthUser, businesses: T[]) {
    if (user.userType !== UserType.EMPRESARIO || !businesses.length) {
      return businesses.map((business) => ({ ...business, pendingApproval: false, rejected: false }));
    }
    const changes = await this.prisma.publicationChange.findMany({
      where: { businessId: { in: businesses.map((business) => business.id) } },
    });
    return businesses.map((business) => this.applyBusiness(business, changes.filter((change) => change.businessId === business.id)));
  }

  async decorateBusiness<T extends { id: number; pointSales?: unknown[] }>(user: AuthUser, business: T) {
    const [decorated] = await this.decorateBusinesses(user, [business]);
    return decorated;
  }

  private applyBusiness<T extends { id: number; pointSales?: unknown[] }>(business: T, changes: Prisma.PublicationChangeGetPayload<object>[]) {
    const own = changes.filter((change) => change.scope === 'BUSINESS' && change.recordId === business.id);
    const next = this.overlay(business as T & Record<string, unknown>, own, ['legalName', 'commercialName', 'commercialDescription', 'imageUrl']);
    const pointSales = ((business.pointSales || []) as { id: number; address?: Record<string, unknown> | null; items?: { id: number; descriptions?: { id: number; description: string }[] }[] }[]).map((point) => {
      const pointChanges = changes.filter((change) => change.scope === 'POINT' && change.recordId === point.id);
      const patched = this.overlay(point as Record<string, unknown>, pointChanges, ['name', 'phone']);
      const address = point.address ? this.overlay(point.address, pointChanges, ['street', 'urbanZone', 'reference']) : point.address;
      const items = (point.items || []).map((item) => this.applyItem(item, changes));
      return { ...patched, address, items, ...this.flags(pointChanges) };
    });
    return { ...next, pointSales, ...this.flags(own) };
  }

  private applyItem<T extends { id: number; descriptions?: { id: number; description: string }[] }>(item: T, changes: { scope: string; recordId: number; field: string; kind: string; afterText: string | null }[]) {
    const own = changes.filter((change) => change.scope === 'ITEM' && change.recordId === item.id);
    const descriptions = (item.descriptions || []).map((line) => {
      const change = changes.find((row) => row.scope === 'DESCRIPTION' && row.recordId === line.id && row.field === 'description');
      if (!change) return { ...line, pendingApproval: false, rejected: false };
      return {
        ...line,
        description: change.kind === 'CAMBIO' || change.kind === 'RECHAZADO' ? change.afterText || line.description : line.description,
        ...this.flags([change]),
      };
    });
    const next = this.overlay({ ...item, descriptions } as T & Record<string, unknown>, own, ['name', 'imageUrl']);
    const pendingApproval = this.flags(own).pendingApproval || descriptions.some((line) => line.pendingApproval);
    const rejected = this.flags(own).rejected || descriptions.some((line) => line.rejected);
    return { ...next, descriptions, pendingApproval, rejected };
  }

  async decorateItems<T extends { id: number; descriptions?: { id: number; description: string }[] }>(user: AuthUser, items: T[]) {
    if (user.userType !== UserType.EMPRESARIO || !items.length) {
      return items.map((item) => ({ ...item, pendingApproval: false, rejected: false, descriptions: (item.descriptions || []).map((line) => ({ ...line, pendingApproval: false, rejected: false })) }));
    }
    const descriptionIds = items.flatMap((item) => (item.descriptions || []).map((line) => line.id));
    const changes = await this.prisma.publicationChange.findMany({
      where: {
        OR: [
          { scope: 'ITEM', recordId: { in: items.map((item) => item.id) } },
          ...(descriptionIds.length ? [{ scope: 'DESCRIPTION', recordId: { in: descriptionIds } }] : []),
        ],
      },
    });
    return items.map((item) => this.applyItem(item, changes));
  }

  async decoratePoints<T extends { id: number; businessId: number; address?: Record<string, unknown> | null }>(user: AuthUser, points: T[]) {
    if (user.userType !== UserType.EMPRESARIO || !points.length) {
      return points.map((point) => ({ ...point, pendingApproval: false, rejected: false }));
    }
    const changes = await this.prisma.publicationChange.findMany({
      where: { scope: 'POINT', recordId: { in: points.map((point) => point.id) } },
    });
    return points.map((point) => {
      const own = changes.filter((change) => change.recordId === point.id);
      const patched = this.overlay(point as T & Record<string, unknown>, own, ['name', 'phone']);
      const address = point.address ? this.overlay(point.address, own, ['street', 'urbanZone', 'reference']) : point.address;
      return { ...patched, address, ...this.flags(own) };
    });
  }

  async decorateOffers<T extends { id: number; name: string }>(user: AuthUser, offers: T[]) {
    if (user.userType !== UserType.EMPRESARIO || !offers.length) {
      return offers.map((offer) => ({ ...offer, pendingApproval: false, rejected: false }));
    }
    const changes = await this.prisma.publicationChange.findMany({
      where: { scope: 'MENU_OFFER', recordId: { in: offers.map((offer) => offer.id) }, field: 'name' },
    });
    return offers.map((offer) => {
      const change = changes.find((row) => row.recordId === offer.id);
      if (!change) return { ...offer, pendingApproval: false, rejected: false };
      return {
        ...offer,
        name: change.kind === 'CAMBIO' || change.kind === 'RECHAZADO' ? change.afterText || offer.name : offer.name,
        ...this.flags([change]),
      };
    });
  }

  async decorateServices<T extends { id: number; name: string }>(user: AuthUser, services: T[]) {
    if (user.userType !== UserType.EMPRESARIO || !services.length) {
      return services.map((service) => ({ ...service, pendingApproval: false, rejected: false }));
    }
    const changes = await this.prisma.publicationChange.findMany({
      where: { scope: 'AGENDA_SERVICE', recordId: { in: services.map((service) => service.id) }, field: 'name' },
    });
    return services.map((service) => {
      const change = changes.find((row) => row.recordId === service.id);
      if (!change) return { ...service, pendingApproval: false, rejected: false };
      return {
        ...service,
        name: change.kind === 'CAMBIO' || change.kind === 'RECHAZADO' ? change.afterText || service.name : service.name,
        ...this.flags([change]),
      };
    });
  }

  async hideUnpublished<T extends {
    id: number
    imageUrl?: string | null
    menuOffers?: { id: number }[]
    pointSales?: {
      id: number
      items?: {
        id: number
        imageUrl?: string | null
        descriptions?: { id: number }[]
      }[]
    }[]
  }>(rows: T[]) {
    if (!rows.length) return rows;
    const changes = await this.prisma.publicationChange.findMany({
      where: { businessId: { in: rows.map((row) => row.id) }, kind: { in: UNPUBLISHED } },
    });
    if (!changes.length) return rows;
    return rows.flatMap((row) => {
      const mine = changes.filter((change) => change.businessId === row.id);
      if (mine.some((change) => change.scope === 'BUSINESS' && IDENTITY.includes(change.field))) return [];
      const pointSales = (row.pointSales || []).flatMap((point) => {
        if (mine.some((change) => change.scope === 'POINT' && change.recordId === point.id)) return [];
        const items = (point.items || []).flatMap((item) => {
          if (mine.some((change) => change.scope === 'ITEM' && change.recordId === item.id && change.field === 'name')) return [];
          const hideImage = mine.some((change) => change.scope === 'ITEM' && change.recordId === item.id && change.field === 'imageUrl');
          const descriptions = (item.descriptions || []).filter(
            (line) => !mine.some((change) => change.scope === 'DESCRIPTION' && change.recordId === line.id),
          );
          return [{ ...item, imageUrl: hideImage ? null : item.imageUrl, descriptions }];
        });
        return [{ ...point, items }];
      });
      const hiddenOffers = new Set(mine.filter((change) => change.scope === 'MENU_OFFER').map((change) => change.recordId));
      return [{
        ...row,
        imageUrl: mine.some((change) => change.scope === 'BUSINESS' && change.field === 'imageUrl') ? null : row.imageUrl,
        pointSales,
        menuOffers: (row.menuOffers || []).filter((offer) => !hiddenOffers.has(offer.id)),
      }];
    });
  }

  async list() {
    const changes = await this.prisma.publicationChange.findMany({
      where: { kind: { in: PENDING } },
      orderBy: { createdAt: 'asc' },
      include: {
        business: {
          select: {
            id: true,
            commercialName: true,
            rubro: { select: { name: true } },
            category: { select: { name: true } },
          },
        },
      },
    });
    const groups = new Map<number, {
      businessId: number
      commercialName: string
      rubroName: string
      categoryName: string
      label: string
      count: number
      oldestAt: Date
    }>();
    for (const change of changes) {
      const current = groups.get(change.businessId);
      if (current) {
        current.count += 1;
        continue;
      }
      groups.set(change.businessId, {
        businessId: change.businessId,
        commercialName: change.business.commercialName,
        rubroName: change.business.rubro.name,
        categoryName: change.business.category?.name || 'Sin categoría',
        label: change.label,
        count: 1,
        oldestAt: change.createdAt,
      });
    }
    return [...groups.values()];
  }

  async detail(businessId: number) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        commercialName: true,
        rubro: { select: { name: true } },
        category: { select: { name: true } },
      },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    const changes = await this.prisma.publicationChange.findMany({
      where: { businessId, kind: { in: PENDING } },
      orderBy: { createdAt: 'asc' },
    });
    return {
      businessId: business.id,
      commercialName: business.commercialName,
      rubroName: business.rubro.name,
      categoryName: business.category?.name || 'Sin categoría',
      changes: changes.map((change) => ({
        id: change.id,
        label: change.label,
        kind: change.kind,
        field: change.field,
        beforeText: change.beforeText,
        afterText: change.afterText,
        image: change.field === 'imageUrl',
        createdAt: change.createdAt,
      })),
    };
  }

  async approve(id: number) {
    const change = await this.prisma.publicationChange.findUnique({ where: { id } });
    if (!change || !PENDING.includes(change.kind)) throw new NotFoundException('Ese cambio ya no está pendiente');
    if (change.kind === 'CAMBIO') await this.apply(change);
    await this.prisma.publicationChange.delete({ where: { id } });
    return { ok: true };
  }

  async approveBusiness(businessId: number) {
    const changes = await this.prisma.publicationChange.findMany({
      where: { businessId, kind: { in: PENDING } },
      orderBy: { createdAt: 'asc' },
    });
    for (const change of changes) {
      if (change.kind === 'CAMBIO') await this.apply(change);
      await this.prisma.publicationChange.delete({ where: { id: change.id } }).catch(() => undefined);
    }
    return { ok: true, approved: changes.length };
  }

  async reject(id: number) {
    const change = await this.prisma.publicationChange.findUnique({ where: { id } });
    if (!change || !PENDING.includes(change.kind)) throw new NotFoundException('Ese cambio ya no está pendiente');
    await this.prisma.publicationChange.update({ where: { id }, data: { kind: 'RECHAZADO' } });
    return { ok: true };
  }

  async dismiss(user: AuthUser, scope: string, recordId: number) {
    let changes = await this.prisma.publicationChange.findMany({
      where: { scope, recordId, kind: 'RECHAZADO' },
    });
    if (scope === 'ITEM') {
      const lines = await this.prisma.itemDescription.findMany({ where: { itemId: recordId }, select: { id: true } });
      if (lines.length) {
        const extra = await this.prisma.publicationChange.findMany({
          where: { scope: 'DESCRIPTION', recordId: { in: lines.map((line) => line.id) }, kind: 'RECHAZADO' },
        });
        changes = [...changes, ...extra];
      }
    }
    if (!changes.length) throw new NotFoundException('No hay información rechazada para quitar');
    const business = await this.prisma.business.findUnique({
      where: { id: changes[0].businessId },
      select: { userId: true },
    });
    if (!business || business.userId !== user.id) throw new ForbiddenException('No puedes quitar esta información');
    const fresh = changes.filter((change) => change.beforeText == null);
    const edited = changes.filter((change) => change.beforeText != null);
    if (edited.length) {
      await this.prisma.publicationChange.deleteMany({ where: { id: { in: edited.map((change) => change.id) } } });
    }
    if (!fresh.length) return { deleted: false };
    for (const change of fresh.filter((row) => row.scope === 'DESCRIPTION' && scope !== 'DESCRIPTION')) {
      await this.prisma.itemDescription.delete({ where: { id: change.recordId } }).catch(() => undefined);
      await this.prisma.publicationChange.delete({ where: { id: change.id } }).catch(() => undefined);
    }
    const ownFresh = fresh.filter((row) => row.scope === scope);
    if (!ownFresh.length) return { deleted: false };
    const removed = await this.removeUnpublished(scope, recordId, ownFresh);
    if (!removed) {
      await this.prisma.publicationChange.deleteMany({ where: { id: { in: fresh.map((change) => change.id) } } });
    }
    return { deleted: removed };
  }

  private async removeUnpublished(scope: string, recordId: number, changes: { id: number; field: string; scope: string; recordId: number }[]) {
    const fields = new Set(changes.map((change) => change.field));
    if (scope === 'BUSINESS' && (fields.has('legalName') || fields.has('commercialName'))) {
      await this.prisma.business.delete({ where: { id: recordId } });
      return true;
    }
    if (scope === 'POINT' && (fields.has('name') || fields.has('phone') || fields.has('street'))) {
      await this.prisma.pointSale.delete({ where: { id: recordId } });
      await this.prisma.publicationChange.deleteMany({ where: { scope, recordId } });
      return true;
    }
    if (scope === 'ITEM' && fields.has('name')) {
      const lines = await this.prisma.itemDescription.findMany({ where: { itemId: recordId }, select: { id: true } });
      await this.prisma.item.delete({ where: { id: recordId } });
      await this.prisma.publicationChange.deleteMany({
        where: {
          OR: [
            { scope: 'ITEM', recordId },
            ...(lines.length ? [{ scope: 'DESCRIPTION', recordId: { in: lines.map((line) => line.id) } }] : []),
          ],
        },
      });
      return true;
    }
    if (scope === 'DESCRIPTION') {
      await this.prisma.itemDescription.delete({ where: { id: recordId } }).catch(() => undefined);
      await this.prisma.publicationChange.deleteMany({ where: { scope, recordId } });
      return true;
    }
    if (scope === 'MENU_OFFER') {
      await this.prisma.menuOffer.delete({ where: { id: recordId } });
      await this.prisma.publicationChange.deleteMany({ where: { scope, recordId } });
      return true;
    }
    if (scope === 'AGENDA_SERVICE') {
      await this.prisma.agendaService.delete({ where: { id: recordId } });
      await this.prisma.publicationChange.deleteMany({ where: { scope, recordId } });
      return true;
    }
    for (const change of changes) {
      if (change.field === 'imageUrl' && scope === 'BUSINESS') {
        await this.prisma.business.update({ where: { id: recordId }, data: { imageUrl: null } });
      }
      if (change.field === 'commercialDescription') {
        await this.prisma.business.update({ where: { id: recordId }, data: { commercialDescription: '' } });
      }
      if (change.field === 'imageUrl' && scope === 'ITEM') {
        await this.prisma.item.update({ where: { id: recordId }, data: { imageUrl: null } });
      }
      if (change.field === 'urbanZone' || change.field === 'reference') {
        const point = await this.prisma.pointSale.findUnique({ where: { id: recordId }, select: { addressId: true } });
        if (!point) continue;
        await this.prisma.address.update({
          where: { id: point.addressId },
          data: change.field === 'urbanZone' ? { urbanZone: null } : { reference: null },
        });
      }
    }
    return false;
  }

  private async apply(change: { scope: string; recordId: number; field: string; afterText: string | null }) {
    const value = change.afterText;
    try {
      if (change.scope === 'BUSINESS') {
        const data: Prisma.BusinessUpdateInput = {};
        if (change.field === 'imageUrl') data.imageUrl = value;
        if (change.field === 'legalName' && value) data.legalName = value;
        if (change.field === 'commercialName' && value) data.commercialName = value;
        if (change.field === 'commercialDescription') data.commercialDescription = value || '';
        if (Object.keys(data).length) await this.prisma.business.update({ where: { id: change.recordId }, data });
      }
      if (change.scope === 'POINT') {
        if (change.field === 'name' && value) await this.prisma.pointSale.update({ where: { id: change.recordId }, data: { name: value } });
        if (change.field === 'phone' && value) await this.prisma.pointSale.update({ where: { id: change.recordId }, data: { phone: value } });
        if (['street', 'urbanZone', 'reference'].includes(change.field)) {
          const point = await this.prisma.pointSale.findUnique({ where: { id: change.recordId }, select: { addressId: true } });
          if (!point) return;
          const data: Prisma.AddressUpdateInput = {};
          if (change.field === 'street' && value) data.street = value;
          if (change.field === 'urbanZone') data.urbanZone = value;
          if (change.field === 'reference') data.reference = value;
          await this.prisma.address.update({ where: { id: point.addressId }, data });
        }
      }
      if (change.scope === 'ITEM') {
        if (change.field === 'name' && value) await this.prisma.item.update({ where: { id: change.recordId }, data: { name: value } });
        if (change.field === 'imageUrl') await this.prisma.item.update({ where: { id: change.recordId }, data: { imageUrl: value } });
      }
      if (change.scope === 'DESCRIPTION' && value) {
        await this.prisma.itemDescription.update({ where: { id: change.recordId }, data: { description: value } });
      }
      if (change.scope === 'MENU_OFFER' && value) {
        await this.prisma.menuOffer.update({ where: { id: change.recordId }, data: { name: value } });
      }
      if (change.scope === 'AGENDA_SERVICE' && value) {
        await this.prisma.agendaService.update({ where: { id: change.recordId }, data: { name: value } });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return;
      throw error;
    }
  }
}
