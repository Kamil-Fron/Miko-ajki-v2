export interface Participant {
  id: string;
  name: string;
  wishlist?: string; // Optional hint from admin or pre-filled
  assignedToId?: string; // ID of the person they are buying for
  assignedToName?: string; // Name of the person they are buying for (for display in decoded view)
  status: 'pending' | 'approved'; // Moderation status
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
}

export interface GroupSettings {
  groupName: string;
  budget: string;
  exchangeDate: string;
  currency: string;
  adminName: string;
}

export interface AppState {
  participants: Participant[];
  polls: Poll[];
  settings: GroupSettings;
  isDrawComplete: boolean;
}

// Data structure encoded in the share URL for a specific user
export interface UserShareData {
  recipientName: string; // Who they are buying for
  recipientWishlist?: string; // What that person wants
  groupName: string;
  budget: string;
  currency: string;
  exchangeDate: string;
  adminName: string;
}