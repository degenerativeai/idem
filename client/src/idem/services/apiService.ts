import type { IdentityProfile, Dataset, InsertIdentityProfile, InsertDataset } from '@shared/schema';

// Simple LocalStorage Adapter for Client-Side Electron App
const STORAGE_KEYS = {
  IDENTITIES: 'idem_identities',
  DATASETS: 'idem_datasets'
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getStorage = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
};

const setStorage = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const apiService = {
  async createIdentityProfile(data: InsertIdentityProfile): Promise<IdentityProfile> {
    await delay(300); // Simulate network
    const profiles = getStorage(STORAGE_KEYS.IDENTITIES);
    const newProfile = { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    profiles.push(newProfile);
    setStorage(STORAGE_KEYS.IDENTITIES, profiles);
    return newProfile as IdentityProfile;
  },

  async listIdentityProfiles(): Promise<IdentityProfile[]> {
    await delay(300);
    return getStorage(STORAGE_KEYS.IDENTITIES);
  },

  async getIdentityProfile(id: string): Promise<IdentityProfile> {
    await delay(200);
    const profiles = getStorage(STORAGE_KEYS.IDENTITIES);
    const profile = profiles.find((p: any) => p.id === id);
    if (!profile) throw new Error("Identity not found");
    return profile;
  },

  async createDataset(data: InsertDataset): Promise<Dataset> {
    await delay(300);
    const datasets = getStorage(STORAGE_KEYS.DATASETS);
    const newDataset = { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    datasets.push(newDataset);
    setStorage(STORAGE_KEYS.DATASETS, datasets);
    return newDataset as Dataset;
  },

  async listDatasets(identityId?: string): Promise<Dataset[]> {
    await delay(300);
    const datasets = getStorage(STORAGE_KEYS.DATASETS);
    if (identityId) {
      return datasets.filter((d: any) => d.identityId === identityId);
    }
    return datasets;
  },

  async getDataset(id: string): Promise<Dataset> {
    await delay(200);
    const datasets = getStorage(STORAGE_KEYS.DATASETS);
    const dataset = datasets.find((d: any) => d.id === id);
    if (!dataset) throw new Error("Dataset not found");
    return dataset;
  },

  async updateDatasetProgress(id: string, generatedCount: number): Promise<Dataset> {
    await delay(200);
    const datasets = getStorage(STORAGE_KEYS.DATASETS);
    const index = datasets.findIndex((d: any) => d.id === id);
    if (index === -1) throw new Error("Dataset not found");

    datasets[index] = { ...datasets[index], generatedCount };
    setStorage(STORAGE_KEYS.DATASETS, datasets);
    return datasets[index];
  },
};
