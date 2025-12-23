import { getProfile } from '../services/profileService';
import { createAuthenticatedClient } from '../config/supabase';
import protocols from '../data/protocols.json';

interface FunctionCall {
    name: string;
    args: any;
}

// Execute function based on Gemini's request
export async function executeFunctionCall(functionCall: FunctionCall, accessToken: string): Promise<any> {
    const { name, args } = functionCall;

    switch (name) {
        case 'get_user_medical_profile':
            return await getUserMedicalProfile(args.user_id, accessToken);

        case 'save_incident_report':
            return await saveIncidentReport(args, accessToken);

        case 'get_first_aid_protocol':
            return await getFirstAidProtocol(args.protocol_name);

        default:
            throw new Error(`Unknown function: ${name}`);
    }
}

// Function 1: Get User Medical Profile
async function getUserMedicalProfile(userId: string, accessToken: string) {
    try {
        const profile = await getProfile(userId, accessToken);

        if (!profile) {
            return {
                success: false,
                message: "No medical profile found for user"
            };
        }

        return {
            success: true,
            data: {
                allergies: profile.allergies || [],
                current_medications: profile.current_medications || [],
                medical_conditions: profile.medical_conditions || [],
                blood_type: profile.blood_type || "Unknown",
                emergency_contact: {
                    name: profile.emergency_contact_name,
                    phone: profile.emergency_contact_phone
                }
            }
        };
    } catch (error: any) {
        console.error('Error fetching medical profile:', error);
        return {
            success: false,
            message: "Failed to retrieve medical profile",
            error: error.message
        };
    }
}

// Function 2: Save Incident Report
async function saveIncidentReport(args: any, accessToken: string) {
    try {
        const supabase = createAuthenticatedClient(accessToken);

        const { data, error } = await supabase
            .from('incidents')
            .insert({
                user_id: args.user_id,
                incident_type: args.incident_type,
                severity: args.severity,
                treatment_given: args.treatment_given,
                symptoms: args.symptoms || null,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            message: "Incident report saved successfully",
            incident_id: data.id
        };
    } catch (error: any) {
        console.error('Error saving incident report:', error);
        return {
            success: false,
            message: "Failed to save incident report",
            error: error.message
        };
    }
}

// Function 3: Get First Aid Protocol
async function getFirstAidProtocol(protocolName: string) {
    try {
        const protocol = (protocols as any)[protocolName];

        if (!protocol) {
            return {
                success: false,
                message: `Protocol '${protocolName}' not found`
            };
        }

        return {
            success: true,
            data: {
                name: protocol.name,
                steps: protocol.steps,
                warnings: protocol.warnings
            }
        };
    } catch (error: any) {
        console.error('Error fetching protocol:', error);
        return {
            success: false,
            message: "Failed to retrieve protocol",
            error: error.message
        };
    }
}
