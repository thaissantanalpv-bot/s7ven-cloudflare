import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publicOfflineRead, readPublicSnapshot, savePublicSnapshot } from '../lib/offline-catalog';
import { shouldRegisterOffline } from '../lib/offline-registration';

describe('public offline catalog', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  it('stores fresh public data and reads it after network failure', async () => {
    const products = [{ id: 'public', price: 9 }];
    expect(await publicOfflineRead('products', async () => products)).toEqual(products);
    expect(await publicOfflineRead('products', async () => { throw new Error('offline'); })).toEqual(products);
  });
  it('uses saved products offline without requesting the server', async () => {
    savePublicSnapshot('products', [{ price: 9 }]);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const fetcher = vi.fn();
    expect(await publicOfflineRead('products', fetcher)).toEqual([{ price: 9 }]);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('refreshes prices when connection returns', async () => {
    savePublicSnapshot('products', [{ price: 9 }]);
    expect(await publicOfflineRead('products', async () => [{ price: 12 }])).toEqual([{ price: 12 }]);
    expect(readPublicSnapshot('products')).toEqual([{ price: 12 }]);
  });
  it('requires a first connected visit', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await expect(publicOfflineRead('products', vi.fn())).rejects.toThrow('primeira vez');
  });
  it('continues when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(await publicOfflineRead('products', async () => [])).toEqual([]);
  });
});
describe('registration guards', () => {
  const base = { production: true, embedded: false, hostname: 's7venlounge.lovable.app', disabled: false };
  it('allows only published standalone production', () => {
    expect(shouldRegisterOffline(base)).toBe(true);
    expect(shouldRegisterOffline({ ...base, production: false })).toBe(false);
    expect(shouldRegisterOffline({ ...base, embedded: true })).toBe(false);
    expect(shouldRegisterOffline({ ...base, disabled: true })).toBe(false);
  });
  it.each(['id-preview--abc.lovable.app', 'preview--abc.lovable.app', 'lovableproject.com', 'abc.lovableproject.com', 'lovableproject-dev.com', 'abc.lovableproject-dev.com', 'beta.lovable.dev', 'abc.beta.lovable.dev'])('rejects preview %s', hostname => {
    expect(shouldRegisterOffline({ ...base, hostname })).toBe(false);
  });
});
