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

describe('App Directory Structure', () => {
  it('should import app/page', async () => {
    const mod = await import('../app/page');
    expect(mod.default).toBeDefined();
  });

  it('should import app/loading', async () => {
    const mod = await import('../app/loading');
    expect(mod.default).toBeDefined();
  });

  it('should import app/error', async () => {
    const mod = await import('../app/error');
    expect(mod.default).toBeDefined();
  });

  it('should import app/not-found', async () => {
    const mod = await import('../app/not-found');
    expect(mod.default).toBeDefined();
  });

  it('should import app/login/page', async () => {
    const mod = await import('../app/login/page');
    expect(mod.default).toBeDefined();
  });
});
