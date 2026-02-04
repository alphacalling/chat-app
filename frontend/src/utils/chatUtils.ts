interface ChatUser {
  id: string;
  name: string;
  email?: string | null;
  phone?: string;
  avatar?: string | null;
}

// Logged in user ke alawa dusre user ko nikalne ka logic
export const getSender = (
  loggedUser: { id: string } | null | undefined,
  users: ChatUser[]
): ChatUser => {
  if (!users || users.length === 0) {
    return { id: "", name: "Unknown", email: null };
  }

  if (!loggedUser || users.length < 2) {
    return users[0] || { id: "", name: "Unknown", email: null };
  }

  return users[0].id === loggedUser.id ? users[1] : users[0];
};

// Sender ka full details nikalne ke liye
export const getSenderFull = (
  loggedUser: { id: string } | null | undefined,
  users: ChatUser[]
): ChatUser | null => {
  if (!loggedUser || !users || users.length < 2) return null;
  return users[0].id === loggedUser.id ? users[1] : users[0];
};