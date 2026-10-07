import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemKind, MenuPart, OrderFulfillment, OrderLineKind, OrderStatus, Prisma, UserType } from '@prisma/client';
import { calendarDateInLima, isOpenNow, toWhatsAppUrl } from 'src/common/directory.utils';
import { planFlags } from 'src/common/plan-features';
import { PublicationService } from 'src/publication/publication.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUser } from 'src/auth/interfaces/jwt-payload.interface';

const orderInclude = {
  lines: { include: { dishes: true } },
  payments: true,
  business: true,
  stages: { orderBy: { startedAt: 'asc' as const } },
} as const;

const clientOrderInclude = {
  ...orderInclude,
  pointSale: { include: { address: { include: { district: true } } } },
} as const;

const stageLabel: Record<OrderStatus, string> = {
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  REGISTRADO: 'Registrado',
  ATENCION: 'Atención',
  LISTO: 'Listo',
  DESPACHADO: 'Despachado',
  ENTREGADO: 'Entregado',
  ANULADO: 'Anulado',
};

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDIENTE_APROBACION: OrderStatus.REGISTRADO,
  REGISTRADO: OrderStatus.ATENCION,
  ATENCION: OrderStatus.LISTO,
  LISTO: OrderStatus.DESPACHADO,
  DESPACHADO: OrderStatus.ENTREGADO,
};

