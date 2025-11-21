
import { Participant, UserShareData } from "../types";

// Fisher-Yates Shuffle
export const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Returns a Record<UserId, TargetUserId>
export const performDraw = (participantIds: string[]): Record<string, string> => {
  if (participantIds.length < 2) return {};

  // Fisher-Yates shuffle to randomize order
  let shuffled = shuffleArray(participantIds);
  
  // Simple rotation: Everyone gives to the person "next" to them in the shuffled circle
  const assignments: Record<string, string> = {};
  
  for (let i = 0; i < shuffled.length; i++) {
    const giver = shuffled[i];
    const receiver = shuffled[(i + 1) % shuffled.length]; // Wrap around to 0 at the end
    assignments[giver] = receiver;
  }

  return assignments;
};

export const encodeShareData = (data: UserShareData): string => {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
};

export const decodeShareData = (hash: string): UserShareData | null => {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    return JSON.parse(json);
  } catch (e) {
    console.error("Failed to decode share data", e);
    return null;
  }
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const getDaysUntil = (dateStr: string): number | null => {
  if (!dateStr) return null;
  const now = new Date().getTime();
  const target = new Date(dateStr).getTime();
  const distance = target - now;
  return distance / (1000 * 60 * 60 * 24);
}
