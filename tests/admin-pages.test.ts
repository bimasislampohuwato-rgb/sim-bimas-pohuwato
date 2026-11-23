import { describe, it, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
    },
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => '/'),
}));

describe('Admin Directory', () => {
  it('should import admin/master/page', async () => {
    const mod = await import('../app/admin/master/page');
    expect(mod.default).toBeDefined();
  });

  it('should import admin/ptsp/page', async () => {
    const mod = await import('../app/admin/ptsp/page');
    expect(mod.default).toBeDefined();
  });

  it('should import admin/ptsp/layanan/page', async () => {
    const mod = await import('../app/admin/ptsp/layanan/page');
    expect(mod.default).toBeDefined();
  });

  it('should import admin/users/page', async () => {
    const mod = await import('../app/admin/users/page');
    expect(mod.default).toBeDefined();
  });

  it('should import admin/kebimasislaman/page', async () => {
    const mod = await import('../app/admin/kebimasislaman/page');
    expect(mod.default).toBeDefined();
  });
});
