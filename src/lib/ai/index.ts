/**
 * AI / Groq-backed integrations.
 * All calls to AI Edge Functions route through helpers here.
 * Client-side code must NOT import Groq API keys — those live in Edge Functions.
 */
export * from "@/lib/ai-companion-settings";
export * from "@/lib/daily-quote-client";
export * from "@/lib/idea-web-companion-client";
