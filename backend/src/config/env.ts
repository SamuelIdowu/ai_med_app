import dotenv from 'dotenv';
import path from 'path';

// Load the repository-root .env before any module reads process.env.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();
