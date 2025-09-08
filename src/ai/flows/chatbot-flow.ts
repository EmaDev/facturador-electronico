
'use server';
/**
 * @fileOverview A chatbot flow for answering questions about the system.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ChatbotInputSchema = z.array(ChatMessageSchema);

const ChatbotOutputSchema = z.string();

export async function askChatbot(history: z.infer<typeof ChatbotInputSchema>): Promise<z.infer<typeof ChatbotOutputSchema>> {
    return chatbotFlow(history);
}

const systemPrompt = `You are an expert AI assistant for an application called "AI Facturador Electronico".
Your purpose is to help users manage their invoices and customers.
You can answer questions, analyze data, and generate content like emails.
Be friendly, helpful, and concise.

Available features you can help with:
- Customer analysis: "Who are my top 5 customers by revenue?"
- Invoice analysis: "What's my total invoiced amount for last month?"
- Email generation: "Write a reminder email to a customer about an overdue invoice."
- General questions: "How do I create a new invoice?"

When asked to perform an action that requires data, like analyzing customers or invoices, you should state that you need to retrieve the data first. In a future version, you will be able to access this data directly. For now, provide helpful example responses.
`;

const chatbotFlow = ai.defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: ChatbotInputSchema,
    outputSchema: ChatbotOutputSchema,
  },
  async (history) => {

    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: {
        system: systemPrompt,
        messages: history,
      },
      config: {
        temperature: 0.5,
      }
    });

    return llmResponse.text;
  }
);
