import { createCategory } from '../api';
import { apiClient } from '../../api-client';

jest.mock('../../api-client');

describe('Equipment createCategory API', () => {
  it('should call POST /mems/categories with proper payload', async () => {
    const payload = {
      name: 'Flycam / Drone',
      code: 'FLY',
      bufferMinutes: 60,
    };

    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        id: 'cat_fly_123',
        ...payload,
        buffer_minutes: 60,
      },
    });

    const result = await createCategory(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/mems/categories', payload);
    expect(result.id).toBe('cat_fly_123');
    expect(result.name).toBe('Flycam / Drone');
  });
});
