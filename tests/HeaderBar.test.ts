import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null })),
        })),
      })),
    })),
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => '/'),
}));

describe('HeaderBar', () => {
  it('should be importable', async () => {
    const mod = await import('../src/components/HeaderBar');
    expect(mod.default).toBeDefined();
  });
});
