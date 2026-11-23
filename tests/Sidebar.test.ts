import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { value_text: '' } })),
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
  usePathname: vi.fn(() => '/pegawai'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

describe('Sidebar', () => {
  it('should be importable', async () => {
    const mod = await import('../src/components/Sidebar');
    expect(mod.default).toBeDefined();
  });
});
