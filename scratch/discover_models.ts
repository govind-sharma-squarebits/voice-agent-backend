import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  try {
    const models = await genAI.listModels();
    console.log('--- AVAILABLE MODELS ---');
    models.models.forEach(m => console.log(m.name));
    console.log('-------------------------');
  } catch (e) {
    console.error('❌ Error listing models:', e);
  }
}

listModels();
