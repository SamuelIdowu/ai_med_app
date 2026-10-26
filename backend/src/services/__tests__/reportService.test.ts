import { describe, it, expect } from '@jest/globals';
import { resolvePatientName } from '../reportService';

describe('reportService', () => {
  it('uses the related users.name returned by getProfile', () => {
    expect(
      resolvePatientName({
        users: { name: 'Jane Doe', email: 'jane@example.com' },
        blood_type: 'O+',
      }),
    ).toBe('Jane Doe');
  });

  it('handles a users relationship returned as an array', () => {
    expect(resolvePatientName({ users: [{ name: 'John Doe' }] })).toBe('John Doe');
  });

  it('falls back to legacy profile name fields', () => {
    expect(resolvePatientName({ first_name: 'Ada', last_name: 'Lovelace' })).toBe('Ada Lovelace');
    expect(resolvePatientName({ full_name: 'Grace Hopper' })).toBe('Grace Hopper');
  });

  it('returns a safe placeholder for missing or blank names', () => {
    expect(resolvePatientName(null)).toBe('N/A');
    expect(resolvePatientName({ users: {} })).toBe('N/A');
    expect(resolvePatientName({ users: { name: '   ' } })).toBe('N/A');
  });
});
