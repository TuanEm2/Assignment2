import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OrderHistoryService } from './order-history.service';

describe('TV5 History — owner queries, bounded pagination and snapshots', () => {
  const owner = randomUUID();
  const id = randomUUID();
  const createdAt = new Date('2026-11-13T00:00:00.000Z');
  const findFirst = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const findMany = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
  const service = new OrderHistoryService({ order: { findFirst, findMany } } as unknown as PrismaService);
  const row = { id, status: 'PENDING', total: 90000, createdAt, updatedAt: createdAt, items: [{ quantity: 2 }] };

  beforeEach(() => { findFirst.mockReset(); findMany.mockReset(); findMany.mockResolvedValue([]); });

  it('empty history is empty and database filtering happens before pagination', async () => {
    expect(await service.mine(owner, {})).toEqual({ items: [], nextCursor: null });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: owner }, take: 21, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
  });

  it('fetches one extra row, returns a bounded page and quantity-based itemCount', async () => {
    findMany.mockResolvedValue([row, { ...row, id: randomUUID() }]);
    const result = await service.mine(owner, { limit: '1' });
    expect(result.items).toEqual([{ id, status: 'PENDING', total: 90000, createdAt, updatedAt: createdAt, itemCount: 2 }]);
    expect(result.nextCursor).toBe(id);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }));
  });

  it.each(['0', '51', '-1', '1.5', '1e1', '01', ['2'], {}, null])('rejects invalid page limit %j before querying', async value => {
    // null is explicitly invalid rather than a request for the default.
    await expect(service.mine(owner, { limit: value })).rejects.toThrow();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('rejects owner injection and invalid cursor', async () => {
    await expect(service.mine(owner, { userId: randomUUID() })).rejects.toThrow();
    await expect(service.mine(owner, { cursor: 'invalid' })).rejects.toThrow();
    expect(findFirst).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('rejects a foreign or nonexistent cursor without querying the page', async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.mine(owner, { cursor: id })).rejects.toThrow('Invalid history cursor');
    expect(findFirst).toHaveBeenCalledWith({ where: { id, userId: owner }, select: { id: true, createdAt: true } });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('uses the date and UUID tie-breaker for a valid owned cursor', async () => {
    findFirst.mockResolvedValue({ id, createdAt });
    await service.mine(owner, { cursor: id, limit: '2' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: owner, OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }] }, take: 3,
    }));
  });

  it('detail uses stored snapshot values and supports TV6 names/subtotal contract', async () => {
    findFirst.mockResolvedValue({ ...row, payment: null, items: [{
      id: randomUUID(), productName: 'Stored coffee', sizeName: 'M', quantity: 2,
      unitPrice: 45000, lineTotal: 90000, toppings: [{ id: randomUUID(), name: 'Cream', price: 5000 }],
    }] });
    const detail = await service.detail(owner, id);
    expect(detail.items[0]).toMatchObject({ productName: 'Stored coffee', toppings: ['Cream'], subtotal: 90000, lineTotal: 90000 });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id, userId: owner } }));
  });

  it('detail and status return the same 404 for missing/unowned orders', async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.detail(owner, id)).rejects.toThrow('Order not found');
    await expect(service.status(owner, id)).rejects.toThrow('Order not found');
  });

  it('propagates storage failures rather than fabricating an empty or paid order', async () => {
    findMany.mockRejectedValue(new Error('DB unavailable'));
    await expect(service.mine(owner, {})).rejects.toThrow('DB unavailable');
  });
});
