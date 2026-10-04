/**
 * Ảnh đại diện fanpage: URL đã lưu, không có thì ảnh Graph API theo ID page.
 *
 * 'FAILED' là dấu BE ghi khi đẩy ảnh lên kho thất bại, không phải URL — gắn vào <img src>
 * thì trình duyệt gọi /dashboard/externalChannels/FAILED và 404. profile_id 'tmp_...' là id
 * tạm khi chưa cào được page, Graph API không có ảnh cho nó.
 */
export function fanpageAvatarSrc(fp: { avatar_url?: string | null; profile_id?: string | null }): string | null {
  if (fp.avatar_url && fp.avatar_url !== 'FAILED') return fp.avatar_url;
  if (fp.profile_id && /^\d+$/.test(fp.profile_id)) {
    return `https://graph.facebook.com/${fp.profile_id}/picture?type=large`;
  }
  return null;
}
