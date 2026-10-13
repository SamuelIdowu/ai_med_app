// backend/src/db/seeds/seedGuidelines.ts
// Medical First Aid Protocol Chunking & 384-Dimensional Embedding Seeder

import path from 'path';
import fs from 'fs';
import { getSupabaseAdmin } from '../client';

export interface Protocol {
  title: string;
  category: string;
  steps: string[];
}

export interface GuidelineChunk {
  topic: string;
  category: string;
  chunkIndex: number;
  content: string;
}

/**
 * Chunks structured medical protocols into searchable textual segments
 */
export function chunkMedicalProtocol(protocol: Protocol): GuidelineChunk[] {
  return protocol.steps.map((step, idx) => ({
    topic: protocol.title,
    category: protocol.category,
    chunkIndex: idx,
    content: `[${protocol.title} - Step ${idx + 1}] ${step}`,
  }));
}

/**
 * Generates a normalized 384-dimensional embedding vector.
 * Produces unit-length dense vectors compatible with pgvector HNSW index (vector_cosine_ops).
 */
export function generate384Embedding(text: string): number[] {
  const DIM = 384;
  const vector = new Array(DIM).fill(0);

  // Compute deterministic hash seeds from the text content
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const bucket = (i * 37 + charCode * 17) % DIM;
    vector[bucket] += (charCode % 25) / 25.0;
  }

  // Smooth adjacent dimensions
  for (let i = 0; i < DIM; i++) {
    const prev = vector[(i - 1 + DIM) % DIM];
    const next = vector[(i + 1) % DIM];
    vector[i] = (vector[i] * 2 + prev + next) / 4.0;
  }

  // Normalize to unit length (L2 norm = 1.0) for cosine distance
  let sumSq = 0;
  for (let i = 0; i < DIM; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1.0;

  return vector.map((val) => Number((val / norm).toFixed(6)));
}

/**
 * Default Emergency Protocols for Seeding
 */
export const DEFAULT_EMERGENCY_PROTOCOLS: Protocol[] = [
  {
    title: 'Cardiopulmonary Resuscitation (CPR)',
    category: 'cpr',
    steps: [
      'Check scene safety and confirm unresponsiveness. Tap shoulders and shout.',
      'Call 911 immediately and request an AED. Put dispatcher on speakerphone.',
      'Place hands centered on sternum, interlock fingers, and lock elbows.',
      'Perform 100 to 120 compressions per minute at 2 inches (5cm) depth.',
      'Allow complete chest recoil between compressions. Switch rescuers every 2 minutes.',
    ],
  },
  {
    title: 'Severe Bleeding & Hemorrhage Control',
    category: 'bleeding',
    steps: [
      'Expose the wound and apply firm, continuous direct pressure with a sterile cloth.',
      'Maintain pressure without lifting cloth to check wound for at least 5 minutes.',
      'If blood soaks through, place additional cloth over the first layer.',
      'For severe arterial limb bleeding not controlled by pressure, apply a commercial tourniquet 2-3 inches above the wound.',
      'Keep patient calm, lie them flat, and monitor for hypovolemic shock.',
    ],
  },
  {
    title: 'Burn Injury Management',
    category: 'burns',
    steps: [
      'Remove source of heat immediately and ensure personal safety.',
      'Cool thermal burn with clean cool running water for 10 to 20 minutes. Do not use ice.',
      'Gently remove restrictive clothing or jewelry before swelling begins.',
      'Cover loosely with a sterile, non-adherent dressing or clean plastic wrap.',
      'Do not burst blisters or apply butter, grease, or topical ointments to open burns.',
    ],
  },
  {
    title: 'Choking Relief (Foreign Object Airway Obstruction)',
    category: 'choking',
    steps: [
      'Identify signs of severe choking: unable to speak, cough, or breathe; grasping throat.',
      'Stand behind victim and lean them slightly forward.',
      'Give 5 firm back blows between shoulder blades with the heel of your hand.',
      'Give 5 abdominal thrusts (Heimlich maneuver) inward and upward above the navel.',
      'Alternate 5 back blows and 5 abdominal thrusts until object is expelled or victim becomes unresponsive.',
    ],
  },
  {
    title: 'Bone Fractures & Musculoskeletal Trauma',
    category: 'fractures',
    steps: [
      'Keep patient still. Do not attempt to realign or push back protruding bone ends.',
      'Immobilize the injured extremity above and below the fracture site.',
      'Apply a splint using padded rigid materials (rolled magazines, wood) secured with cloth.',
      'Apply ice wrapped in cloth for 15-20 minutes to reduce local edema.',
      'Check distal pulse and skin warmth beyond the fracture regularly.',
    ],
  },
  {
    title: 'Wound Care & Lacerations',
    category: 'wound',
    steps: [
      'Wash hands thoroughly before treating and wear protective gloves if available.',
      'Rinse the laceration with gentle cool tap water or saline to clear debris.',
      'Pat margins dry and apply a thin layer of petroleum jelly or antiseptic ointment.',
      'Cover with a sterile adhesive bandage or gauze pad.',
      'Seek medical evaluation for deep cuts, gaping edges, or puncture wounds.',
    ],
  },
  {
    title: 'Anaphylaxis & Severe Allergic Reactions',
    category: 'anaphylaxis',
    steps: [
      'Recognize symptoms: facial swelling, wheezing, hives, dizziness, difficulty breathing.',
      'Administer epinephrine auto-injector (EpiPen) into the outer mid-thigh immediately.',
      'Hold the auto-injector in place for 3 to 10 seconds per device instructions.',
      'Call 911 immediately and report anaphylactic emergency.',
      'Have the patient lie flat with feet elevated, unless breathing is difficult.',
    ],
  },
];

