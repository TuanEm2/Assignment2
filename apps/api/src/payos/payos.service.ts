import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
  NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { OrderStatus, PaymentMethod, PaymentOutcome, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { assertOrderStatusTransition } from '../orders/order-status';
import { parseOrderUuid } from '../orders/order-input';
import { payosCreateSignature, verifyPayosWebhook } from './payos-crypto';

interface PayosConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  frontendOrigin: string;
}

@Injectable()
export class PayosService {
  constructor(private readonly prisma: PrismaService, private readonly inventory: InventoryService) {}

  private config(): PayosConfig {
    if (process.env.PAYOS_ENABLED !== 'true' || process.env.PAYMENT_MODE !== 'payos') {
      throw new ForbiddenException('PayOS is not enabled on this environment');
    }
    const { PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY, WEB_PUBLIC_URL } = process.env;
    if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY || !WEB_PUBLIC_URL) {
      throw new ServiceUnavailableException('PayOS merchant configuration is missing');
    }
    let url: URL;
    try { url = new URL(WEB_PUBLIC_URL); }
    catch { throw new ServiceUnavailableException('WEB_PUBLIC_URL must be a public HTTPS origin'); }
    if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) {
      throw new ServiceUnavailableException('WEB_PUBLIC_URL must be a public HTTPS origin');
    }
    return { clientId: PAYOS_CLIENT_ID, apiKey: PAYOS_API_KEY, checksumKey: PAYOS_CHECKSUM_KEY, frontendOrigin: url.origin };
  }


  /** Read the provider state. Fail closed if it cannot be verified. */
  private async providerRequest(config: PayosConfig, code: number, method: 'GET' | 'POST' = 'GET') {
    let response: Response;
    try {
      response = await fetch(`https://api-merchant.payos.vn/v2/payment-requests/${code}${method === 'POST' ? '/cancel' : ''}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': config.clientId,
          'x-api-key': config.apiKey,
        },
        ...(method === 'POST' ? { body: JSON.stringify({ cancellationReason: 'Customer requested cancellation' }) } : {}),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ServiceUnavailableException('Unable to verify PayOS status; please try again later');
    }
    if (!response.ok) throw new ServiceUnavailableException('Unable to verify PayOS status');
    const payload: unknown = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object') throw new ServiceUnavailableException('Invalid PayOS status response');
    const body = payload as Record<string, unknown>;
    const data = body.data;
    if (body.code !== '00' || !data || typeof data !== 'object') {
      throw new ServiceUnavailableException('PayOS did not confirm the request');
    }
    const info = data as Record<string, unknown>;
    if (info.orderCode !== code || typeof info.status !== 'string') {
      throw new ServiceUnavailableException('PayOS response did not match the checkout');
    }
    return info.status;
  }

  /** Cancel an unpaid order only after PayOS has confirmed cancellation. */
  async cancel(userId: string, inputOrderId: string) {
    const config = this.config();
    const owner = parseOrderUuid(userId, 'userId');
    const orderId = parseOrderUuid(inputOrderId, 'orderId');
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: owner }, select: { status: true, payment: { select: { id: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.CANCELLED) return { orderId, status: 'CANCELLED' };
    if (order.payment || ![OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED].includes(order.status)) {
      throw new ConflictException('Paid or processing orders cannot be cancelled here');
    }
    const attempt = await this.prisma.payosCheckout.findFirst({
      where: { orderId }, orderBy: [{ createdAt: 'desc' }, { orderCode: 'desc' }],
    });
    if (attempt && !attempt.checkoutUrl) {
      throw new ConflictException('Checkout creation is unresolved; check status before cancelling');
    }
    if (attempt) {
      let status = await this.providerRequest(config, attempt.orderCode);
      if (status === 'PAID' || status === 'PROCESSING') {
        throw new ConflictException('Payment may have been received; wait for payment confirmation');
      }
      if (status === 'PENDING') status = await this.providerRequest(config, attempt.orderCode, 'POST');
      if (status !== 'CANCELLED' && status !== 'EXPIRED') {
        throw new ConflictException('PayOS cancellation could not be confirmed');
      }
    }
    await this.prisma.$transaction(async tx => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Order" WHERE "id" = ${orderId}::uuid AND "userId" = ${owner}::uuid FOR UPDATE
      `;
      if (!locked.length) throw new NotFoundException('Order not found');
      const current = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
      const payment = await tx.payment.findUnique({ where: { orderId } });
      if (payment) throw new ConflictException('Order already paid');
      assertOrderStatusTransition(current.status, OrderStatus.CANCELLED);
      await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } });
      await this.inventory.releaseStock(tx, orderId);
      if (attempt) await tx.payosCheckout.updateMany({
        where: { orderCode: attempt.orderCode }, data: { status: 'CANCELLED' },
      });
    });
    return { orderId, status: 'CANCELLED' };
  }

  async checkout(userId: string, inputOrderId: string) {
    const config = this.config();
    const owner = parseOrderUuid(userId, 'userId');
    const orderId = parseOrderUuid(inputOrderId, 'orderId');

    // Check any saved link with PayOS before reusing it. A closed link needs a fresh orderCode.
    const latest = await this.prisma.payosCheckout.findFirst({
      where: { orderId }, orderBy: [{ createdAt: 'desc' }, { orderCode: 'desc' }],
    });
    let closedLink = false;
    if (latest?.checkoutUrl) {
      const providerStatus = await this.providerRequest(config, latest.orderCode);
      if (providerStatus === 'PAID' || providerStatus === 'PROCESSING') {
        throw new ConflictException('Payment is processing or already received; check order status');
      }
      if (providerStatus === 'PENDING') {
        return { orderId, orderCode: latest.orderCode, checkoutUrl: latest.checkoutUrl };
      }
      if (providerStatus !== 'CANCELLED' && providerStatus !== 'EXPIRED') {
        throw new ConflictException('PayOS link status is not safe for retry');
      }
      closedLink = true;
    }
    // External API calls happen OUTSIDE the DB transaction, not while holding DB row locks.
    const record = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Order" WHERE "id" = ${orderId}::uuid AND "userId" = ${owner}::uuid FOR UPDATE
      `;
      if (!locked.length) throw new NotFoundException('Order not found');
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { total: true, status: true } });
      const payment = await tx.payment.findUnique({ where: { orderId } });
      if (payment || (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAYMENT_FAILED)) {
        throw new ConflictException('This order is no longer payable');
      }
      if (!Number.isSafeInteger(order.total) || order.total < 2000) {
        throw new BadRequestException('Order amount is outside PayOS payment limits');
      }
      const prior = await tx.payosCheckout.findFirst({
        where: { orderId }, orderBy: [{ createdAt: 'desc' }, { orderCode: 'desc' }],
      });
      if (prior && (!latest || prior.orderCode !== latest.orderCode)) {
        throw new ConflictException('Checkout has changed; refresh its status');
      }
      if (prior && !closedLink) return prior;
      if (prior) await tx.payosCheckout.update({
        where: { orderCode: prior.orderCode }, data: { status: 'CANCELLED' },
      });
      // 10-digit positive code; collisions are rejected by the database PK.
      // Never use a client-controlled code or amount.
      return tx.payosCheckout.create({
        data: { orderId, amount: order.total, orderCode: randomInt(1_000_000_000, 2_000_000_000), status: 'CREATING' },
      });
    });

    if (record.checkoutUrl) return { orderId, orderCode: record.orderCode, checkoutUrl: record.checkoutUrl };
    // A prior request may have created a link at PayOS but timed out before persisting the URL.
    // Do not generate another link until that request has been reconciled by an operator.
    if (record.status !== 'CREATING' || Date.now() - record.createdAt.getTime() > 60_000) {
      throw new ConflictException('PayOS link requires reconciliation; do not create a second link');
    }
    // While the link is being created, concurrent duplicate requests must not call PayOS.
    const leased = await this.prisma.payosCheckout.updateMany({
      where: { orderId, checkoutUrl: null, status: 'CREATING' },
      data: { status: 'REQUESTED' },
    });
    if (leased.count !== 1) throw new ConflictException('PayOS checkout is being prepared; retry status shortly');

    const returnUrl = `${config.frontendOrigin}/payment-result?orderId=${encodeURIComponent(orderId)}`;
    const cancelUrl = `${config.frontendOrigin}/payment-result?orderId=${encodeURIComponent(orderId)}&cancel=true`;
    const request = {
      orderCode: record.orderCode, amount: record.amount,
      description: `BL${record.orderCode.toString(36).toUpperCase()}`,
      returnUrl, cancelUrl,
    };
    const signature = payosCreateSignature(request, config.checksumKey);
    let response: Response;
    try {
      response = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': config.clientId, 'x-api-key': config.apiKey },
        body: JSON.stringify({ ...request, signature }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ServiceUnavailableException('PayOS did not respond; manual reconciliation may be needed');
    }
    if (!response.ok) throw new ServiceUnavailableException(`PayOS returned HTTP ${response.status}; reconcile before retrying`);
    const json: unknown = await response.json().catch(() => null);
    if (!json || typeof json !== 'object') throw new ServiceUnavailableException('Invalid PayOS response');
    const result = json as Record<string, unknown>;
    const data = result.data as Record<string, unknown> | undefined;
    if (result.code !== '00' || !data || data.orderCode !== record.orderCode || data.amount !== record.amount ||
        typeof data.checkoutUrl !== 'string' || typeof data.paymentLinkId !== 'string') {
      throw new ServiceUnavailableException('Unexpected PayOS response; reconcile before retrying');
    }
    const safe = new URL(data.checkoutUrl);
    if (safe.protocol !== 'https:' || safe.hostname !== 'pay.payos.vn') {
      throw new ServiceUnavailableException('Invalid PayOS checkout host');
    }
    await this.prisma.payosCheckout.updateMany({
      where: { orderId, status: 'REQUESTED' },
      data: { checkoutUrl: safe.toString(), paymentLinkId: data.paymentLinkId, status: 'READY' },
    });
    return { orderId, orderCode: record.orderCode, checkoutUrl: safe.toString() };
  }

  async status(userId: string, inputOrderId: string) {
    this.config();
    const owner = parseOrderUuid(userId, 'userId');
    const id = parseOrderUuid(inputOrderId, 'orderId');
    const order = await this.prisma.order.findFirst({
      where: { id, userId: owner },
      select: { id: true, total: true, status: true, payment: { select: { id: true, method: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return { orderId: order.id, status: order.status, amount: order.total,
      success: Boolean(order.payment), method: order.payment?.method ?? null };
  }

  async webhook(raw: unknown) {
    const config = this.config();
    let verified: ReturnType<typeof verifyPayosWebhook>;
    try { verified = verifyPayosWebhook(raw, config.checksumKey); }
    catch { throw new BadRequestException('Invalid PayOS webhook signature'); }

    // PayOS sends a signed example webhook when activating a channel; an unknown
    // orderCode is acknowledged without affecting any local order.
    if (!verified.success || verified.code !== '00' || verified.data.code !== '00') {
      return { code: '00', desc: 'acknowledged' };
    }
    const code = verified.data.orderCode;
    const amount = verified.data.amount;
    const linkId = verified.data.paymentLinkId;
    const reference = verified.data.reference;
    if (typeof code !== 'number' || !Number.isSafeInteger(code) || typeof amount !== 'number' ||
        !Number.isSafeInteger(amount) || typeof linkId !== 'string' || !linkId ||
        typeof reference !== 'string' || !reference || verified.data.currency !== 'VND') {
      throw new BadRequestException('Invalid PayOS transaction data');
    }
    const existing = await this.prisma.payosCheckout.findUnique({ where: { orderCode: code } });
    if (!existing) return { code: '00', desc: 'acknowledged unknown order' };
    if (existing.amount !== amount || (existing.paymentLinkId && existing.paymentLinkId !== linkId)) {
      throw new ConflictException('PayOS payment does not match stored checkout');
    }

    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Order" WHERE "id" = ${existing.orderId}::uuid FOR UPDATE
      `;
      if (!rows.length) throw new NotFoundException('Order not found');
      const order = await tx.order.findUniqueOrThrow({
        where: { id: existing.orderId }, select: { total: true, status: true },
      });
      const current = await tx.payment.findUnique({ where: { orderId: existing.orderId } });
      if (current) {
        if (current.method !== PaymentMethod.PAYOS_QR || current.amount !== amount) {
          throw new ConflictException('Payment requires manual reconciliation');
        }
        return; // webhook retry; at most one Payment per order
      }
      if (order.total !== amount) throw new ConflictException('PayOS amount mismatch');
      assertOrderStatusTransition(order.status, OrderStatus.PAID);
      await tx.payment.create({ data: {
        orderId: existing.orderId, amount, method: PaymentMethod.PAYOS_QR,
      } });
      await tx.paymentAttempt.create({ data: {
        orderId: existing.orderId, amount, method: PaymentMethod.PAYOS_QR,
        outcome: PaymentOutcome.SUCCESS, idempotencyKey: `payos:${code}`,
      } });
      await tx.order.update({ where: { id: existing.orderId }, data: { status: OrderStatus.PAID } });
      await tx.payosCheckout.update({ where: { orderCode: code }, data: {
        status: 'PAID', paymentLinkId: linkId,
      } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    return { code: '00', desc: 'success' };
  }
}
