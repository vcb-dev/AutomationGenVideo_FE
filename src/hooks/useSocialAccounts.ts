import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { SocialAccount } from '@/lib/api/social';

export const SOCIAL_ACCOUNTS_KEY = ['social', 'accounts'] as const;

async function fetchAccounts(): Promise<SocialAccount[]> {
  return apiClient.get<SocialAccount[]>('/social/accounts').then((r) => r.data);
}

export function useSocialAccounts() {
  return useQuery({
    queryKey: SOCIAL_ACCOUNTS_KEY,
    queryFn: fetchAccounts,
  });
}

export function useInvalidateAccounts() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: SOCIAL_ACCOUNTS_KEY });
}
