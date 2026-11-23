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

describe('Kebimasislaman Tabs', () => {
  it('should import MasjidMushallaTab', async () => {
    const mod = await import('../app/admin/kebimasislaman/MasjidMushallaTab');
    expect(mod.default).toBeDefined();
  });

  it('should import SdmMasjidTab', async () => {
    const mod = await import('../app/admin/kebimasislaman/SdmMasjidTab');
    expect(mod.default).toBeDefined();
  });

  it('should import ArahKiblatTab', async () => {
    const mod = await import('../app/admin/kebimasislaman/ArahKiblatTab');
    expect(mod.default).toBeDefined();
  });
});
