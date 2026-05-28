import { apartmentTypesRepo } from './apartmentTypes.repo.js';

export const apartmentTypesService = {
  async list() {
    const apartmentTypes = await apartmentTypesRepo.listAll();
    return { apartmentTypes };
  },
};

