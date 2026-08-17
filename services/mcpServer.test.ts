import { describe, it, expect } from 'vitest';
import { mcpGetCleaningLogsForAI } from './mcpServer';
import { CleaningLog, LogStatus } from '../types';

describe('mcpGetCleaningLogsForAI', () => {
  it('should strip PII (cleaner_id) from cleaning logs before passing to Gemini', () => {
    // Arrange: Create a mock cleaning log with sensitive data
    const mockLogs: CleaningLog[] = [
      {
        id: 'log-123',
        checkpoint_id: 'chk-1',
        building_id: 'bldg-1',
        cleaner_id: 'SENSITIVE_USER_ID_888', // This is PII!
        created_at: '2026-05-15T12:00:00.000Z',
        proof_of_presence: {
          timestamp: '2026-05-15T12:00:00.000Z',
          method: 'nfc',
          identifier: 'nfc-tag-123'
        },
        proof_of_quality: {
          photo_storage_path: 'photos/log-123.jpg',
          overall_score: 85,
          detected_objects: []
        },
        verification_result: {
          status: LogStatus.VERIFIED
        }
      }
    ];

    // Act: Pass through MCP privacy filter
    const result = mcpGetCleaningLogsForAI(mockLogs);

    // Assert: The result should NOT contain cleaner_id
    expect(result.sanitizedLogs).toHaveLength(1);
    
    const sanitizedLog = result.sanitizedLogs[0];
    
    // Core data should remain
    expect(sanitizedLog.id).toBe('log-123');
    expect(sanitizedLog.proof_of_quality?.overall_score).toBe(85);
    
    // PII must be completely stripped
    expect(sanitizedLog).not.toHaveProperty('cleaner_id');
    expect(Object.keys(sanitizedLog)).not.toContain('cleaner_id');
    
    // Should record that PII fields were removed
    expect(result.totalPiiFieldsRemoved).toBeGreaterThan(0);
  });
});
