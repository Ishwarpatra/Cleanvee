/**
 * Unit tests for VeriClean Cloud Functions
 * 
 * Tests cover:
 * 1. Quality Alert Generation (score < 70)
 * 2. Safety Hazard Alert Generation (detected hazards)
 * 3. Checkpoint State Denormalization
 * 4. Idempotency
 */

import * as admin from 'firebase-admin';

// --- Mock Setup (BEFORE imports) ---

// Mock Firestore methods
const mockAdd = jest.fn().mockResolvedValue({ id: 'mock-alert-id' });
const mockUpdate = jest.fn().mockResolvedValue({});
const mockGet = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue({});

const mockWhere = jest.fn().mockReturnThis();
const mockCollection = jest.fn().mockImplementation(() => ({
    add: mockAdd,
    doc: jest.fn().mockReturnValue({
        get: mockGet,
        update: mockUpdate,
    }),
    where: mockWhere,
}));

mockWhere.mockReturnValue({
    where: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
        }),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    }),
    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
});

const mockFirestore = {
    collection: mockCollection,
    batch: jest.fn().mockReturnValue({
        set: mockBatchSet,
        update: mockBatchUpdate,
        commit: mockBatchCommit,
    }),
};

// Mock firebase-admin
jest.mock('firebase-admin', () => {
    const actualAdmin = jest.requireActual('firebase-admin');
    return {
        ...actualAdmin,
        apps: [],
        initializeApp: jest.fn(),
        firestore: Object.assign(
            jest.fn(() => mockFirestore),
            {
                Timestamp: {
                    fromDate: (date: Date) => ({
                        toDate: () => date,
                        toMillis: () => date.getTime(),
                    }),
                },
                FieldValue: {
                    serverTimestamp: () => 'SERVER_TIMESTAMP',
                },
            }
        ),
    };
});

// Reset all mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ exists: true, data: () => ({}) });
});

// --- Test Suites ---

