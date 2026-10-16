import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { GeminiService } from '../services/geminiService';
import { MLClient } from '../services/mlClient';

async function main() {
  const imgDir = path.resolve(__dirname, '../../../ml/data/image');
  const files = ['image copy.png', 'image.png'];
  const mlClient = new MLClient('http://127.0.0.1:8000');

  console.log('================================================================');
  console.log('AI MED APP - DUAL-TIER VISION BENCHMARK (LOCAL ML vs GEMINI)');
  console.log('================================================================\n');

  for (const file of files) {
    const filePath = path.join(imgDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      continue;
    }

    const buf = fs.readFileSync(filePath);
    const base64 = buf.toString('base64');

    console.log('================================================================');
    console.log(`ANALYZING: ${file} (${buf.length.toLocaleString()} bytes)`);
    console.log('================================================================');

    // 1. Local Python ML Vision Engine
    try {
      const localResult = await mlClient.analyzeWoundImage(buf, file);
      console.log('\n[1. LOCAL PYTHON ML ENGINE]');
      console.log('  • Classification :', localResult.classification.toUpperCase());
      console.log('  • Severity Grade :', localResult.severity_grade.toUpperCase());
      console.log('  • Confidence     :', `${Math.round(localResult.confidence * 100)}%`);
      console.log('  • Erythema Index :', localResult.annotations?.erythema_index);
      console.log('  • Contrast Index :', localResult.annotations?.contrast_index);
      console.log('  • Dimensions     :', localResult.annotations?.dimensions);
      console.log('  • Recommendation :', localResult.recommendation);
      if (localResult.red_flags?.length) {
        console.log('  • Red Flags      :', localResult.red_flags.join(', '));
      }
    } catch (e: any) {
      console.log('\n[1. LOCAL PYTHON ML ENGINE]');
      console.log('  • Local service unavailable (offline):', e.message);
    }

    // 2. Cloud Multimodal Gemini Vision
    try {
      console.log('\n[2. CLOUD MULTIMODAL GEMINI AI]');
      const geminiResult = await GeminiService.analyzeImage(base64, 'image/png');
      console.log('  • Injury Type    :', geminiResult.injuryType);
      console.log('  • Severity       :', geminiResult.severity?.toUpperCase());
      console.log('  • Confidence     :', `${geminiResult.confidence}%`);
      console.log('  • Emergency Flag :', geminiResult.emergencyFlag ? '🚨 YES (911 ALERT)' : 'No (Non-emergency)');
      if (geminiResult.symptoms?.length) {
        console.log('  • Symptoms       :', geminiResult.symptoms.join(', '));
      }
      if (geminiResult.recommendations?.length) {
        console.log('  • Recommendations:');
        geminiResult.recommendations.forEach((r: string, i: number) => console.log(`     ${i + 1}. ${r}`));
      }
      if (geminiResult.warnings?.length) {
        console.log('  • Warnings       :', geminiResult.warnings.join(' | '));
      }
    } catch (e: any) {
      console.log('  • Gemini Vision error:', e.message);
    }

    console.log('\n');
  }
}

main().catch(console.error);
