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
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Brakuje OPENROUTER_API_KEY w ustawieniach Vercel dla środowiska Production. Dodaj klucz OpenRouter i wykonaj Redeploy." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy format żądania. Oczekiwano JSON." }, { status: 400 });
  }

  const input = body as { prompt?: unknown; mode?: unknown };
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  const mode = typeof input.mode === "string" && modes[input.mode] ? input.mode : "assistant";

  if (!prompt) return NextResponse.json({ error: "Wpisz treść zapytania." }, { status: 400 });
  if (prompt.length > 12000) {
    return NextResponse.json({ error: "Zapytanie jest za długie. Limit to 12 000 znaków." }, { status: 400 });
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://net-ai-studio.vercel.app",
        "X-Title": "NET AI Studio"
      }
    });

    const response = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "openrouter/free",
      messages: [
        {
          role: "system",
          content: [
            modes[mode],
            "Jesteś częścią produktu NET AI Studio.",
            "Odpowiadaj po polsku, chyba że użytkownik poprosi o inny język.",
            "Nie twierdź, że uruchomiłeś, opublikowałeś lub zapisałeś projekt, jeśli tego faktycznie nie zrobiłeś.",
            "Nigdy nie umieszczaj kluczy API ani haseł w kodzie przeglądarki."
          ].join("\n")
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 7000
    });

    const answer = response.choices[0]?.message?.content;
    return NextResponse.json({
      answer: typeof answer === "string" && answer.trim()
        ? answer
        : "Model nie zwrócił tekstu. Spróbuj ponownie."
    });
  } catch (error) {
    console.error("NET AI OpenRouter error:", error);
    const message = error instanceof Error ? error.message : "Nieznany błąd dostawcy AI.";
    return NextResponse.json({ error: `Błąd darmowego modelu AI: ${message.slice(0, 300)}` }, { status: 502 });
  }
}
