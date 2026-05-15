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
const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue({});
const mockGet = jest.fn();
const mockCollection = jest.fn();
const mockFirestore = {
    collection: mockCollection,
    batch: jest.fn().mockReturnValue({
        set: mockBatchSet,
        update: mockBatchUpdate,
        commit: mockBatchCommit,
    }),
};
jest.mock('firebase-admin', () => {
    return {
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
});
describe('SLA Monitor - Query Optimization', () => {
    it('should use single optimized query on checkpoints collection', async () => {
        const db = admin.firestore();
        const thresholdTimestamp = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 4 * 60 * 60 * 1000));
        mockCollection.mockImplementation((collectionName) => {
            if (collectionName === 'checkpoints') {
                return {
                    where: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue({
                                empty: true,
                                docs: [],
                                size: 0,
                            }),
                        }),
                    }),
                };
            }
            return {};
        });
        const overdueCheckpoints = await db.collection('checkpoints')
            .where('is_active', '==', true)
            .where('last_cleaned_timestamp', '<', thresholdTimestamp)
            .get();
        expect(mockCollection).toHaveBeenCalledWith('checkpoints');
        expect(mockCollection).toHaveBeenCalledTimes(1);
        expect(overdueCheckpoints.empty).toBe(true);
    });
    it('should NOT use N+1 pattern (buildings → checkpoints → logs)', async () => {
        const db = admin.firestore();
        const accessedCollections = [];
        mockCollection.mockImplementation((collectionName) => {
            accessedCollections.push(collectionName);
            if (collectionName === 'checkpoints') {
                return {
                    where: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                        }),
                    }),
                };
            }
            return {
                get: jest.fn().mockResolvedValue({ docs: [] }),
                where: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({ docs: [] }),
                }),
            };
        });
        await db.collection('checkpoints')
            .where('is_active', '==', true)
            .where('last_cleaned_timestamp', '<', {})
            .get();
        expect(accessedCollections).toContain('checkpoints');
        expect(accessedCollections).not.toContain('buildings');
        expect(accessedCollections).not.toContain('cleaning_logs');
    });
});
describe('SLA Monitor - Alert Generation', () => {
    it('should create alerts for overdue checkpoints', async () => {
        const db = admin.firestore();
        const now = Date.now();
        const overdueCheckpoints = [
            {
                id: 'cp_001',
                data: () => ({
                    building_id: 'bld_001',
                    last_cleaned_at: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
                    last_cleaned_timestamp: {
                        toMillis: () => now - 5 * 60 * 60 * 1000,
                    },
                }),
            },
            {
                id: 'cp_002',
                data: () => ({
                    building_id: 'bld_001',
                    last_cleaned_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
                    last_cleaned_timestamp: {
                        toMillis: () => now - 6 * 60 * 60 * 1000,
                    },
                }),
            },
        ];
        mockCollection.mockImplementation((collectionName) => {
            if (collectionName === 'checkpoints') {
                return {
                    where: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue({
                                empty: false,
                                docs: overdueCheckpoints,
                                size: 2,
                            }),
                        }),
                    }),
                    doc: jest.fn().mockReturnValue({}),
                };
            }
            if (collectionName === 'alerts') {
                return {
                    where: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            where: jest.fn().mockReturnValue({
                                get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                            }),
                        }),
                    }),
                    doc: jest.fn().mockReturnValue({ id: 'new_alert' }),
                };
            }
            return {};
        });
        const queryResult = await db.collection('checkpoints')
            .where('is_active', '==', true)
            .where('last_cleaned_timestamp', '<', {})
            .get();
        const batch = db.batch();
        for (const doc of queryResult.docs) {
            const data = doc.data();
            const alertRef = db.collection('alerts').doc();
            batch.set(alertRef, {
                type: 'SLA_MISSING_CLEAN',
                checkpoint_id: doc.id,
                building_id: data.building_id,
                status: 'OPEN',
            });
        }
        await batch.commit();
        expect(mockBatchSet).toHaveBeenCalledTimes(2);
        expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });
    it('should skip checkpoints that already have open alerts (idempotency)', async () => {
        const db = admin.firestore();
        const overdueCheckpoint = {
            id: 'cp_001',
            data: () => ({
                building_id: 'bld_001',
                last_cleaned_at: '2025-12-28T08:00:00Z',
            }),
        };
        mockCollection.mockImplementation((collectionName) => {
            if (collectionName === 'checkpoints') {
                return {
                    where: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue({
                                empty: false,
                                docs: [overdueCheckpoint],
                                size: 1,
                            }),
                        }),
                    }),
                };
            }
            if (collectionName === 'alerts') {
                return {
                    where: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            where: jest.fn().mockReturnValue({
                                get: jest.fn().mockResolvedValue({
                                    empty: false,
                                    docs: [{ id: 'existing_alert_001' }],
                                }),
                            }),
                        }),
                    }),
                };
            }
            return {};
        });
        const queryResult = await db.collection('checkpoints')
            .where('is_active', '==', true)
            .where('last_cleaned_timestamp', '<', {})
            .get();
        let alertsCreated = 0;
        for (const doc of queryResult.docs) {
            const existingAlerts = await db.collection('alerts')
                .where('checkpoint_id', '==', doc.id)
                .where('type', '==', 'SLA_MISSING_CLEAN')
                .where('status', '==', 'OPEN')
                .get();
            if (existingAlerts.empty) {
                alertsCreated++;
            }
        }
        expect(alertsCreated).toBe(0);
    });
});
describe('SLA Monitor - Performance', () => {
    it('should handle empty checkpoint list efficiently', async () => {
        const db = admin.firestore();
        mockCollection.mockImplementation((collectionName) => {
            if (collectionName === 'checkpoints') {
                return {
                    where: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue({
                                empty: true,
                                docs: [],
                                size: 0,
                            }),
                        }),
                    }),
                };
            }
            return {};
        });
        const result = await db.collection('checkpoints')
            .where('is_active', '==', true)
            .where('last_cleaned_timestamp', '<', {})
            .get();
        expect(result.empty).toBe(true);
        expect(mockBatchSet).not.toHaveBeenCalled();
        expect(mockBatchCommit).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=slaMonitor.test.js.map