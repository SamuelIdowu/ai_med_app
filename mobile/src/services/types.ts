export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "13.0.5"
    }
    public: {
        Tables: {
            audit_logs: {
                Row: {
                    action: string | null
                    created_at: string | null
                    id: string
                    metadata: Json | null
                    user_id: string | null
                }
                Insert: {
                    action?: string | null
                    created_at?: string | null
                    id?: string
                    metadata?: Json | null
                    user_id?: string | null
                }
                Update: {
                    action?: string | null
                    created_at?: string | null
                    id?: string
                    metadata?: Json | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "audit_logs_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            encounters: {
                Row: {
                    category: string | null
                    created_at: string | null
                    id: string
                    notes: string | null
                    type: string | null
                    user_id: string | null
                }
                Insert: {
                    category?: string | null
                    created_at?: string | null
                    id?: string
                    notes?: string | null
                    type?: string | null
                    user_id?: string | null
                }
                Update: {
                    category?: string | null
                    created_at?: string | null
                    id?: string
                    notes?: string | null
                    type?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "encounters_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            medical_profiles: {
                Row: {
                    allergies: Json | null
                    blood_type: string | null
                    conditions: Json | null
                    created_at: string | null
                    dob: string | null
                    emergency_contacts: Json | null
                    encrypted_meta: string | null
                    id: string
                    medications: Json | null
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    allergies?: Json | null
                    blood_type?: string | null
                    conditions?: Json | null
                    created_at?: string | null
                    dob?: string | null
                    emergency_contacts?: Json | null
                    encrypted_meta?: string | null
                    id?: string
                    medications?: Json | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    allergies?: Json | null
                    blood_type?: string | null
                    conditions?: Json | null
                    created_at?: string | null
                    dob?: string | null
                    emergency_contacts?: Json | null
                    encrypted_meta?: string | null
                    id?: string
                    medications?: Json | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "medical_profiles_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            photos: {
                Row: {
                    created_at: string | null
                    encounter_id: string | null
                    id: string
                    iv: string | null
                    storage_path: string | null
                }
                Insert: {
                    created_at?: string | null
                    encounter_id?: string | null
                    id?: string
                    iv?: string | null
                    storage_path?: string | null
                }
                Update: {
                    created_at?: string | null
                    encounter_id?: string | null
                    id?: string
                    iv?: string | null
                    storage_path?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "photos_encounter_id_fkey"
                        columns: ["encounter_id"]
                        isOneToOne: false
                        referencedRelation: "encounters"
                        referencedColumns: ["id"]
                    },
                ]
            }
            providers: {
                Row: {
                    address: string | null
                    created_at: string | null
                    id: string
                    lat: number | null
                    lng: number | null
                    name: string | null
                    phone: string | null
                    type: string | null
                }
                Insert: {
                    address?: string | null
                    created_at?: string | null
                    id?: string
                    lat?: number | null
                    lng?: number | null
                    name?: string | null
                    phone?: string | null
                    type?: string | null
                }
                Update: {
                    address?: string | null
                    created_at?: string | null
                    id?: string
                    lat?: number | null
                    lng?: number | null
                    name?: string | null
                    phone?: string | null
                    type?: string | null
                }
                Relationships: []
            }
            reports: {
                Row: {
                    created_at: string | null
                    encounter_id: string | null
                    id: string
                    report_path: string | null
                    shared_with: Json | null
                }
                Insert: {
                    created_at?: string | null
                    encounter_id?: string | null
                    id?: string
                    report_path?: string | null
                    shared_with?: Json | null
                }
                Update: {
                    created_at?: string | null
                    encounter_id?: string | null
                    id?: string
                    report_path?: string | null
                    shared_with?: Json | null
                }
                Relationships: [
                    {
                        foreignKeyName: "reports_encounter_id_fkey"
                        columns: ["encounter_id"]
                        isOneToOne: false
                        referencedRelation: "encounters"
                        referencedColumns: ["id"]
                    },
                ]
            }
            users: {
                Row: {
                    created_at: string | null
                    email: string | null
                    id: string
                    name: string | null
                    phone: string | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    email?: string | null
                    id: string
                    name?: string | null
                    phone?: string | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    name?: string | null
                    phone?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

export type Encounter = {
    id: string;
    category: string | null;
    notes: string | null;
    created_at: string | null;
    type?: string | null;
    photos?: string[]; // Local photos
    synced?: boolean;
    user_id?: string | null;
};

export type MedicalProfile = Database['public']['Tables']['medical_profiles']['Row'];

export type Provider = Database['public']['Tables']['providers']['Row'];