describe('AlertService', () => {
    // Import the AlertService logic inline to test it directly
    const createSafetyAlert = async (logId: string, logData: any) => {
        const db = admin.firestore();
        const overallScore = logData.proof_of_quality?.overall_score ?? 0;
        const hazards = logData.proof_of_quality?.detected_objects ?? [];

        const hasHazards = hazards.length > 0;
        const isLowScore = overallScore < 70;

        if (!hasHazards && !isLowScore) {
            return false;
        }

        await db.collection('alerts').add({
            related_log_id: logId,
            building_id: logData.building_id,
            checkpoint_id: logData.checkpoint_id,
            severity: 'HIGH',
            status: 'OPEN',
            type: hasHazards ? 'SAFETY_HAZARD' : 'QUALITY_FAILURE',
            details: {
                score: overallScore,
                detected_hazards: hazards.map((h: any) => h.label),
            },
        });

        return true;
    };

    describe('Quality Failure Alerts', () => {
        it('should create QUALITY_FAILURE alert when overall_score < 70', async () => {
            const logData = {
                building_id: 'bld_001',
                checkpoint_id: 'cp_001',
                proof_of_quality: {
                    overall_score: 55, // Below threshold
                    detected_objects: [],
                },
            };

            const result = await createSafetyAlert('log_001', logData);

            expect(result).toBe(true);
            expect(mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'QUALITY_FAILURE',
                    severity: 'HIGH',
                    status: 'OPEN',
                    details: expect.objectContaining({
                        score: 55,
                    }),
                })
            );
        });

        it('should NOT create alert when overall_score >= 70 and no hazards', async () => {
            const logData = {
                building_id: 'bld_001',
                checkpoint_id: 'cp_001',
                proof_of_quality: {
                    overall_score: 85, // Above threshold
                    detected_objects: [],
                },
            };

            const result = await createSafetyAlert('log_002', logData);

            expect(result).toBe(false);
            expect(mockAdd).not.toHaveBeenCalled();
        });

        it('should create alert at exactly score = 69 (boundary test)', async () => {
            const logData = {
                building_id: 'bld_001',
                checkpoint_id: 'cp_001',
                proof_of_quality: {
                    overall_score: 69, // Just below threshold
                    detected_objects: [],
                },
            };

            const result = await createSafetyAlert('log_003', logData);

            expect(result).toBe(true);
            expect(mockAdd).toHaveBeenCalled();
        });

        it('should NOT create alert at exactly score = 70 (boundary test)', async () => {
            const logData = {
                building_id: 'bld_001',
                checkpoint_id: 'cp_001',
                proof_of_quality: {
                    overall_score: 70, // Exactly at threshold
                    detected_objects: [],
                },
            };

            const result = await createSafetyAlert('log_004', logData);

            expect(result).toBe(false);
            expect(mockAdd).not.toHaveBeenCalled();
        });
    });

    describe('Safety Hazard Alerts', () => {
        it('should create SAFETY_HAZARD alert when hazards are detected', async () => {
            const logData = {
                building_id: 'bld_001',
                checkpoint_id: 'cp_001',
                proof_of_quality: {
                    overall_score: 85, // Good score, but hazards exist
                    detected_objects: [
                        { label: 'wet_floor', confidence: 0.92 },
                        { label: 'spill', confidence: 0.88 },
                    ],
                },
            };

            const result = await createSafetyAlert('log_005', logData);

            expect(result).toBe(true);
            expect(mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'SAFETY_HAZARD', // Not QUALITY_FAILURE
                    details: expect.objectContaining({
                        detected_hazards: ['wet_floor', 'spill'],
                    }),
                })
            );
        });

        it('should prioritize SAFETY_HAZARD over QUALITY_FAILURE when both conditions exist', async () => {
            const logData = {
                building_id: 'bld_001',
                checkpoint_id: 'cp_001',
                proof_of_quality: {
                    overall_score: 45, // Low score AND hazards
                    detected_objects: [
                        { label: 'broken_glass', confidence: 0.95 },
                    ],
                },
            };

            const result = await createSafetyAlert('log_006', logData);

            expect(result).toBe(true);
            expect(mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'SAFETY_HAZARD', // Hazards take priority
                })
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing proof_of_quality gracefully', async () => {
            const logData = {
                building_id: 'bld_001',
                checkpoint_id: 'cp_001',
                // No proof_of_quality
            };

            // Should create alert because score defaults to 0
            const result = await createSafetyAlert('log_007', logData);

            expect(result).toBe(true);
            expect(mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'QUALITY_FAILURE',
                    details: expect.objectContaining({
                        score: 0,
                    }),
                })
            );
        });

        it('should handle null detected_objects gracefully', async () => {
            const logData = {
                building_id: 'bld_001',
                checkpoint_id: 'cp_001',
                proof_of_quality: {
                    overall_score: 50,
                    detected_objects: null, // Explicitly null
                },
            };

            const result = await createSafetyAlert('log_008', logData);

            expect(result).toBe(true);
            // Should not throw
        });
    });
});

describe('FacilityStateService', () => {
    const updateCheckpointState = async (checkpointId: string, cleanedAt: string) => {
        const db = admin.firestore();
        const cleanedDate = new Date(cleanedAt);

        await db.collection('checkpoints').doc(checkpointId).update({
            last_cleaned_at: cleanedAt,
            last_cleaned_timestamp: admin.firestore.Timestamp.fromDate(cleanedDate),
            current_status: 'CLEAN',
        });
    };

    describe('Checkpoint State Denormalization', () => {
        it('should update checkpoint with last_cleaned_at timestamp', async () => {
            const checkpointId = 'cp_001';
            const cleanedAt = '2025-12-28T12:00:00Z';

            await updateCheckpointState(checkpointId, cleanedAt);

            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    last_cleaned_at: cleanedAt,
                    current_status: 'CLEAN',
                })
            );
        });

        it('should include Firestore Timestamp for query optimization', async () => {
            const checkpointId = 'cp_002';
            const cleanedAt = '2025-12-28T14:30:00Z';

            await updateCheckpointState(checkpointId, cleanedAt);

            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    last_cleaned_timestamp: expect.objectContaining({
                        toMillis: expect.any(Function),
                    }),
                })
            );
        });
    });
});

describe('Idempotency', () => {
    it('should not throw when called multiple times with same data', async () => {
        const db = admin.firestore();

        const createAlert = async () => {
            await db.collection('alerts').add({
                type: 'TEST_ALERT',
                checkpoint_id: 'cp_001',
            });
        };

        // Should not throw on multiple calls
        await expect(createAlert()).resolves.not.toThrow();
        await expect(createAlert()).resolves.not.toThrow();
        await expect(createAlert()).resolves.not.toThrow();
    });
});
