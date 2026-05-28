import { locationsRepo } from './locations.repo.js';

export const locationsService = {
  async list() {
    const locations = await locationsRepo.listAll();
    return { locations };
  },
};

