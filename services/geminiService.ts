import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateGiftIdeas = async (
  recipientName: string,
  budget: string,
  currency: string,
  interests: string,
  ageGroup?: string
): Promise<string> => {
  if (!apiKey) return "Proszę skonfigurować klucz API, aby otrzymać sugestie.";

  // Simplified prompt for concrete answers
  const prompt = `
    Jesteś asystentem prezentowym.
    Osoba: ${recipientName}.
    Budżet: ${budget} ${currency}.
    Lista życzeń/Zainteresowania: ${interests || "Brak, wymyśl coś uniwersalnego"}.

    Wypisz 3 KONKRETNE propozycje prezentów.
    Bez "lania wody".
    Tylko lista z krótkim (jedno zdanie) wyjaśnieniem dlaczego to pasuje.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Nie udało się wygenerować pomysłów.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Błąd połączenia z AI.";
  }
};

export const generateGroupInvite = async (
  groupName: string,
  date: string,
  budget: string,
  currency: string
): Promise<string> => {
  if (!apiKey) return "";

  const prompt = `
    Napisz krótkie, zabawne zaproszenie na grupowe losowanie prezentów.
    Nazwa wydarzenia: ${groupName}.
    Data finału/wymiany: ${date}.
    Budżet: ${budget} ${currency}.
    Zachęć do kliknięcia w link (który administrator wyśle osobno).
    Język polski.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    return "";
  }
};