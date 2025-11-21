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

  const prompt = `
    Jesteś pomocnikiem Świętego Mikołaja.
    Muszę kupić prezent dla osoby o imieniu: ${recipientName}.
    Budżet to: ${budget} ${currency}.
    ${interests ? `Zainteresowania/Wskazówki: ${interests}` : 'Brak konkretnych wskazówek, zaproponuj coś uniwersalnego ale kreatywnego.'}
    ${ageGroup ? `Grupa wiekowa: ${ageGroup}` : ''}

    Zaproponuj 5 konkretnych pomysłów na prezent, które mieszczą się w tym budżecie.
    Dla każdego pomysłu napisz krótkie, zabawne uzasadnienie w świątecznym tonie.
    Nie formatuj tego jako JSON, tylko jako ładną listę z punktami (emoji na początku każdego punktu).
    Odpowiadaj po polsku.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Nie udało się wygenerować pomysłów.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ho ho ho! Mikołaj ma małą awarię sań (błąd połączenia). Spróbuj ponownie później.";
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
    Napisz krótkie, zabawne, rymowane zaproszenie na grupowe losowanie prezentów (Secret Santa/Mikołajki).
    Nazwa grupy: ${groupName}.
    Data finału/wymiany: ${date}.
    Budżet: ${budget} ${currency}.
    Zachęć do kliknięcia w link (który administrator wyśle osobno).
    Język polski. Klimat bardzo świąteczny.
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
