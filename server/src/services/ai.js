import OpenAI from 'openai';

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error('AI is not configured. Add OPENAI_API_KEY to server/.env to enable AI features.');
    error.status = 503;
    throw error;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateText({ instructions, input }) {
  const client = getClient();
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-5.5',
    instructions,
    input,
    max_output_tokens: 2500
  });
  const text = response.output_text?.trim();
  if (!text) {
    const error = new Error('The AI service returned an empty response. Please try again.');
    error.status = 502;
    throw error;
  }
  return text;
}
