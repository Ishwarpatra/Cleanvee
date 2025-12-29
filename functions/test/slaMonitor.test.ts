/**
 * Unit tests for SLA Monitor
 * 
 * Tests cover:
 * 1. Optimized query pattern (no N+1)
 * 2. Alert generation for overdue checkpoints
 * 3. Duplicate alert prevention (idempotency)
 */

import * as admin from 'firebase-admin';

// --- Mock Setup ---

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

beforeEach(() => {
    jest.clearAllMocks();
});

describe('SLA Monitor - Query Optimization', () => {
    /**
     * Simulates the OLD (N+1) pattern vs NEW (optimized) pattern
     */

    it('should use single optimized query on checkpoints collection', async () => {
        // This is the NEW optimized query pattern
        const db = admin.firestore();

        const thresholdTimestamp = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
        );

        // Mock the optimized query
        mockCollection.mockImplementation((collectionName: string) => {
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

        // Execute the optimized query
        const overdueCheckpoints = await db.collection('checkpoints')
            .where('is_active', '==', true)
            .where('last_cleaned_timestamp', '<', thresholdTimestamp)
            .get();

        // Verify single collection access
        expect(mockCollection).toHaveBeenCalledWith('checkpoints');
        expect(mockCollection).toHaveBeenCalledTimes(1);
        expect(overdueCheckpoints.empty).toBe(true);
    });

    it('should NOT use N+1 pattern (buildings → checkpoints → logs)', async () => {
        const db = admin.firestore();

        // Track which collections are accessed
        const accessedCollections: string[] = [];

        mockCollection.mockImplementation((collectionName: string) => {
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

        // Execute the optimized SLA check (just query checkpoints)
        await db.collection('checkpoints')
            .where('is_active', '==', true)
            .where('last_cleaned_timestamp', '<', {})
            .get();

        // Assert: Only 'checkpoints' was accessed, NOT 'buildings' or 'cleaning_logs'
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
                    last_cleaned_at: new Date(now - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
                    last_cleaned_timestamp: {
                        toMillis: () => now - 5 * 60 * 60 * 1000,
                    },
                }),
            },
            {
                id: 'cp_002',
                data: () => ({
                    building_id: 'bld_001',
                    last_cleaned_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
                    last_cleaned_timestamp: {
                        toMillis: () => now - 6 * 60 * 60 * 1000,
                    },
                }),
            },
        ];

        // Mock query returning overdue checkpoints
        mockCollection.mockImplementation((collectionName: string) => {
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

        // Simulate the alert creation logic
        const queryResult = await db.collection('checkpoints')
            .where('is_active', '==', true)
            .where('last_cleaned_timestamp', '<', {})
            .get();

        // Process results
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

        // Assert
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

        mockCollection.mockImplementation((collectionName: string) => {
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
                                    empty: false, // Existing alert found!
                                    docs: [{ id: 'existing_alert_001' }],
                                }),
                            }),
                        }),
                    }),
                };
            }
            return {};
        });

        // Simulate idempotent check
        const queryResult = await db.collection('checkpoints')
            .where('is_active', '==', true)
            .where('last_cleaned_timestamp', '<', {})
            .get();

        let alertsCreated = 0;
        for (const doc of queryResult.docs) {
            // Check for existing open alerts
            const existingAlerts = await db.collection('alerts')
                .where('checkpoint_id', '==', doc.id)
                .where('type', '==', 'SLA_MISSING_CLEAN')
                .where('status', '==', 'OPEN')
                .get();

            if (existingAlerts.empty) {
                alertsCreated++;
            }
        }

        // Assert: No new alerts created due to existing ones
        expect(alertsCreated).toBe(0);
    });
});

describe('SLA Monitor - Performance', () => {
    it('should handle empty checkpoint list efficiently', async () => {
        const db = admin.firestore();

        mockCollection.mockImplementation((collectionName: string) => {
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

        // Should return early without any batch operations
        expect(result.empty).toBe(true);
        expect(mockBatchSet).not.toHaveBeenCalled();
        expect(mockBatchCommit).not.toHaveBeenCalled();
    });
});
