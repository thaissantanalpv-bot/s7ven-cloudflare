import { afterEach, describe, expect, it, vi } from 'vitest';
import { claimAddressLookupBudget, claimMapsBudget } from '@/lib/delivery.server';

afterEach(() => vi.unstubAllEnvs());
describe('Separate ORS address lookup vs route quote limits', () => {
  it('uses the dedicated SQL lookup RPC, not the quote ledger', async () => {
    vi.stubEnv('DELIVERY_SESSION_SECRET', 'local-test-only');
    const rpc = vi.fn().mockResolvedValue({ data: 'ok', error: null });
    await claimAddressLookupBudget({ rpc }, '192.0.2.1');
    expect(rpc).toHaveBeenCalledWith('claim_delivery_lookup_attempt', {
      _client_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(rpc).not.toHaveBeenCalledWith('claim_delivery_quote_attempt', expect.anything());
  });
  it.each(['hour-client','day-client','hour-global','day-global'])('denies provider calls on lookup quota %s', async code => {
    vi.stubEnv('DELIVERY_SESSION_SECRET', 'local-test-only');
    await expect(claimAddressLookupBudget({ rpc: vi.fn().mockResolvedValue({ data: code, error: null }) }, '192.0.2.1'))
      .rejects.toThrow('Limite de sugestões');
  });
  it('fails closed if the new SQL RPC is not installed', async () => {
    vi.stubEnv('DELIVERY_SESSION_SECRET', 'local-test-only');
    const spy = vi.spyOn(console,'error').mockImplementation(() => {});
    try {
      await expect(claimAddressLookupBudget({ rpc: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST202' } }) }, '192.0.2.1'))
        .rejects.toThrow('verificar o limite');
    } finally { spy.mockRestore(); }
  });
  it('still uses the original route quote RPC with 20 hourly client limit', async () => {
    vi.stubEnv('DELIVERY_SESSION_SECRET', 'local-test-only');
    const rpc = vi.fn().mockResolvedValue({ data: 'ok', error: null });
    await claimMapsBudget({ rpc }, '192.0.2.1');
    expect(rpc).toHaveBeenCalledWith('claim_delivery_quote_attempt', {
      _client_hash: expect.stringMatching(/^[a-f0-9]{64}$/), _global_limit: 200, _client_limit: 20,
    });
  });
});
