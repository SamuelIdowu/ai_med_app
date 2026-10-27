// Function declarations for Gemini AI function calling
import { SchemaType, FunctionDeclaration } from '@google/generative-ai';

export const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'save_incident_report',
    description:
      "Saves a medical incident report to the user's health records. Call this after providing first aid guidance to document what happened and what treatment was recommended.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        user_id: {
          type: SchemaType.STRING,
          description: 'The unique identifier of the user',
        },
        incident_type: {
          type: SchemaType.STRING,
          description:
            "Type of medical incident (e.g., 'cut', 'burn', 'sprain', 'allergic_reaction')",
        },
        severity: {
          type: SchemaType.STRING,
          description: 'Severity level of the incident',
          enum: ['minor', 'moderate', 'severe', 'critical'],
        },
        treatment_given: {
          type: SchemaType.STRING,
          description: 'Summary of first aid treatment or advice provided',
        },
        symptoms: {
          type: SchemaType.STRING,
          description: 'User-reported symptoms',
        },
      },
      required: ['user_id', 'incident_type', 'severity', 'treatment_given'],
    },
  },
  {
    name: 'get_first_aid_protocol',
    description:
      'Retrieves official, verified first aid protocol steps from medical database. Use this to provide accurate, step-by-step medical guidance.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        protocol_name: {
          type: SchemaType.STRING,
          description: 'Name of the protocol',
          enum: [
            'severe_bleeding',
            'choking_adult',
            'choking_child',
            'cpr_adult',
            'cpr_child',
            'burns_minor',
            'burns_severe',
            'fracture',
            'sprain',
            'head_injury',
            'allergic_reaction',
            'poisoning',
            'shock',
          ],
        },
      },
      required: ['protocol_name'],
    },
  },
] as unknown as FunctionDeclaration[];
