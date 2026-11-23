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

describe('Loading and Error Boundaries', () => {
  it('should import loading component', async () => {
    const mod = await import('../app/loading');
    expect(mod.default).toBeDefined();
  });

  it('should import error component', async () => {
    const mod = await import('../app/error');
    expect(mod.default).toBeDefined();
  });

  it('should import not-found component', async () => {
    const mod = await import('../app/not-found');
    expect(mod.default).toBeDefined();
  });
});
