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

export const performDraw = (participants: Participant[]): Participant[] => {
  if (participants.length < 2) return participants;

  let shuffled = shuffleArray(participants);
  let isValid = false;

  // Ensure no one draws themselves
  // Simple approach: Rotate array by 1 if strict circularity is desired,
  // or keep shuffling until valid for small groups.
  // For guaranteed result without infinite loops in small sets:
  // Just shift the array by 1 index for assignment.
  
  // Create a mapping
  const ids = participants.map(p => p.id);
  const rotatedIds = [...ids.slice(1), ids[0]]; // Rotate assignments

  return participants.map((p) => {
    const targetId = rotatedIds[ids.indexOf(p.id)];
    const target = participants.find(part => part.id === targetId);
    return {
      ...p,
      assignedToId: targetId,
      assignedToName: target?.name
    };
  });
};

// Simple obfuscation for the URL (NOT high security, but prevents casual peeking)
export const encodeShareData = (data: UserShareData): string => {
  const json = JSON.stringify(data);
  // Encode to Base64
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
