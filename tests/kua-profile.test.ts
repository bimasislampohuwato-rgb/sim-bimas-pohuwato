import { describe, it, expect, vi } from 'vitest';

// Mock the Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: { id: '1', namaKua: 'KUA Test', alamat: 'Jl. Test', kecamatanId: 'kec1' }, error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}));

describe('kua-profile actions', () => {
  it('should be importable', async () => {
    const mod = await import('../src/actions/kua-profile');
    expect(mod.getKuaProfile).toBeDefined();
    expect(mod.updateKuaProfile).toBeDefined();
  });
});
