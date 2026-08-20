import { formatCategoryName, suggestCode } from '@/components/equipment/AddAssetDialog';
import { createCategory, createModel, createAsset } from '@/lib/equipment/api';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/api-client');

describe('AddAssetDialog Helpers & API flows', () => {
  describe('formatCategoryName', () => {
    it('should format known category codes into friendly Vietnamese labels', () => {
      expect(formatCategoryName({ id: '1', code: 'CAM', name: 'Camera', buffer_minutes: 120 })).toBe('Máy ảnh (Camera)');
      expect(formatCategoryName({ id: '2', code: 'LEN', name: 'Lens', buffer_minutes: 120 })).toBe('Ống kính (Lens)');
      expect(formatCategoryName({ id: '3', code: 'LIG', name: 'Lighting', buffer_minutes: 60 })).toBe('Đèn Flash & Ánh sáng (Lighting)');
      expect(formatCategoryName({ id: '4', code: 'AUD', name: 'Audio', buffer_minutes: 60 })).toBe('Microphone & Âm thanh (Audio)');
      expect(formatCategoryName({ id: '5', code: 'GIM', name: 'Gimbal', buffer_minutes: 60 })).toBe('Gimbal & Chống rung');
      expect(formatCategoryName({ id: '6', code: 'TRP', name: 'Tripod', buffer_minutes: 0 })).toBe('Chân máy (Tripod)');
    });

    it('should fallback to name (code) for custom categories', () => {
      expect(formatCategoryName({ id: '7', code: 'FLY', name: 'Flycam / Drone', buffer_minutes: 60 })).toBe('Flycam / Drone (FLY)');
    });
  });

  describe('suggestCode', () => {
    it('should suggest clean uppercase prefix code from category name', () => {
      expect(suggestCode('Flycam')).toBe('FLYC');
      expect(suggestCode('Đèn Flash')).toBe('DENF');
      expect(suggestCode('Thẻ nhớ SD')).toBe('THEN');
      expect(suggestCode('Pin & Sạc')).toBe('PINS');
      expect(suggestCode('')).toBe('EQP');
    });
  });

  describe('Complete Equipment Creation API Chain', () => {
    it('should successfully chain createCategory -> createModel -> createAsset', async () => {
      // 1. Create Category
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { id: 'cat_fly_1', code: 'FLY', name: 'Flycam / Drone', buffer_minutes: 60 },
      });
      const cat = await createCategory({ name: 'Flycam / Drone', code: 'FLY', bufferMinutes: 60 });
      expect(cat.id).toBe('cat_fly_1');

      // 2. Create Model
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { id: 'mod_dji_1', name: 'DJI Mini 4 Pro', categoryId: 'cat_fly_1' },
      });
      const model = await createModel({
        categoryId: cat.id,
        name: 'DJI Mini 4 Pro',
        manufacturer: 'DJI',
        referencePrice: 25000000,
        accessories: ['Pin', 'Sạc', 'Cánh quạt', 'Điều khiển'],
      });
      expect(model.id).toBe('mod_dji_1');

      // 3. Create Asset
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { id: 'asset_fly_001', asset_code: 'FLY-001', serial_number: 'DJI-998822' },
      });
      const asset = await createAsset({
        modelId: model.id,
        serialNumber: 'DJI-998822',
        condition: 'GOOD',
        intakeNote: 'Hàng mới 100%',
      });
      expect(asset.asset_code).toBe('FLY-001');
    });
  });
});
