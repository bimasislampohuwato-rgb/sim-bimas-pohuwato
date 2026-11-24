import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockGetUser } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockGetUser = vi.fn();
  return { mockFrom, mockGetUser };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));

import { requireApiUser, requireApiAdmin } from '@/lib/auth/api-auth';

function makeChain(result: any) {
  const chain: any = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.update = vi.fn(self);
  chain.insert = vi.fn(self);
  chain.delete = vi.fn(self);
  chain.order = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

function setProfile(profile: any) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return makeChain({ data: profile, error: null });
    return makeChain({ data: null, error: null });
  });
}

beforeEach(() => {
  mockFrom.mockReset();
  mockGetUser.mockReset();
});

describe('requireApiUser', () => {
  it('mengembalikan 401 jika belum login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    setProfile(null);

    const result = await requireApiUser();

    expect('response' in result).toBe(true);
    if ('response' in result) {
      expect(result.response.status).toBe(401);
    }
  });

  it('mengembalikan user jika sudah login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'u@example.com' } } });
    setProfile({ role: 'pegawai', jabatan_admin: null, kua_wilayah: null, email: 'u@example.com' });

    const result = await requireApiUser();

    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.id).toBe('u1');
      expect(result.user.isAdmin).toBe(false);
    }
  });
});

describe('requireApiAdmin', () => {
  it('mengembalikan 401 jika belum login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    setProfile(null);

    const result = await requireApiAdmin();

    expect('response' in result).toBe(true);
    if ('response' in result) {
      expect(result.response.status).toBe(401);
    }
  });

  it('mengembalikan 403 jika user bukan admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'u@example.com' } } });
    setProfile({ role: 'pegawai', jabatan_admin: null, kua_wilayah: null, email: 'u@example.com' });

    const result = await requireApiAdmin();

    expect('response' in result).toBe(true);
    if ('response' in result) {
      expect(result.response.status).toBe(403);
    }
  });

  it('meloloskan super_admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'admin@example.com' } } });
    setProfile({ role: 'super_admin', jabatan_admin: null, kua_wilayah: null, email: 'admin@example.com' });

    const result = await requireApiAdmin();

    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.isAdmin).toBe(true);
      expect(result.user.role).toBe('super_admin');
    }
  });

  it('meloloskan admin_bimas', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u2', email: 'bimas@example.com' } } });
    setProfile({ role: 'pegawai', jabatan_admin: 'admin_bimas', kua_wilayah: null, email: 'bimas@example.com' });

    const result = await requireApiAdmin();

    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.isAdmin).toBe(true);
      expect(result.user.jabatanAdmin).toBe('admin_bimas');
    }
  });

  it('meloloskan admin_kua', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u3', email: 'kua@example.com' } } });
    setProfile({ role: 'pegawai', jabatan_admin: 'admin_kua', kua_wilayah: 'KUA Marisa', email: 'kua@example.com' });

    const result = await requireApiAdmin();

    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.isAdmin).toBe(true);
      expect(result.user.kuaWilayah).toBe('KUA Marisa');
    }
  });
});