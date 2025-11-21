
export interface Participant {
  id: string;
  name: string;
  password?: string;
  wishlistItems?: string[];
  groupIds: string[]; // Users can belong to multiple groups
  assignedToId?: string; // Only relevant for the specific context (handled via filtered mapping in state or ephemeral)
  // For multi-group support, assignments need to be mapped per group.
  // We will store assignments in the Group object, not the Participant object, 
  // OR store a record here: { [groupId]: targetId }
  assignments: Record<string, string>; 
  
  status: 'pending' | 'approved';
  isReady: boolean; // This could be per group, but for simplicity, we'll treat "Ready" as global or add to Group. 
  // Actually, readiness should be per group.
  readyGroups: string[]; // IDs of groups where user is ready
  revealedGroups: string[]; // IDs of groups where user revealed
}

export interface PollOption {
  id: string;
  text: string;
  // votes count is derived from Poll.userSelections
}

export interface Poll {
  id: string;
  groupId: string; // Polls belong to a group
  question: string;
  options: PollOption[];
  userSelections: Record<string, string>; // userId -> optionId. Ensures 1 vote per user.
}

export interface Group {
  id: string;
  name: string;
  budget: string;
  currency: string;
  exchangeDate: string;
  isActive: boolean;
  isDrawComplete: boolean;
}

export interface AppState {
  participants: Participant[];
  groups: Group[];
  polls: Poll[];
  adminPassword?: string;
}

export interface UserShareData {
  recipientName: string;
  recipientWishlistItems?: string[];
  groupName: string;
  budget: string;
  currency: string;
  exchangeDate: string;
  adminName: string;
}
