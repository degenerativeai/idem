import type { IdentityProfile, Dataset, InsertIdentityProfile, InsertDataset } from '@shared/schema';

const API_BASE = '/api';

export const apiService = {
  async createIdentityProfile(data: InsertIdentityProfile): Promise<IdentityProfile> {
    const response = await fetch(`${API_BASE}/identities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save identity profile');
    }
    
    return response.json();
  },

  async listIdentityProfiles(): Promise<IdentityProfile[]> {
    const response = await fetch(`${API_BASE}/identities`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load identity profiles');
    }
    
    return response.json();
  },

  async getIdentityProfile(id: string): Promise<IdentityProfile> {
    const response = await fetch(`${API_BASE}/identities/${id}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load identity profile');
    }
    
    return response.json();
  },

  async createDataset(data: InsertDataset): Promise<Dataset> {
    const response = await fetch(`${API_BASE}/datasets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save dataset');
    }
    
    return response.json();
  },

  async listDatasets(identityId?: string): Promise<Dataset[]> {
    const url = identityId 
      ? `${API_BASE}/datasets?identityId=${identityId}`
      : `${API_BASE}/datasets`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load datasets');
    }
    
    return response.json();
  },

  async getDataset(id: string): Promise<Dataset> {
    const response = await fetch(`${API_BASE}/datasets/${id}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load dataset');
    }
    
    return response.json();
  },

  async updateDatasetProgress(id: string, generatedCount: number): Promise<Dataset> {
    const response = await fetch(`${API_BASE}/datasets/${id}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generatedCount }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update dataset progress');
    }
    
    return response.json();
  },
};
