import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: '1' } } })),
    },
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({ id: '1' })),
  usePathname: vi.fn(() => '/pegawai/detail/1'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

describe('Pegawai Detail Page', () => {
  it('should be importable', async () => {
    const mod = await import('../app/pegawai/detail/[id]/page');
    expect(mod.default).toBeDefined();
  });
});