/**
 * Loads first-aid-content.json if available, or falls back to default emergency protocols
 */
export function loadAllProtocols(): Protocol[] {
  const contentPath = path.resolve(__dirname, '../../../../mobile/src/content/first-aid-content.json');

  if (fs.existsSync(contentPath)) {
    try {
      const raw = fs.readFileSync(contentPath, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.categories)) {
        return data.categories.map((cat: any) => ({
          title: cat.title,
          category: cat.id,
          steps: Array.isArray(cat.steps)
            ? cat.steps.map((s: any) => s.content || s.title)
            : [],
        }));
      }
    } catch (err) {
      console.warn('Could not parse first-aid-content.json, using default protocols:', err);
    }
  }

  return DEFAULT_EMERGENCY_PROTOCOLS;
}

/**
 * Executes the seeding process into public.guideline_embeddings
 */
export async function seedMedicalGuidelines(): Promise<{ inserted: number; errors: number }> {
  const supabase = getSupabaseAdmin();
  const protocols = loadAllProtocols();

  let insertedCount = 0;
  let errorCount = 0;

  console.log(`Starting vector seeding for ${protocols.length} medical protocols...`);

  for (const protocol of protocols) {
    const chunks = chunkMedicalProtocol(protocol);

    for (const chunk of chunks) {
      const embedding = generate384Embedding(chunk.content);

      const { error } = await supabase.from('guideline_embeddings').upsert(
        {
          topic: chunk.topic,
          category: chunk.category,
          chunk_index: chunk.chunkIndex,
          content: chunk.content,
          embedding: embedding,
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error(`Failed to seed chunk [${chunk.topic} - ${chunk.chunkIndex}]:`, error.message);
        errorCount++;
      } else {
        insertedCount++;
      }
    }
  }

  console.log(`Vector seeding complete! Inserted: ${insertedCount}, Errors: ${errorCount}`);
  return { inserted: insertedCount, errors: errorCount };
}

// Auto-run if executed directly via CLI
if (require.main === module) {
  seedMedicalGuidelines()
    .then((res) => {
      console.log('Seed result:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed fatal error:', err);
      process.exit(1);
    });
}
