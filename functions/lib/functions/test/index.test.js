"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
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
jest.mock('firebase-admin', () => {
    const actualAdmin = jest.requireActual('firebase-admin');
    return {
        ...actualAdmin,
        apps: [],
        initializeApp: jest.fn(),
        firestore: Object.assign(jest.fn(() => mockFirestore), {
            Timestamp: {
                fromDate: (date) => ({
                    toDate: () => date,
                    toMillis: () => date.getTime(),
                }),
            },
            FieldValue: {
                serverTimestamp: () => 'SERVER_TIMESTAMP',
            },
        }),
    };
});
beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ exists: true, data: () => ({}) });
});
describe('AlertService', () => {
    const createSafetyAlert = async (logId, logData) => {
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
                detected_hazards: hazards.map((h) => h.label),
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
                    overall_score: 55,
                    detected_objects: [],
                },
            };
            const result = await createSafetyAlert('log_001', logData);
            expect(result).toBe(true);
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                type: 'QUALITY_FAILURE',
                severity: 'HIGH',
                status: 'OPEN',
                details: expect.objectContaining({
                    score: 55,
                }),
            }));
        });
        it('should NOT create alert when overall_score >= 70 and no hazards', async () => {
            const logData = {
                building_id: 'bld_001',
                checkpoint_id: 'cp_001',
                proof_of_quality: {
                    overall_score: 85,
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
                    overall_score: 69,
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
                    overall_score: 70,
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
                    overall_score: 85,
                    detected_objects: [
                        { label: 'wet_floor', confidence: 0.92 },
                        { label: 'spill', confidence: 0.88 },
                    ],
                },
            };
            const result = await createSafetyAlert('log_005', logData);
            expect(result).toBe(true);
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                type: 'SAFETY_HAZARD',
                details: expect.objectContaining({
                    detected_hazards: ['wet_floor', 'spill'],
                }),
            }));
        });
        it('should prioritize SAFETY_HAZARD over QUALITY_FAILURE when both conditions exist', async () => {
            const logData = {
                building_id: 'bld_001',
                checkpoint_id: 'cp_001',
                proof_of_quality: {
                    overall_score: 45,
                    detected_objects: [
                        { label: 'broken_glass', confidence: 0.95 },
                    ],
                },
            };
            const result = await createSafetyAlert('log_006', logData);
            expect(result).toBe(true);
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                type: 'SAFETY_HAZARD',
            }));
        });
    });
    describe('Edge Cases', () => {
        it('should handle missing proof_of_quality gracefully', async () => {
            const logData = {
                building_id: 'bld_001',
                checkpoint_id: 'cp_001',
            };
            const result = await createSafetyAlert('log_007', logData);
            expect(result).toBe(true);
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                type: 'QUALITY_FAILURE',
                details: expect.objectContaining({
                    score: 0,
                }),
            }));
        });
        it('should handle null detected_objects gracefully', async () => {
            const logData = {
                building_id: 'bld_001',
                checkpoint_id: 'cp_001',
                proof_of_quality: {
                    overall_score: 50,
                    detected_objects: [],
                },
            };
            const result = await createSafetyAlert('log_008', logData);
            expect(result).toBe(true);
        });
    });
});
describe('FacilityStateService', () => {
    const updateCheckpointState = async (checkpointId, cleanedAt) => {
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
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                last_cleaned_at: cleanedAt,
                current_status: 'CLEAN',
            }));
        });
        it('should include Firestore Timestamp for query optimization', async () => {
            const checkpointId = 'cp_002';
            const cleanedAt = '2025-12-28T14:30:00Z';
            await updateCheckpointState(checkpointId, cleanedAt);
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                last_cleaned_timestamp: expect.objectContaining({
                    toMillis: expect.any(Function),
                }),
            }));
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
        await expect(createAlert()).resolves.not.toThrow();
        await expect(createAlert()).resolves.not.toThrow();
        await expect(createAlert()).resolves.not.toThrow();
    });
});
//# sourceMappingURL=index.test.js.map