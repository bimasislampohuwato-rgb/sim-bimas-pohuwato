import { render } from '@testing-library/react';
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
      signInWithPassword: vi.fn(() => Promise.resolve({ error: null })),
    },
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => '/login'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

describe('Login Page', () => {
  it('should be importable', async () => {
    const mod = await import('../app/login/page');
    expect(mod.default).toBeDefined();
  });
});
