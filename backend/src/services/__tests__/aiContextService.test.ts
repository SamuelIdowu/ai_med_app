import {
  buildMedicalProfileContextFromRow,
  calculateAge,
  getMedicalProfileContext,
  sanitizeClientProfileContext,
} from '../aiContextService';
import { getProfile } from '../profileService';

jest.mock('../profileService', () => ({
  getProfile: jest.fn(),
}));

const mockedGetProfile = getProfile as jest.MockedFunction<typeof getProfile>;

describe('aiContextService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates age from a date of birth', () => {
    expect(calculateAge('1990-05-10', new Date('2026-10-26T12:00:00Z'))).toBe(36);
    expect(calculateAge('1990-12-01', new Date('2026-10-26T12:00:00Z'))).toBe(35);
    expect(calculateAge('not-a-date')).toBeNull();
    expect(calculateAge('1900-01-01')).toBeNull();
  });

  it('formats the medical profile for prompts without identity or contact fields', () => {
    const context = buildMedicalProfileContextFromRow(
      {
        fullName: 'Test User',
        email: 'test@example.com',
        dob: '1990-05-10',
        gender: 'female',
        blood_type: 'O+',
        weight: '70 kg',
        height: '170 cm',
        allergies: ['penicillin', { allergen: 'peanuts', reaction: 'hives' }],
        medications: ['Metformin 500mg', { name: 'Lisinopril', dose: '10mg' }],
        conditions: ['Asthma'],
        medical_directives: ['Carries EpiPen'],
        emergency_notes: 'Use the epinephrine auto-injector first.',
        emergency_contacts: [{ name: 'Contact', phone: '555-0100' }],
      },
      new Date('2026-10-26T12:00:00Z'),
    );

    expect(context.hasProfile).toBe(true);
    expect(context.age).toBe(36);
    expect(context.prompt).toContain('Age: 36');
    expect(context.prompt).toContain('penicillin');
    expect(context.prompt).toContain('peanuts (hives)');
    expect(context.prompt).toContain('Lisinopril (10mg)');
    expect(context.prompt).toContain('Asthma');
    expect(context.prompt).toContain('Carries EpiPen');
    expect(context.prompt).toContain('epinephrine auto-injector');
    expect(context.display).toContain('Using medical profile');
    expect(context.display).toContain('Allergies: penicillin, peanuts (hives)');
    expect(context.prompt).not.toContain('Test User');
    expect(context.prompt).not.toContain('test@example.com');
    expect(context.prompt).not.toContain('555-0100');
  });

  it('supports legacy profile field names', () => {
    const context = buildMedicalProfileContextFromRow({
      current_medications: ['Albuterol'],
      chronic_conditions: ['COPD'],
      bloodType: 'A-',
      medicalDirectives: ['DNR'],
      emergencyNotes: 'Call family.',
    });

    expect(context.prompt).toContain('Current medications: Albuterol');
    expect(context.prompt).toContain('Medical conditions: COPD');
    expect(context.prompt).toContain('Blood type: A-');
    expect(context.prompt).toContain('Medical directives: DNR');
    expect(context.prompt).toContain('Emergency notes: Call family.');
  });

  it('returns an empty context when no usable profile fields exist', () => {
    const context = buildMedicalProfileContextFromRow({
      fullName: 'Test User',
      email: 'test@example.com',
      users: { name: 'Test User', email: 'test@example.com' },
    });

    expect(context).toEqual({
      hasProfile: false,
      summary: null,
      prompt: '',
      display: '',
      age: null,
    });
  });

  it('loads the authenticated user profile and swallows lookup failures', async () => {
    mockedGetProfile.mockResolvedValueOnce({
      allergies: ['latex'],
      conditions: ['Diabetes'],
    });

    const context = await getMedicalProfileContext('user-1', 'token');
    expect(mockedGetProfile).toHaveBeenCalledWith('user-1', 'token');
    expect(context.prompt).toContain('Allergies: latex');

    mockedGetProfile.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(getMedicalProfileContext('user-2', 'token')).resolves.toEqual({
      hasProfile: false,
      summary: null,
      prompt: '',
      display: '',
      age: null,
    });
  });

  it('does not query for guests', async () => {
    const context = await getMedicalProfileContext(undefined);

    expect(mockedGetProfile).not.toHaveBeenCalled();
    expect(context.hasProfile).toBe(false);
  });

  it('sanitizes guest-supplied profile context', () => {
    const context = sanitizeClientProfileContext(
      'Age: 40\nAllergies: penicillin\u0000\n\nMedications: Metformin',
    );

    expect(context).toContain('USER-PROVIDED MEDICAL PROFILE');
    expect(context).toContain('Age: 40');
    expect(context).toContain('Allergies: penicillin');
    expect(context).toContain('Medications: Metformin');
    expect(context).not.toContain('\u0000');
    expect(sanitizeClientProfileContext('   ')).toBe('');
    expect(sanitizeClientProfileContext({})).toBe('');
  });
});
