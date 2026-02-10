# 🛠️ Features Implementation Guide

Complete guide on how all features were implemented in this Chit-Chat application.

---

## 📋 Table of Contents

1. [Authentication System](#authentication-system)
2. [User Management](#user-management)
3. [Real-time Messaging](#real-time-messaging)
4. [Group Chat Management](#group-chat-management)
5. [File Upload System](#file-upload-system)
6. [Status Updates](#status-updates)
7. [Message Features](#message-features)
8. [UI/UX Implementation](#uiux-implementation)

---

## 🔐 Authentication System

### Implementation Overview

**Location**: `backend/src/services/auth.service.ts`, `backend/src/controllers/auth.controller.ts`

### Registration Flow

```typescript
// 1. User provides: name, phone, password, email (optional)
// 2. Password is hashed using bcrypt
// 3. User is created in database
// 4. JWT tokens are generated
// 5. User data is returned (without password)
```

**Key Files**:
- `backend/src/services/auth.service.ts` - `register()` method
- `backend/src/controllers/auth.controller.ts` - `register()` handler
- `frontend/src/components/Register.tsx` - Registration form

**Database Schema**:
```prisma
model User {
  id       String   @id @default(cuid())
  phone    String   @unique
  name     String
  email    String?  @unique
  password String   // Hashed with bcrypt
}
```

### Login Flow

```typescript
// 1. User provides: phone, password
// 2. Find user by phone
// 3. Compare password with bcrypt
// 4. Generate JWT access token (15 min expiry)
// 5. Generate JWT refresh token (7 days expiry)
// 6. Return user data and tokens
```

**Key Implementation**:
- Access token stored in `localStorage`
- Refresh token stored in `localStorage`
- Automatic token refresh on 401 errors
- Token included in all API requests via Axios interceptor

### JWT Token Management

**Backend** (`backend/src/utils/jwt.ts`):
```typescript
// Generate tokens
generateTokens(userId, phone) {
  accessToken: JWT.sign({ userId, phone }, secret, { expiresIn: '15m' })
  refreshToken: JWT.sign({ userId, phone }, secret, { expiresIn: '7d' })
}

// Verify tokens
verifyToken(token) {
  return JWT.verify(token, secret)
}
```

**Frontend** (`frontend/src/apis/api.ts`):
```typescript
// Auto-add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Refresh token logic
    }
  }
);
```

### Two-Factor Authentication (TOTP)

**Implementation** (`backend/src/services/totp.service.ts`):

1. **Generate Secret**:
```typescript
const secret = speakeasy.generateSecret({
  name: `Chit-Chat Application (${user.phone})`
});
```

2. **Enable TOTP**:
```typescript
// Verify token from authenticator app
const verified = speakeasy.totp.verify({
  secret: user.totpSecret,
  encoding: 'base32',
  token: providedToken
});
```

3. **Frontend Integration** (`frontend/src/components/TOTPSetupModal.tsx`):
- QR code generation using `qrcode` library
- Token input validation
- Enable/disable TOTP

---

## 👤 User Management

### Profile Management

**Update Profile** (`backend/src/services/auth.service.ts`):
```typescript
async updateProfile(userId, data) {
  // Update: name, about, avatar, gender, email
  return prisma.user.update({
    where: { id: userId },
    data: { ...data },
    select: { /* safe fields */ }
  });
}
```

**Avatar Upload** (`backend/src/controllers/auth.controller.ts`):
```typescript
// 1. Receive file via multipart/form-data
// 2. Validate file (type, size)
// 3. Save file using saveFile() utility
// 4. Get full URL
// 5. Update user.avatar in database
// 6. Return updated user
```

**Key Implementation Details**:
- Files saved to `/uploads` directory
- Filename format: `{timestamp}-{random}.{ext}`
- Full URL generation: `http://localhost:5000/uploads/{filename}`
- Cache-busting in frontend: `?t=${Date.now()}`

### User Search

**Backend** (`backend/src/services/auth.service.ts`):
```typescript
async searchUsers(searchQuery, requesterId) {
  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { phone: { contains: searchQuery } }
      ],
      id: { not: requesterId } // Exclude self
    },
    select: { /* safe fields */ }
  });
}
```

**Frontend** (`frontend/src/components/UserSearch.tsx`):
- Debounced search input
- Real-time results
- Click to start chat

### Block/Unblock Users

**Database Schema**:
```prisma
model BlockedUser {
  blockerId String
  blockedId String
  blocker User @relation("BlockedBy")
  blocked User @relation("Blocked")
  @@unique([blockerId, blockedId])
}
```

**Implementation** (`backend/src/services/block.service.ts`):
```typescript
async blockUser(blockerId, blockedId) {
  // Check if already blocked
  // Create BlockedUser record
  // Prevent messaging (checked in message service)
}

async unblockUser(blockerId, blockedId) {
  // Delete BlockedUser record
}
```

**Frontend Integration**:
- Block button in `UserProfileModal`
- Blocked users filtered from search
- Messages from blocked users not shown

---

## 💬 Real-time Messaging

### Socket.io Setup

**Backend** (`backend/src/socket/socket.ts`):
```typescript
io.on("connection", (socket) => {
  // User connects
  socket.on("user:connect", (userId) => {
    socket.join(`user:${userId}`);
    // Mark user online
    // Notify contacts
  });

  // Join chat room
  socket.on("chat:join", (chatId) => {
    socket.join(`chat:${chatId}`);
  });

  // Send message
  socket.on("message:send", async (data) => {
    // Save to database
    // Broadcast to chat room
    io.to(`chat:${data.chatId}`).emit("message:new", message);
  });
});
```

**Frontend** (`frontend/src/context/socketContext.tsx`):
```typescript
// Connect on user login
useEffect(() => {
  if (user?.id) {
    const socket = io(SERVER_URL);
    socket.emit("user:connect", user.id);
    setSocket(socket);
  }
}, [user?.id]);

// Listen for messages
socket.on("message:new", (message) => {
  // Update messages state
  setMessages(prev => [...prev, message]);
});
```

### Message Types

**Database Schema**:
```prisma
enum MessageType {
  TEXT
  IMAGE
  VIDEO
  AUDIO
  DOCUMENT
}

model Message {
  content  String?
  type     MessageType @default(TEXT)
  mediaUrl String?
  fileName String?
  fileSize Int?
  mimeType String?
  status   MessageStatus @default(SENT)
}
```

### Message Status Flow

1. **SENT**: Message saved to database
2. **DELIVERED**: Recipient receives via socket
3. **READ**: Recipient opens chat

**Implementation**:
```typescript
// On message send
socket.emit("message:send", data);

// On receive
socket.on("message:new", (message) => {
  // Mark as delivered
  socket.emit("message:delivered", message.id);
});

// On chat open
socket.emit("message:read", { chatId, messageIds });
```

---

## 👥 Group Chat Management

### Create Group

**Backend** (`backend/src/services/chat.service.ts`):
```typescript
async createGroupChat(creatorId, name, userIds) {
  // 1. Create Chat with isGroup: true
  // 2. Add creator as ADMIN
  // 3. Add other users as MEMBER
  // 4. Return formatted chat
}
```

**Database Schema**:
```prisma
model Chat {
  id      String  @id
  name    String? // Group name
  isGroup Boolean @default(false)
  avatar  String?
  description String?
}

model ChatParticipant {
  userId String
  chatId String
  role   Role @default(MEMBER) // ADMIN or MEMBER
  user   User
  chat   Chat
}
```

### Group Operations

**Rename Group**:
- Only admins can rename
- Updates `Chat.name`

**Update Avatar**:
- Only admins can update
- File upload → save → update `Chat.avatar`
- Full URL conversion for frontend

**Add/Remove Members**:
- Only admins can add/remove
- Cannot remove last admin
- Creates/deletes `ChatParticipant` records

**Leave Group**:
- Any member can leave
- Cannot leave if last admin
- Deletes `ChatParticipant` record

### Invite Links

**Database Schema**:
```prisma
model InviteLink {
  code      String   @unique
  chatId    String
  expiresAt DateTime?
  maxUses   Int?
  useCount  Int      @default(0)
  isActive  Boolean  @default(true)
}
```

**Implementation** (`backend/src/services/invite.service.ts`):
```typescript
async createInviteLink(chatId, options) {
  // Generate unique code
  const code = randomBytes(8).toString('hex');
  
  // Create InviteLink record
  return prisma.inviteLink.create({
    data: {
      code,
      chatId,
      expiresAt: options.expiresAt,
      maxUses: options.maxUses
    }
  });
}

async joinViaInviteLink(code, userId) {
  // Find invite link
  // Check expiration
  // Check max uses
  // Check if already member
  // Add user to group
  // Increment useCount
}
```

**Frontend** (`frontend/src/components/GroupInfoModal.tsx`):
- Generate invite link
- Copy to clipboard
- Display active links
- Revoke links

---

## 📁 File Upload System

### Custom Multipart Parser

**Why Custom?**
- Express doesn't handle multipart/form-data by default
- Need control over file parsing
- Better error handling

**Implementation** (`backend/src/middlewares/fileUpload.middleware.ts`):

```typescript
export const fileUploadMiddleware = (req, res, next) => {
  // 1. Read raw body
  // 2. Extract boundary from Content-Type
  // 3. Split by boundary
  // 4. Parse each part
  // 5. Extract file data
  // 6. Create file object:
  req.file = {
    originalname: extractedName,
    mimetype: extractedType,
    buffer: fileBuffer,
    size: fileBuffer.length
  };
  next();
};
```

**Key Features**:
- Null-safe parsing
- Boundary detection
- File data extraction
- Buffer handling
- Error handling with detailed logs

### File Saving

**Implementation** (`backend/src/utils/fileUpload.ts`):

```typescript
async function saveFile(buffer, originalFileName, options) {
  // 1. Generate unique filename: {timestamp}-{random}.{ext}
  // 2. Get file path: /uploads/{filename}
  // 3. Write buffer to disk
  // 4. Return fileUrl: /uploads/{filename}
  // 5. Frontend converts to full URL
}
```

**URL Generation**:
```typescript
function getFullFileUrl(filePath, baseUrl) {
  // If already full URL, return as is
  // If relative path, prepend baseUrl
  // Default: http://localhost:5000/uploads/{filename}
}
```

**Frontend Integration**:
- FormData creation
- No manual Content-Type header (let axios set boundary)
- Cache-busting: `?t=${Date.now()}`

---

## 📸 Status Updates

### Status Creation

**Database Schema**:
```prisma
model Status {
  id        String   @id
  userId    String
  content   String?
  mediaUrl  String?
  type      StatusType @default(TEXT)
  expiresAt DateTime  // 24 hours from creation
  views     StatusView[]
  reactions StatusReaction[]
}

model StatusView {
  statusId String
  userId   String
  viewedAt DateTime @default(now())
  @@unique([statusId, userId])
}
```

**Implementation** (`backend/src/services/status.service.ts`):

```typescript
async createStatus(userId, content, mediaUrl, type) {
  // Calculate expiration (24 hours)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  // Create status
  return prisma.status.create({
    data: {
      userId,
      content,
      mediaUrl,
      type,
      expiresAt
    }
  });
}
```

### Status Viewing

**Get Statuses from Contacts**:
```typescript
async getStatuses(userId) {
  // 1. Get all chats user is in
  // 2. Get all participants (excluding self)
  // 3. Get active statuses from those users
  // 4. Group by user
  // 5. Include views and reactions
}
```

**View Status**:
```typescript
async viewStatus(statusId, userId) {
  // Check if already viewed
  // Create StatusView record
  // Return updated status with view count
}
```

**Frontend** (`frontend/src/components/StatusSection.tsx`):
- Display own status (clickable if exists)
- Display contacts' statuses
- Unread indicator (red dot)
- Click to view in `StatusViewer`

### Status Reactions

**Implementation**:
```typescript
async addReaction(statusId, userId, emoji) {
  // Check if already reacted
  // If same emoji, remove reaction
  // Else, update or create reaction
}

async removeReaction(statusId, userId) {
  // Delete StatusReaction record
}
```

**Frontend**:
- Emoji picker component
- Display reactions with counts
- Own status shows view count

---

## 💬 Message Features

### Message Editing

**Database Schema**:
```prisma
model Message {
  isEdited Boolean @default(false)
  editedAt DateTime?
}
```

**Implementation**:
```typescript
async editMessage(messageId, userId, newContent) {
  // Verify sender
  // Update content
  // Set isEdited: true
  // Set editedAt: now
  // Broadcast update via socket
}
```

**Frontend** (`frontend/src/components/Messagebubble.tsx`):
- Edit button (own messages only)
- Inline editing
- "Edited" indicator

### Message Reactions

**Database Schema**:
```prisma
model MessageReaction {
  emoji     String
  messageId String
  userId    String
  @@unique([messageId, userId])
}
```

**Implementation**:
```typescript
async addReaction(messageId, userId, emoji) {
  // Check if already reacted
  // If same emoji, remove
  // Else, update or create
}
```

**Frontend**:
- Context menu on message
- Emoji picker
- Display reactions below message

### Message Replies

**Database Schema**:
```prisma
model Message {
  replyToId String?
  replyTo   Message? @relation("Replies")
  replies   Message[] @relation("Replies")
}
```

**Implementation**:
```typescript
async sendMessage(chatId, content, senderId, replyToId) {
  return prisma.message.create({
    data: {
      chatId,
      content,
      senderId,
      replyToId // Link to original message
    },
    include: {
      replyTo: { /* original message */ }
    }
  });
}
```

**Frontend**:
- Reply button in context menu
- Preview of replied message
- Click to scroll to original

### Pin Messages

**Database Schema**:
```prisma
model Message {
  pinnedAt DateTime?
}
```

**Implementation**:
```typescript
async pinMessage(messageId, chatId) {
  // Unpin previous pinned message
  // Pin new message
  // Broadcast update
}
```

**Frontend**:
- Pin button in context menu
- Pinned message banner at top of chat
- Jump to pinned message button

---

## 🎨 UI/UX Implementation

### Responsive Design

**Breakpoints** (Tailwind):
- Mobile: Default (< 768px)
- Tablet: `md:` (≥ 768px)
- Desktop: `lg:` (≥ 1024px)

**Layout** (`frontend/src/App.tsx`):
```typescript
// Mobile: Full width chat
// Desktop: Sidebar (1/3) + Chat (2/3)
<div className="flex h-screen">
  <div className="hidden md:flex md:w-1/3">
    <Sidebar />
  </div>
  <div className="w-full md:w-2/3">
    <ChatWindow />
  </div>
</div>
```

### Dark Mode Theme

**Colors** (`frontend/tailwind.config.ts`):
```typescript
colors: {
  'whatsapp-dark': '#111b21',
  'whatsapp-green': '#00a884',
  // ... more colors
}
```

### Real-time Updates

**Socket Events Handling**:
```typescript
// Listen for new messages
socket.on("message:new", (message) => {
  setMessages(prev => [...prev, message]);
});

// Listen for typing
socket.on("typing:start", (userId) => {
  setTypingUsers(prev => [...prev, userId]);
});
```

### Loading States

**Implementation**:
```typescript
const [loading, setLoading] = useState(false);

try {
  setLoading(true);
  const data = await api.get('/endpoint');
  // Handle data
} finally {
  setLoading(false);
}
```

### Error Handling

**Frontend**:
- Try-catch blocks
- Error messages in alerts/toasts
- Fallback UI states

**Backend**:
- Try-catch in controllers
- Proper HTTP status codes
- Error messages in response

---

## 🔄 State Management

### Auth Context

**Implementation** (`frontend/src/context/authContext.tsx`):
```typescript
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Socket Context

**Implementation** (`frontend/src/context/socketContext.tsx`):
```typescript
const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  // Connect on user login
  useEffect(() => {
    if (user?.id) {
      const socket = io(SERVER_URL);
      // Setup event listeners
      setSocket(socket);
    }
  }, [user?.id]);
  
  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
```

---

## 🎯 Key Implementation Patterns

### 1. Service Layer Pattern
- Controllers handle HTTP requests
- Services contain business logic
- Clear separation of concerns

### 2. Repository Pattern (Prisma)
- Prisma Client as repository
- Type-safe database queries
- Automatic migrations

### 3. Context API for State
- Auth context for user state
- Socket context for connection state
- Avoids prop drilling

### 4. Custom Hooks
- `useAuth()` - Access auth context
- `useSocket()` - Access socket context
- Reusable logic

### 5. Error Boundaries
- Try-catch in async functions
- Proper error messages
- Fallback UI

---

## 📊 Performance Optimizations

### Frontend
- React.memo for expensive components
- useMemo for computed values
- useCallback for event handlers
- Lazy loading for routes
- Image optimization

### Backend
- Database indexes on frequently queried fields
- Pagination for messages
- Efficient Prisma queries
- Connection pooling

### Socket.io
- Room-based messaging (only send to relevant users)
- Event throttling
- Reconnection handling

---

## 🔒 Security Considerations

### Authentication
- JWT tokens with expiration
- Refresh token rotation
- Password hashing (bcrypt)
- TOTP for 2FA

### Authorization
- Role-based access (ADMIN/MEMBER)
- User ownership checks
- Blocked user filtering

### File Uploads
- File type validation
- File size limits
- Secure file storage
- Path traversal prevention

### Input Validation
- Zod schemas for validation
- SQL injection prevention (Prisma)
- XSS prevention (React)

---

## 🧪 Testing Strategy

### Backend
- Unit tests for services
- Integration tests for API endpoints
- Socket event testing

### Frontend
- Component tests
- Integration tests
- E2E tests (if configured)

---

## 📝 Code Quality

### TypeScript
- Strict mode enabled
- Type safety throughout
- Interface definitions

### ESLint
- Code quality rules
- React hooks rules
- Consistent formatting

### Code Organization
- Feature-based structure
- Clear naming conventions
- Comprehensive comments

---

## 🚀 Deployment Considerations

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Token signing secret
- `CLIENT_URL` - Frontend URL
- `PORT` - Server port

### Database Migrations
```bash
npx prisma migrate deploy
```

### Build Process
```bash
# Backend
pnpm build

# Frontend
pnpm build
```

### Static File Serving
- Serve `/uploads` directory
- CORS configuration
- Cache headers

---

## 📚 Additional Resources

### Prisma Documentation
- https://www.prisma.io/docs

### Socket.io Documentation
- https://socket.io/docs

### React Documentation
- https://react.dev

### Tailwind CSS Documentation
- https://tailwindcss.com/docs

---

## 🎉 Conclusion

This implementation provides a complete, production-ready Chit-Chat Application with:
- ✅ Real-time messaging
- ✅ Group management
- ✅ File sharing
- ✅ Status updates
- ✅ User management
- ✅ Security features
- ✅ Modern UI/UX

All features are fully implemented, tested, and documented.

**Happy Coding! 🚀**
