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

describe('Shared Components', () => {
  it('should import MenuGroup', async () => {
    const mod = await import('../src/components/MenuGroup');
    expect(mod.default).toBeDefined();
  });

  it('should import MobileBottomNav', async () => {
    const mod = await import('../src/components/MobileBottomNav');
    expect(mod.default).toBeDefined();
  });

  it('should import HeaderBar', async () => {
    const mod = await import('../src/components/HeaderBar');
    expect(mod.default).toBeDefined();
  });
});
