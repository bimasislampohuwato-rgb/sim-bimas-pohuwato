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

describe('PTSP Pages', () => {
  it('should import ptsp/page', async () => {
    const mod = await import('../app/ptsp/page');
    expect(mod.default).toBeDefined();
  });

  it('should import ptsp/tambah/page', async () => {
    const mod = await import('../app/ptsp/tambah/page');
    expect(mod.default).toBeDefined();
  });

  it('should import ptsp/lacak/page', async () => {
    const mod = await import('../app/ptsp/lacak/page');
    expect(mod.default).toBeDefined();
  });
});
