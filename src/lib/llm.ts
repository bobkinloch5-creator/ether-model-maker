// LLM helpers — now backed by Lovable AI Gateway via a server function.
import { chatViaGateway } from "@/lib/ai.functions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMResponse {
  success: boolean;
  text: string;
  error?: string;
}

export async function chatWithLLM(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<LLMResponse> {
  try {
    const res = await chatViaGateway({
      data: {
        messages,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 1024,
      },
    });
    return { success: true, text: res.text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, text: "", error: msg };
  }
}

export async function enhancePrompt(shortPrompt: string): Promise<LLMResponse> {
  return chatWithLLM(
    [
      {
        role: "system",
        content:
          "You are a 3D asset description expert. Expand short prompts into vivid 2-3 sentence descriptions covering shape, materials (PBR), colors, style, and scale. Output only the description.",
      },
      { role: "user", content: shortPrompt },
    ],
    { temperature: 0.8, maxTokens: 220 }
  );
}

export async function assistantChat(userMessage: string, history: ChatMessage[] = []): Promise<LLMResponse> {
  return chatWithLLM(
    [
      {
        role: "system",
        content:
          "You are the KingDavez Studios.pro AI assistant. Keep replies to 1-2 short sentences. Costs: text-to-3D 2 credits, image-to-3D 3, retexture 1, text-to-image 1. New accounts get 25 free credits. Buy credits via PayPal.",
      },
      ...history,
      { role: "user", content: userMessage },
    ],
    { temperature: 0.7, maxTokens: 320 }
  );
}

export async function checkLLMStatus(): Promise<boolean> {
  return true;
}
