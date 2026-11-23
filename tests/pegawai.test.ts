import { describe, it, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [{ id: '1', nip: '123', namaLengkap: 'Test' }], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '1' }, error: null })),
        })),
      })),
    })),
  })),
}));

describe('pegawai actions', () => {
  it('should be importable', async () => {
    const mod = await import('../src/actions/pegawai');
    expect(mod.getPegawaiList).toBeDefined();
    expect(mod.createPegawaiLengkap).toBeDefined();
  });
});
