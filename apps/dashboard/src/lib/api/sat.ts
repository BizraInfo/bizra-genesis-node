// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ SAT-LAB v0.1 - API CLIENT FUNCTIONS                                    ║
// ║ BIZRA LAB's Internal Marketing & Growth Team API Integration           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { SatOutboxItem, SatRecommendation } from '../../types/sat';
import { apiClient } from './rest-client';

// SAT Outbox endpoints - Content for human approval
export async function fetchSatOutbox(): Promise<SatOutboxItem[]> {
  const response = await apiClient.getSatOutbox();
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch SAT outbox');
  }
  return response.data;
}

export async function approveOutboxItem(id: string): Promise<void> {
  const response = await apiClient.approveSatOutboxItem(id);
  if (!response.success) {
    throw new Error(response.error || 'Failed to approve content');
  }
}

export async function rejectOutboxItem(id: string): Promise<void> {
  const response = await apiClient.rejectSatOutboxItem(id);
  if (!response.success) {
    throw new Error(response.error || 'Failed to reject content');
  }
}

export async function markPublished(id: string): Promise<void> {
  const response = await apiClient.markSatOutboxPublished(id);
  if (!response.success) {
    throw new Error(response.error || 'Failed to mark as published');
  }
}

// SAT Recommendations endpoints - Growth strategy insights
export async function fetchSatRecommendations(): Promise<SatRecommendation[]> {
  const response = await apiClient.getSatRecommendations();
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch SAT recommendations');
  }
  return response.data;
}

// SAT cycle management (development/manual trigger)
export async function triggerSatCycle(): Promise<{ message: string }> {
  const response = await apiClient.triggerSatCycle();
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to trigger SAT cycle');
  }
  return response.data;
}

// Sacred error messages for SAT operations
export const SAT_ERRORS = {
  OUTBOX_LOAD_ERROR: 'Unable to connect with SAT-LAB creative team. Please try again.',
  APPROVAL_ERROR: 'SAT content approval failed. Your vision guides our voice.',
  PUBLISH_ERROR: 'Publication initiation stalled. Manual posting required.',
  RECOMMENDATIONS_ERROR: 'SAT strategic insights unavailable. Operating autonomously.',
  CYCLE_ERROR: 'Weekly SAT cycle not responding. Manual content creation needed.',
};
