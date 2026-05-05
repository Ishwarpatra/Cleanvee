/**
 * Unit tests for type validation helpers
 * Tests the isValidAppSettings function from types.ts
 */
import { describe, it, expect } from 'vitest';
import { isValidAppSettings } from '../../types';

describe('isValidAppSettings', () => {
  const validSettings = {
    qualityThreshold: 70,
    flagYellowAlerts: true,
    autoReviewLowScores: true,
    requireGps: true,
    allowOffline: true,
    photoRequired: true,
    maxOfflineHours: 4,
    emailNotifications: true,
    pushNotifications: true,
    slaAlerts: true,
    digestFrequency: 'daily' as const,
    maxCleaningIntervalHours: 4,
    gracePeriodMinutes: 15,
  };

  it('accepts valid settings', () => {
    expect(isValidAppSettings(validSettings)).toBe(true);
  });

  it('rejects negative quality threshold', () => {
    expect(isValidAppSettings({ ...validSettings, qualityThreshold: -1 })).toBe(false);
  });

  it('rejects quality threshold above 100', () => {
    expect(isValidAppSettings({ ...validSettings, qualityThreshold: 101 })).toBe(false);
  });

  it('rejects zero maxOfflineHours', () => {
    expect(isValidAppSettings({ ...validSettings, maxOfflineHours: 0 })).toBe(false);
  });

  it('rejects negative maxOfflineHours', () => {
    expect(isValidAppSettings({ ...validSettings, maxOfflineHours: -100 })).toBe(false);
  });

  it('rejects zero maxCleaningIntervalHours', () => {
    expect(isValidAppSettings({ ...validSettings, maxCleaningIntervalHours: 0 })).toBe(false);
  });

  it('rejects negative gracePeriodMinutes', () => {
    expect(isValidAppSettings({ ...validSettings, gracePeriodMinutes: -1 })).toBe(false);
  });

  it('accepts zero gracePeriodMinutes (no grace period)', () => {
    expect(isValidAppSettings({ ...validSettings, gracePeriodMinutes: 0 })).toBe(true);
  });

  it('accepts boundary values', () => {
    expect(isValidAppSettings({ ...validSettings, qualityThreshold: 0 })).toBe(true);
    expect(isValidAppSettings({ ...validSettings, qualityThreshold: 100 })).toBe(true);
    expect(isValidAppSettings({ ...validSettings, maxOfflineHours: 1 })).toBe(true);
  });

  it('rejects partial settings object', () => {
    expect(isValidAppSettings({ qualityThreshold: 70 })).toBe(false);
  });
});
