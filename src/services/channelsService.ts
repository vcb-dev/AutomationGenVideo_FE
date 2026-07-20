import apiClient from '@/lib/api-client';

export interface ChannelInfo {
  team_name: string | null;
  owner_name: string | null;
}

export const channelsService = {
  /**
   * Tra cứu tên team + tên chủ kênh theo danh sách URL kênh hoặc platform channel_id.
   * Trả về map: { [identifier]: { team_name, owner_name } }
   */
  scraperLookup: async (identifiers: string[]): Promise<Record<string, ChannelInfo>> => {
    if (!identifiers.length) return {};
    try {
      const { data } = await apiClient.post<Record<string, ChannelInfo>>(
        '/channels/scraper-lookup',
        { identifiers },
      );
      return data ?? {};
    } catch {
      return {};
    }
  },
};
