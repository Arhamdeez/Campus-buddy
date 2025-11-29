import { GoogleGenerativeAI } from '@google/generative-ai';

// Only initialize Gemini if API key is provided
let gemini: GoogleGenerativeAI | null = null;

if (process.env.GEMINI_API_KEY) {
  try {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini client initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Gemini client:', error);
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY not set - Chat summarization will be disabled');
}

export default gemini;
