import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
router.use(authenticate);

const systemPrompt = `You are the AI assistant for Silent Palms Villa, a luxury beachfront villa in Diani Beach, Kenya.
You help the team create marketing content, whatsapp responses, reports, and operational insights.
The villa offers whole-villa and 2-bedroom unit rentals. Always maintain a luxurious, warm, and professional tone.`;

router.post('/generate', async (req, res) => {
  const { type, context, tone = 'professional' } = req.body;

  const prompts: Record<string, string> = {
    social_post: `Create a compelling ${context.platform} post for Silent Palms Villa. Context: ${context.details}. Include relevant hashtags. Tone: ${tone}.`,
    whatsapp_response: `Write a WhatsApp response for this guest message: "${context.message}". Context: ${context.details}. Keep it warm, concise, and helpful.`,
    campaign: `Create a marketing campaign brief for Silent Palms Villa. Goal: ${context.goal}. Target: ${context.audience}. Budget: ${context.budget}.`,
    blog_article: `Write an SEO-optimized blog article about "${context.topic}" for Silent Palms Villa website. Word count: ~${context.wordCount || 800}.`,
    executive_report: `Generate an executive summary report for Silent Palms Villa. Period: ${context.period}. Key metrics: ${JSON.stringify(context.metrics)}.`,
    revenue_forecast: `Analyze and forecast revenue for Silent Palms Villa. Historical data: ${JSON.stringify(context.history)}. Provide insights and 3-month forecast.`,
  };

  const prompt = prompts[type] || context.customPrompt;
  if (!prompt) return res.status(400).json({ error: 'Invalid generation type' });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  res.json({ content: (message.content[0] as any).text });
});

router.post('/chat', async (req, res) => {
  const { messages } = req.body;
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: systemPrompt,
    messages,
  });
  res.json({ message: (response.content[0] as any).text });
});

export default router;
