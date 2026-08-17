export interface HandoverDevice {
  code: string;
  photoCount: number;
  /** Mỗi phần tử là một phụ kiện: true nghĩa là có giao kèm. */
  accessories: boolean[];
}

export interface HandoverReadiness {
  canHandover: boolean;
  /** Mã những máy chưa có ảnh — nói rõ máy nào, không chỉ đếm số. */
  unitsMissingPhoto: string[];
  uncheckedAccessoryCount: number;
  totalPhotoCount: number;
}

/**
 * BR-26 và BR-27: điều kiện được bấm Xác nhận bàn giao.
 *
 * Ảnh là điều kiện CỨNG, thiếu ảnh là không bàn giao được. Phụ kiện chưa tick chỉ là cảnh báo:
 * có lúc kho thực sự không giao kèm túi hay hood, chặn cứng ở đây sẽ khiến người ta tick bừa
 * cho qua — và thế là mất luôn giá trị của việc đối chiếu lúc nhận lại.
 *
 * Bản này chạy trên máy người dùng để chặn nút sớm; BE vẫn kiểm lại và bản của BE mới là bản
 * chính thức.
 */
export function handoverReadiness(
  devices: HandoverDevice[],
  confirmedByReceiver: boolean,
): HandoverReadiness {
  const unitsMissingPhoto = devices.filter((d) => d.photoCount < 1).map((d) => d.code);
  const uncheckedAccessoryCount = devices.reduce(
    (sum, d) => sum + d.accessories.filter((checked) => !checked).length,
    0,
  );

  return {
    // Không có máy nào thì không có gì để bàn giao — tick xác nhận cũng không cứu được.
    canHandover: devices.length > 0 && unitsMissingPhoto.length === 0 && confirmedByReceiver,
    unitsMissingPhoto,
    uncheckedAccessoryCount,
    totalPhotoCount: devices.reduce((sum, d) => sum + d.photoCount, 0),
  };
}
