import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!.trim());
  try {
    const result = await (genAI as any).getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy to get client
    // @ts-ignore
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY!.trim()}`);
    const data = await response.json();
    console.log('Available Models:', JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.error('Error listing models:', error.message);
  }
}

listModels();
