import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { logAudit } from '../auditService';
import * as clientModule from '../../db/client';

jest.mock('../../db/client');
const mockedClientModule = clientModule as jest.Mocked<typeof clientModule>;

describe('Audit Logging Service', () => {
  let insertMock: jest.Mock<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    insertMock = jest.fn();
    insertMock.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    mockedClientModule.getSupabaseAdmin.mockReturnValue({
      from: jest.fn().mockReturnValue({
        insert: insertMock,
      }) as any,
    } as any);
  });

  it('records PHI access audit event with user and resource metadata', async () => {
    await logAudit({
      userId: 'user-uuid-123',
      action: 'VIEW_ENCOUNTER',
      resourceType: 'ENCOUNTER',
      resourceId: 'enc-456',
      ipAddress: '127.0.0.1',
      userAgent: 'LasoMobile/1.0',
      metadata: { severity: 'critical' },
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-uuid-123',
        action: 'VIEW_ENCOUNTER',
        resource_type: 'ENCOUNTER',
        resource_id: 'enc-456',
        ip_address: '127.0.0.1',
        user_agent: 'LasoMobile/1.0',
        metadata: { severity: 'critical' },
      }),
    );
  });

  it('gracefully handles database errors without throwing exceptions', async () => {
    insertMock.mockImplementation(() => Promise.reject(new Error('Database timeout')));

    await expect(
      logAudit({
        userId: 'user-uuid-123',
        action: 'READ_PROFILE',
        resourceType: 'PROFILE',
      }),
    ).resolves.not.toThrow();
  });
});
