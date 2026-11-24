import { getKuaProfilPageData } from '@/app/kua/profil/_actions/kua-profil';
import ProfilKuaClient from './ProfilKuaClient';

export default async function ProfilKuaPage() {
  const { data, error } = await getKuaProfilPageData();

  return (
    <ProfilKuaClient
      initialData={data}
      initialError={error}
    />
  );
}