const statuses = Object.values(OrderStatus);

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publication: PublicationService,
  ) {}

  async offers(user: AuthUser, businessId: number) {
    await this.catalogOwner(user, businessId);
    const offers = await this.prisma.menuOffer.findMany({ where: { businessId, isActive: true }, orderBy: { name: 'asc' } });
    return this.publication.decorateOffers(user, offers);
  }

  async saveOffer(user: AuthUser, body: { businessId?: number; name?: string; price?: number; isActive?: boolean }, id?: number) {
    const current = id ? await this.prisma.menuOffer.findUnique({ where: { id } }) : null;
    if (id && !current) throw new NotFoundException('Ese menú no existe');
    const businessId = current?.businessId || Number(body.businessId);
    await this.catalogOwner(user, businessId);
    const name = (body.name ?? current?.name ?? '').trim();
    const price = body.price === undefined ? Number(current?.price) : Number(body.price);
    if (!name) throw new BadRequestException('Escribe el nombre del menú');
    if (!price || price <= 0) throw new BadRequestException('El menú debe tener precio');
    if (current) {
      const blocked = await this.publication.reviewFields(user, businessId, 'MENU_OFFER', current.id, [
        { field: 'name', label: `Nombre del menú · ${name}`, before: current.name, after: name },
      ]);
      const saved = await this.prisma.menuOffer.update({
        where: { id: current.id },
        data: { name: blocked.has('name') ? undefined : name, price, isActive: body.isActive ?? current.isActive },
      });
      const [decorated] = await this.publication.decorateOffers(user, [saved]);
      return decorated;
    }
    const saved = await this.prisma.menuOffer.create({ data: { businessId, name, price } });
    await this.publication.trackCreate(user, businessId, 'MENU_OFFER', saved.id, [
      { field: 'name', label: `Nombre del menú · ${saved.name}`, value: saved.name },
    ]);
    const [decorated] = await this.publication.decorateOffers(user, [saved]);
    return decorated;
  }

  async summary(user: AuthUser, businessId: number, date?: string) {
    const business = await this.own(user, businessId);
    if (business.user.planId && !planFlags(business.user.planCatalog).daySummary) {
      throw new ForbiddenException('Este plan no incluye el resumen del día');
    }
    const day = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date! : this.limaDay(new Date());
    const orders = await this.prisma.customerOrder.findMany({
      where: {
        businessId,
        status: { notIn: [OrderStatus.ANULADO, OrderStatus.PENDIENTE_APROBACION] },
      },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    const registeredOnDay = orders.filter((order) => {
      const registered = order.stages.find((item) => item.status === OrderStatus.REGISTRADO);
      return this.limaDay(registered?.startedAt || order.createdAt) === day;
    });
    const deliveredOnDay = orders.filter((order) => {
      if (order.status !== OrderStatus.ENTREGADO) return false;
      const stage = order.stages.find((item) => item.status === OrderStatus.ENTREGADO);
      return this.limaDay(stage?.startedAt || order.updatedAt) === day;
    });
    const dayOrders = registeredOnDay.map((order) => this.summaryOrder(order));
    const pending = dayOrders.filter((item) => Math.round(item.balance * 100) > 0);
    const deliveredOrders = deliveredOnDay.map((order) => this.summaryOrder(order));
    return {
      date: day,
      orderCount: dayOrders.length,
      orderTotal: dayOrders.reduce((sum, order) => sum + order.total, 0),
      collected: dayOrders.reduce((sum, order) => sum + order.paid, 0),
      dayOrders,
      pending,
      delivered: deliveredOrders.length,
      deliveredOrders,
      // Compatibilidad con clientes anteriores
      deliveredTotal: dayOrders.reduce((sum, order) => sum + order.total, 0),
    };
  }

  private summaryOrder(order: Prisma.CustomerOrderGetPayload<{ include: typeof orderInclude }>) {
    const total = this.total(order);
    const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    return {
      id: order.id,
      clientName: order.clientName,
      date: this.limaDay(order.createdAt),
      statusLabel: stageLabel[order.status],
      lines: order.lines.map((line) => {
        if (line.kind === OrderLineKind.MENU) {
          const dishes = line.dishes.map((dish) => dish.name).filter(Boolean);
          return dishes.length ? `${line.name}: ${dishes.join(', ')}` : line.name;
        }
        const qty = Number(line.quantityServed);
        const shown = Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
        return `${shown}x ${line.name}`;
      }),
      total,
      paid,
      balance: Math.max(0, total - paid),
    };
  }

  async createForClient(user: AuthUser, body: Record<string, unknown>) {
    const business = await this.prisma.business.findUnique({ where: { id: Number(body.businessId) }, include: { rubro: true } });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (!business.rubro.allowsOrders) {
      throw new BadRequestException('Los profesionales atienden por agenda, no por pedidos');
    }
    const owner = await this.prisma.user.findUnique({ where: { id: business.userId }, select: { planId: true, planCatalog: true } });
    if (owner?.planId && !planFlags(owner.planCatalog).clientOrders) {
      throw new ForbiddenException('Este plan no incluye el registro de pedidos por el cliente');
    }
    const point = await this.prisma.pointSale.findFirst({ where: { id: Number(body.pointSaleId), businessId: business.id } });
    if (!point) throw new BadRequestException('Elige el punto de venta donde recogerás el pedido');
    if (isOpenNow(point.opensAt, point.closesAt, point.openDays) !== true) {
      throw new BadRequestException('El pedido no se registró porque el negocio no está abierto.');
    }
    const fulfillment = body.fulfillment === 'DELIVERY' ? OrderFulfillment.DELIVERY : OrderFulfillment.RECOJO;
    const clientAddress = String(body.clientAddress || '').trim();
    if (fulfillment === OrderFulfillment.DELIVERY && !point.chargesDelivery) {
      throw new BadRequestException('El pedido no se registró porque este punto de venta no ofrece delivery.');
    }
    if (fulfillment === OrderFulfillment.DELIVERY && !clientAddress) {
      throw new BadRequestException('El pedido no se registró porque el delivery exige una dirección de entrega.');
    }
    const deliveryFee = fulfillment === OrderFulfillment.DELIVERY ? Number(point.deliveryFee) : 0;
    const rawLines = Array.isArray(body.lines) ? (body.lines as Record<string, unknown>[]) : [];
    if (!rawLines.length) throw new BadRequestException('Agrega al menos un producto o un menú');
    const lines: Prisma.OrderLineCreateWithoutOrderInput[] = [];
    for (const raw of rawLines) {
      raw.pointSaleId = point.id;
      if (raw.kind === 'MENU') lines.push(await this.menuLine(business.id, raw));
      else lines.push(await this.cartaLine(business.id, raw));
    }
    const clientName = `${user.firstName} ${user.lastName}`.trim();
    const client = await this.prisma.businessClient.upsert({
      where: { businessId_phone: { businessId: business.id, phone: user.phone } },
      create: { businessId: business.id, name: clientName, phone: user.phone },
      update: { name: clientName },
    });
    const order = await this.prisma.customerOrder.create({
      data: {
        businessId: business.id,
        pointSaleId: point.id,
        clientUserId: user.id,
        clientId: client.id,
        clientName,
        clientPhone: user.phone,
        clientAddress: clientAddress || null,
        fulfillment,
        deliveryFee,
        status: OrderStatus.PENDIENTE_APROBACION,
        lines: { create: lines },
        stages: { create: { status: OrderStatus.PENDIENTE_APROBACION } },
      },
      include: orderInclude,
    });
    return { ...this.mapOrder(order), whatsappUrl: toWhatsAppUrl(point.phone) };
  }

  async listMine(user: AuthUser) {
    const orders = await this.prisma.customerOrder.findMany({
      where: { clientUserId: user.id },
      include: { ...orderInclude, pointSale: { include: { address: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.mapOrder(order));
  }

  async findMine(user: AuthUser, id: number) {
    return this.presentClient(await this.clientOrder(user, id));
  }

  async updateForClient(user: AuthUser, id: number, body: Record<string, unknown>) {
    const current = await this.clientOrder(user, id);
    if (current.status !== OrderStatus.PENDIENTE_APROBACION) {
      throw new BadRequestException('Solo se puede editar un pedido pendiente de aprobación');
    }
    const point = await this.prisma.pointSale.findFirst({
      where: { id: Number(body.pointSaleId), businessId: current.businessId },
    });
    if (!point) throw new BadRequestException('Elige el punto donde se atiende el pedido');
    const fulfillment = body.fulfillment === 'DELIVERY' ? OrderFulfillment.DELIVERY : OrderFulfillment.RECOJO;
    const clientAddress = String(body.clientAddress || '').trim();
    if (fulfillment === OrderFulfillment.DELIVERY && !point.chargesDelivery) {
      throw new BadRequestException('Este punto de venta no ofrece delivery.');
    }
    if (fulfillment === OrderFulfillment.DELIVERY && !clientAddress) {
      throw new BadRequestException('El delivery exige una dirección de entrega.');
    }
    const deliveryFee = fulfillment === OrderFulfillment.DELIVERY ? Number(point.deliveryFee) : 0;
    const rawLines = Array.isArray(body.lines) ? (body.lines as Record<string, unknown>[]) : [];
    if (!rawLines.length) throw new BadRequestException('El pedido debe conservar al menos un producto');
    const lines: Prisma.OrderLineCreateWithoutOrderInput[] = [];
    for (const raw of rawLines) {
      raw.pointSaleId = point.id;
      if (raw.kind === 'MENU') lines.push(await this.menuLine(current.businessId, raw));
      else lines.push(await this.cartaLine(current.businessId, raw));
    }
    const nextTotal = lines.reduce((sum, line) => {
      const qty = line.kind === OrderLineKind.MENU ? 1 : Number(line.quantityServed);
      return sum + qty * Number(line.unitPrice);
    }, 0) + deliveryFee;
    const paid = current.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    if (Math.round(paid * 100) > Math.round(nextTotal * 100)) {
      throw new BadRequestException('Ese cambio dejaría el pedido por debajo de lo ya pagado');
    }
    const order = await this.prisma.$transaction(async (tx) => {
      await tx.orderLine.deleteMany({ where: { orderId: id } });
      return tx.customerOrder.update({
        where: { id },
        data: {
          pointSaleId: point.id,
          fulfillment,
          clientAddress: clientAddress || null,
          deliveryFee,
          lines: { create: lines },
        },
        include: clientOrderInclude,
      });
    });
    return this.presentClient(order);
  }

  async cancelForClient(user: AuthUser, id: number) {
    const current = await this.clientOrder(user, id);
    if (current.status !== OrderStatus.PENDIENTE_APROBACION) {
      throw new BadRequestException('Solo se puede anular un pedido pendiente de aprobación');
    }
    await this.prisma.orderStage.upsert({
      where: { orderId_status: { orderId: id, status: OrderStatus.ANULADO } },
      create: { orderId: id, status: OrderStatus.ANULADO },
      update: {},
    });
    const order = await this.prisma.customerOrder.update({
      where: { id },
      data: { status: OrderStatus.ANULADO },
      include: clientOrderInclude,
    });
    return this.presentClient(order);
  }

  async discardForClient(user: AuthUser, id: number) {
    const current = await this.clientOrder(user, id);
    if (current.status !== OrderStatus.ANULADO) {
      throw new BadRequestException('Solo se puede descartar un pedido anulado');
    }
    await this.prisma.customerOrder.delete({ where: { id } });
    return { ok: true, id };
  }

  async setDelivery(user: AuthUser, businessId: number, chargesDelivery: boolean, deliveryFee: number) {
    await this.own(user, businessId);
    if (chargesDelivery && (Number.isNaN(deliveryFee) || deliveryFee < 0)) {
      throw new BadRequestException('Indica el costo del delivery');
    }
    return this.prisma.business.update({
      where: { id: businessId },
      data: { chargesDelivery, deliveryFee: chargesDelivery ? deliveryFee : 0 },
    });
  }

  async setPaymentRule(user: AuthUser, businessId: number, requireOrderPayment: boolean) {
    await this.own(user, businessId);
    return this.prisma.business.update({
      where: { id: businessId },
      data: { requireOrderPayment },
    });
  }

  async clients(user: AuthUser, businessId: number) {
    await this.own(user, businessId);
    const clients = await this.prisma.businessClient.findMany({
      where: { businessId },
      include: { orders: { select: { createdAt: true } }, _count: { select: { orders: true } } },
      orderBy: { name: 'asc' },
    });
    return clients.map((client) => {
      const days = new Set(client.orders.map((order) => this.limaDay(order.createdAt)));
      const last = client.orders.reduce<Date | null>((latest, order) => {
        if (!latest || order.createdAt > latest) return order.createdAt;
        return latest;
      }, null);
      return {
        id: client.id,
        name: client.name,
        phone: client.phone,
        address: client.address,
        purchases: client._count.orders,
        purchaseDays: days.size,
        lastPurchase: last ? last.toISOString() : null,
      };
    });
  }

  async createClient(user: AuthUser, body: { businessId: number; name: string; phone: string; address?: string }) {
    const businessId = Number(body.businessId);
    await this.own(user, businessId);
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const address = String(body.address || '').trim();
    if (!name || !phone) throw new BadRequestException('Indica el nombre y el celular del cliente');
    try {
      return await this.prisma.businessClient.create({
        data: { businessId, name, phone, address: address || null },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Ese celular ya está registrado en este negocio');
      }
      throw error;
    }
  }

  private limaDay(date: Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  async catalog(user: AuthUser, businessId: number) {
    const business = await this.own(user, businessId);
    const today = calendarDateInLima();
    const items = await this.prisma.item.findMany({
      where: { isActive: true, pointSale: { businessId } },
      include: {
        descriptions: { include: { unit: true } },
        menuOffer: { select: { id: true, name: true, price: true } },
        menuLinks: { select: { menuOfferId: true } },
        availabilities: { where: { day: today } },
      },
      orderBy: { name: 'asc' },
    });
    const visible = items.filter((item) => {
      if (item.kind === ItemKind.MENU) return true;
      if (item.kind === ItemKind.OFERTA_DIA) {
        return Boolean(item.availabilities[0]?.available);
      }
      const mark = item.availabilities[0];
      if (mark) return mark.available;
      return true;
    });
    return {
      carta: visible.filter((item) => item.kind !== ItemKind.MENU),
      menu: visible
        .filter((item) => item.kind === ItemKind.MENU)
        .map((item) => {
          const linked = item.menuLinks?.map((link) => link.menuOfferId) || [];
          return { ...item, menuOfferIds: linked.length ? linked : item.menuOfferId ? [item.menuOfferId] : [] };
        }),
      offers: await this.prisma.menuOffer.findMany({ where: { businessId, isActive: true }, orderBy: { name: 'asc' } }),
    };
  }

  async list(user: AuthUser, businessId?: number) {
    if (businessId) await this.own(user, businessId);
    const orders = await this.prisma.customerOrder.findMany({
      where: {
        ...(businessId ? { businessId } : {}),
        ...(user.userType === UserType.EMPRESARIO ? { business: { userId: user.id } } : {}),
      },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    const today = this.limaDay(new Date());
    return orders.filter((order) => this.limaDay(order.createdAt) === today).map((order) => this.mapOrder(order));
  }

  async create(user: AuthUser, body: Record<string, unknown>) {
    const businessId = Number(body.businessId);
    const business = await this.own(user, businessId);
    const clientName = String(body.clientName || '').trim();
    const clientPhone = String(body.clientPhone || '').trim();
    const clientAddress = String(body.clientAddress || '').trim();
    const fulfillment = body.fulfillment === 'DELIVERY' ? OrderFulfillment.DELIVERY : OrderFulfillment.RECOJO;
    if (!clientName || !clientPhone) throw new BadRequestException('Indica el nombre y el celular del cliente');
    const point = body.pointSaleId
      ? await this.prisma.pointSale.findFirst({ where: { id: Number(body.pointSaleId), businessId: business.id } })
      : await this.prisma.pointSale.findFirst({ where: { businessId: business.id }, orderBy: { id: 'asc' } });
    if (fulfillment === OrderFulfillment.DELIVERY && !point?.chargesDelivery) {
      throw new BadRequestException('El pedido no se registró porque este punto de venta no ofrece delivery.');
    }
    if (fulfillment === OrderFulfillment.DELIVERY && !clientAddress) {
      throw new BadRequestException('El pedido no se registró porque el delivery exige una dirección de entrega.');
    }
    const rawLines = Array.isArray(body.lines) ? body.lines : [];
    if (!rawLines.length) throw new BadRequestException('Agrega al menos un producto o un menú');
    const lines: Prisma.OrderLineCreateWithoutOrderInput[] = [];
    for (const raw of rawLines as Record<string, unknown>[]) {
      if (raw.kind === 'MENU') lines.push(await this.menuLine(business.id, raw));
      else lines.push(await this.cartaLine(business.id, raw));
    }
    const deliveryFee = fulfillment === OrderFulfillment.DELIVERY && point?.chargesDelivery ? Number(point.deliveryFee) : 0;
    const total = lines.reduce((sum, line) => {
      const qty = line.kind === OrderLineKind.MENU ? 1 : Number(line.quantityServed);
      return sum + qty * Number(line.unitPrice);
    }, 0) + deliveryFee;
    const waive = Boolean(body.waivePayment);
    const payment = Number(body.payment);
    if (business.requireOrderPayment && !waive && Math.round(payment * 100) < Math.round(total * 100)) {
      throw new BadRequestException(`El pedido no se registró porque no se cumplió la condición de pago. El total es S/ ${total.toFixed(2)}.`);
    }
    const client = await this.prisma.businessClient.upsert({
      where: { businessId_phone: { businessId: business.id, phone: clientPhone } },
      create: { businessId: business.id, name: clientName, phone: clientPhone, address: clientAddress || null },
      update: { name: clientName, address: clientAddress || null },
    });
    const order = await this.prisma.customerOrder.create({
      data: {
        businessId: business.id,
        pointSaleId: point?.id,
        clientId: client.id,
        clientName,
        clientPhone,
        clientAddress: clientAddress || null,
        fulfillment,
        deliveryFee,
        paymentWaived: waive,
        lines: { create: lines },
        stages: { create: { status: OrderStatus.REGISTRADO } },
        ...(business.requireOrderPayment && !waive ? { payments: { create: { amount: payment } } } : {}),
      },
      include: orderInclude,
    });
    return this.mapOrder(order);
  }

  async setStatus(user: AuthUser, id: number, status: string) {
    if (!statuses.includes(status as OrderStatus)) throw new BadRequestException('Ese estado no existe');
    const order = await this.findOwned(user, id);
    const next = status as OrderStatus;
    const allowed = next === OrderStatus.ANULADO ? order.status !== OrderStatus.ENTREGADO && order.status !== OrderStatus.ANULADO : nextStatus[order.status] === next;
    if (!allowed) throw new BadRequestException('Ese pedido solo puede pasar al siguiente estado o anularse');
    await this.prisma.orderStage.upsert({
      where: { orderId_status: { orderId: order.id, status: next } },
      create: { orderId: order.id, status: next },
      update: {},
    });
    const updated = await this.prisma.customerOrder.update({
      where: { id: order.id },
      data: { status: next },
      include: orderInclude,
    });
    return this.mapOrder(updated);
  }

  async updateMenu(user: AuthUser, lineId: number, raw: Record<string, unknown>) {
    const line = await this.prisma.orderLine.findUnique({ where: { id: lineId }, include: { order: true } });
    if (!line) throw new NotFoundException('La línea no existe');
    this.assertOpen(line.order.status);
    await this.own(user, line.order.businessId);
    if (line.kind !== OrderLineKind.MENU) throw new BadRequestException('Esa línea no es un menú');
    const next = await this.menuLine(line.order.businessId, raw);
    const current = await this.findOwned(user, line.orderId);
    const lines = current.lines.map((item) => (item.id === lineId ? { ...item, unitPrice: new Prisma.Decimal(next.unitPrice) } : item));
    this.assertCovered(lines, current.payments, Number(current.deliveryFee));
    await this.prisma.orderMenuDish.deleteMany({ where: { lineId } });
    await this.prisma.orderLine.update({
      where: { id: lineId },
      data: {
        name: next.name,
        unitPrice: next.unitPrice,
        menuOfferId: next.menuOfferId,
        dishes: next.dishes,
      },
    });
    return this.list(user, line.order.businessId);
  }

  async removeLine(user: AuthUser, lineId: number) {
    const line = await this.prisma.orderLine.findUnique({
      where: { id: lineId },
      include: { order: { include: orderInclude } },
    });
    if (!line) throw new NotFoundException('La línea no existe');
    this.assertOpen(line.order.status);
    await this.own(user, line.order.businessId);
    if (line.order.lines.length < 2) throw new BadRequestException('El pedido debe conservar al menos un producto');
    const remaining = line.order.lines.filter((item) => item.id !== lineId);
    const nextTotal = this.total({ lines: remaining, deliveryFee: line.order.deliveryFee });
    const paid = line.order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    if (Math.round(paid * 100) > Math.round(nextTotal * 100)) {
      throw new BadRequestException('Quitar ese producto dejaría el pedido por debajo de lo ya pagado');
    }
    await this.prisma.orderLine.delete({ where: { id: lineId } });
    return this.list(user, line.order.businessId);
  }

  async setServed(user: AuthUser, lineId: number, quantityServed: number) {
    const line = await this.prisma.orderLine.findUnique({ where: { id: lineId }, include: { order: { include: { business: true } } } });
    if (!line) throw new NotFoundException('La línea no existe');
    this.assertOpen(line.order.status);
    await this.own(user, line.order.businessId);
    if (line.kind !== OrderLineKind.CARTA) throw new BadRequestException('El menú no cambia de cantidad');
    const quantity = await this.quantityForLine(line, quantityServed);
    const current = await this.findOwned(user, line.orderId);
    const lines = current.lines.map((item) => (item.id === lineId ? { ...item, quantityServed: new Prisma.Decimal(quantity) } : item));
    this.assertCovered(lines, current.payments, Number(current.deliveryFee));
    await this.prisma.orderLine.update({ where: { id: lineId }, data: { quantityServed: quantity } });
    return this.list(user, line.order.businessId);
  }

  async pay(user: AuthUser, id: number, amount: number) {
    const order = await this.findOwned(user, id);
    if (!amount || amount <= 0) throw new BadRequestException('El pago debe ser mayor a cero');
    const total = this.total(order);
    const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    if (Math.round((paid + amount) * 100) > Math.round(total * 100)) {
      throw new BadRequestException('No es posible registrar un pago mayor al saldo actual del pedido');
    }
    await this.prisma.orderPayment.create({ data: { orderId: id, amount } });
    return this.mapOrder(await this.findOwned(user, id));
  }

  private async cartaLine(businessId: number, raw: Record<string, unknown>) {
    const description = await this.prisma.itemDescription.findUnique({
      where: { id: Number(raw.descriptionId) },
      include: {
        unit: true,
        item: {
          include: {
            pointSale: true,
            availabilities: { where: { day: calendarDateInLima() } },
          },
        },
      },
    });
    if (!description || description.item.pointSale.businessId !== businessId || description.item.kind === ItemKind.MENU) {
      throw new BadRequestException('Ese producto a la carta no pertenece al negocio');
    }
    if (description.item.kind === ItemKind.OFERTA_DIA) {
      const mark = description.item.availabilities[0];
      if (!mark?.available) {
        throw new BadRequestException('Esa oferta del día no está autorizada para hoy');
      }
    }
    if (raw.pointSaleId && description.item.pointSaleId !== Number(raw.pointSaleId)) {
      throw new BadRequestException('Ese producto no se ofrece en el punto de venta elegido');
    }
    if (description.price === null) throw new BadRequestException('El producto a la carta no tiene precio');
    if (!(await this.publication.assertPublished('ITEM', description.item.id)) || !(await this.publication.assertPublished('DESCRIPTION', description.id))) {
      throw new BadRequestException('Pendiente de aprobación');
    }
    const quantity = this.normalizeQuantity(description.unit?.name, Number(raw.quantity));
    return {
      kind: OrderLineKind.CARTA,
      name: `${description.item.name} · ${description.description}`,
      unitPrice: description.price,
      quantityRequested: quantity,
      quantityServed: quantity,
    };
  }

  private async menuLine(businessId: number, raw: Record<string, unknown>) {
    const offer = await this.prisma.menuOffer.findFirst({
      where: { id: Number(raw.menuOfferId), businessId, isActive: true },
    });
    if (!offer) throw new BadRequestException('Elige un menú con precio registrado');
    if (!(await this.publication.assertPublished('MENU_OFFER', offer.id))) {
      throw new BadRequestException('Pendiente de aprobación');
    }
    const picked = Array.isArray(raw.dishes) ? (raw.dishes as { itemId: number; menuPart: MenuPart }[]) : [];
    const parts = new Set<string>();
    const dishes: Prisma.OrderMenuDishCreateWithoutLineInput[] = [];
    for (const dish of picked) {
      if (parts.has(dish.menuPart)) throw new BadRequestException('El menú solo admite un plato por grupo');
      parts.add(dish.menuPart);
      const item = await this.prisma.item.findFirst({
        where: {
          id: Number(dish.itemId),
          kind: ItemKind.MENU,
          menuPart: dish.menuPart,
          pointSale: { businessId, ...(raw.pointSaleId ? { id: Number(raw.pointSaleId) } : {}) },
        },
      });
      if (!item) throw new BadRequestException('Ese plato no corresponde al grupo del menú');
      if (!(await this.publication.assertPublished('ITEM', item.id))) {
        throw new BadRequestException('Pendiente de aprobación');
      }
      const linked = await this.prisma.itemMenuOffer.findFirst({
        where: { itemId: item.id, menuOfferId: offer.id },
      });
      if (!linked && item.menuOfferId !== offer.id) {
        throw new BadRequestException('No se pueden elegir platos de tipos de menú distintos');
      }
      dishes.push({ menuPart: dish.menuPart, name: item.name, item: { connect: { id: item.id } } });
    }
    if (!dishes.length) throw new BadRequestException('El menú necesita al menos un plato');
    return {
      kind: OrderLineKind.MENU,
      name: offer.name,
      unitPrice: offer.price,
      quantityRequested: 1,
      quantityServed: 1,
      menuOfferId: offer.id,
      dishes: { create: dishes },
    };
  }

  private normalizeQuantity(unitName: string | null | undefined, raw: number) {
    const quantity = Number(raw);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('Indica la cantidad pedida');
    }
    if (/^kg$/i.test((unitName || '').trim())) {
      const rounded = Math.round(quantity * 100) / 100;
      if (Math.abs(quantity - rounded) > 0.000001) {
        throw new BadRequestException('En kilogramos la cantidad admite hasta dos decimales');
      }
      return rounded;
    }
    const rounded = Math.round(quantity);
    if (Math.abs(quantity - rounded) > 0.000001) {
      throw new BadRequestException('En Unidad la cantidad debe ser un número entero');
    }
    return rounded;
  }

  private async quantityForLine(
    line: { name: string; order: { businessId: number; pointSaleId: number | null } },
    raw: number,
  ) {
    const separator = ' · ';
    const splitAt = line.name.indexOf(separator);
    if (splitAt < 0) return this.normalizeQuantity(null, raw);
    const description = await this.prisma.itemDescription.findFirst({
      where: {
        description: line.name.slice(splitAt + separator.length),
        item: {
          name: line.name.slice(0, splitAt),
          pointSale: {
            businessId: line.order.businessId,
            ...(line.order.pointSaleId ? { id: line.order.pointSaleId } : {}),
          },
        },
      },
      include: { unit: true },
    });
    return this.normalizeQuantity(description?.unit?.name, raw);
  }

  private assertOpen(status: OrderStatus) {
    if (status === OrderStatus.ENTREGADO || status === OrderStatus.ANULADO) {
      throw new BadRequestException('Ese pedido ya no se puede modificar');
    }
  }

  private async catalogOwner(user: AuthUser, businessId: number) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (user.userType !== UserType.ADMIN && business.userId !== user.id) {
      throw new ForbiddenException('No puedes modificar los menús de este negocio');
    }
    return business;
  }

  private async own(user: AuthUser, businessId: number) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { rubro: true, user: { select: { planId: true, planCatalog: true } } },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (!business.rubro.allowsOrders) {
      throw new BadRequestException('Los profesionales atienden por agenda, no por pedidos');
    }
    if (business.user.planId && !planFlags(business.user.planCatalog).operatorOrders) {
      throw new ForbiddenException('Este plan no incluye el módulo de pedidos');
    }
    if (user.userType !== UserType.ADMIN && business.userId !== user.id) {
      throw new ForbiddenException('No puedes registrar pedidos de este negocio');
    }
    return business;
  }

  private async findOwned(user: AuthUser, id: number) {
    const order = await this.prisma.customerOrder.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    await this.own(user, order.businessId);
    return order;
  }

  private assertCovered(
    lines: { kind: OrderLineKind; unitPrice: Prisma.Decimal; quantityServed: Prisma.Decimal }[],
    payments: { amount: Prisma.Decimal }[],
    deliveryFee = 0,
  ) {
    const paid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    if (Math.round(paid * 100) > Math.round(this.total({ lines, deliveryFee }) * 100)) {
      throw new BadRequestException('Ese cambio dejaría el pedido por debajo de lo ya pagado');
    }
  }

  private total(order: { lines: { kind: OrderLineKind; unitPrice: Prisma.Decimal; quantityServed: Prisma.Decimal }[]; deliveryFee?: Prisma.Decimal | number | null }) {
    const items = order.lines.reduce((sum, line) => {
      const qty = line.kind === OrderLineKind.MENU ? 1 : Number(line.quantityServed);
      return sum + qty * Number(line.unitPrice);
    }, 0);
    return items + Number(order.deliveryFee || 0);
  }

  private async clientOrder(user: AuthUser, id: number) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id, clientUserId: user.id },
      include: clientOrderInclude,
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  private async presentClient(order: Prisma.CustomerOrderGetPayload<{ include: typeof clientOrderInclude }>) {
    const mapped = this.mapOrder(order);
    return {
      ...mapped,
      lines: await this.attachCatalog(order),
      whatsappUrl: toWhatsAppUrl(order.pointSale?.phone || ''),
    };
  }

  private async attachCatalog(order: Prisma.CustomerOrderGetPayload<{ include: typeof clientOrderInclude }>) {
    const descriptions = await this.prisma.itemDescription.findMany({
      where: { item: { kind: ItemKind.CARTA, pointSale: { businessId: order.businessId } } },
      include: { unit: true, item: { select: { name: true, pointSaleId: true } } },
    });
    return order.lines.map((line) => {
      if (line.kind !== OrderLineKind.CARTA) return { ...line, descriptionId: null, unitName: '' };
      const separator = ' · ';
      const splitAt = line.name.indexOf(separator);
      const itemName = splitAt < 0 ? line.name : line.name.slice(0, splitAt);
      const description = splitAt < 0 ? '' : line.name.slice(splitAt + separator.length);
      const matches = descriptions.filter((item) => item.item.name === itemName && item.description === description);
      const match = matches.find((item) => item.item.pointSaleId === order.pointSaleId) || matches[0];
      return {
        ...line,
        descriptionId: match?.id ?? null,
        unitName: match?.unit?.name || '',
      };
    });
  }

  private mapOrder(order: Prisma.CustomerOrderGetPayload<{ include: typeof orderInclude }>) {
    const total = this.total(order);
    const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const stages = [...order.stages].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
    const closed = order.status === OrderStatus.ENTREGADO || order.status === OrderStatus.ANULADO;
    const end = closed ? stages.at(-1)?.startedAt.getTime() || Date.now() : Date.now();
    const start = stages[0]?.startedAt.getTime() || order.createdAt.getTime();
    return {
      ...order,
      total,
      paid,
      balance: Math.max(0, total - paid),
      statusLabel: stageLabel[order.status],
      elapsedMinutes: Math.max(0, Math.round((end - start) / 60000)),
      timingClosed: closed,
      stages: stages.map((stage, index) => {
        const next = stages[index + 1]?.startedAt.getTime() || (closed ? stage.startedAt.getTime() : Date.now());
        return {
          status: stage.status,
          label: stageLabel[stage.status],
          startedAt: stage.startedAt,
          minutes: Math.max(0, Math.round((next - stage.startedAt.getTime()) / 60000)),
        };
      }),
    };
  }
}
