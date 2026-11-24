import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const modes: Record<string, string> = {
  assistant: "Jesteś wszechstronnym asystentem NET. Odpowiadasz po polsku, konkretnie i praktycznie.",
  app: "Jesteś doświadczonym programistą. Projektujesz aplikacje. Domyślnie przygotuj kompletny, samodzielny plik HTML z CSS i JavaScript, chyba że użytkownik poprosi o inny stos.",
  website: "Jesteś ekspertem od stron WWW. Twórz kompletne, responsywne strony, domyślnie jako samodzielny HTML z CSS i JavaScript.",
  game: "Jesteś twórcą gier webowych. Twórz gry przeglądarkowe w jednym pliku HTML, uwzględniaj sterowanie dotykowe.",
  code: "Jesteś starszym programistą. Analizuj, pisz i naprawiaj kod. Podawaj kompletne rozwiązania oraz instrukcję użycia."
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Brakuje OPENAI_API_KEY w ustawieniach Vercel dla tego środowiska. Dodaj zmienną i wykonaj Redeploy." }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Nieprawidłowy format żądania. Oczekiwano JSON." }, { status: 400 }); }

  const input = body as { prompt?: unknown; mode?: unknown };
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  const mode = typeof input.mode === "string" && modes[input.mode] ? input.mode : "assistant";
  if (!prompt) return NextResponse.json({ error: "Wpisz treść zapytania." }, { status: 400 });
  if (prompt.length > 12000) return NextResponse.json({ error: "Zapytanie jest za długie. Limit to 12 000 znaków." }, { status: 400 });

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: [
        modes[mode],
        "Jesteś częścią produktu NET AI Studio.",
        "Odpowiadaj po polsku, chyba że użytkownik poprosi o inny język.",
        "Nie twierdź, że uruchomiłeś, opublikowałeś lub zapisałeś projekt, jeśli tego faktycznie nie zrobiłeś.",
        "Nigdy nie umieszczaj kluczy API ani haseł w kodzie przeglądarki."
      ].join("\n"),
      input: prompt,
      max_output_tokens: 7000
    });
    return NextResponse.json({ answer: response.output_text || "Model nie zwrócił tekstu. Spróbuj ponownie." });
  } catch (error) {
    console.error("NET AI API error:", error);
    const message = error instanceof Error ? error.message : "Nieznany błąd OpenAI.";
    return NextResponse.json({ error: `Błąd OpenAI: ${message.slice(0, 300)}` }, { status: 502 });
  }
}
