# 💬 Chit-Chat Application - Full Featured Messaging Application

A complete WhatsApp-like messaging application built with modern web technologies, featuring real-time messaging, group chats, status updates, file sharing, and more.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **pnpm** (package manager)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd <project-folder>  # e.g. chit-chat-app

# Install backend dependencies
cd backend
pnpm install

# Install frontend dependencies
cd ../frontend
pnpm install
```

### Environment Setup

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/chitchatapp"
JWT_SECRET="your-secret-key-here"
CLIENT_URL="http://localhost:5173"
PORT=5000
```

### 📊 Prisma Database Setup (Step-by-Step)

#### Step 1: Prisma Configuration

Prisma uses a configuration file to manage database connections. In this project, we use `prisma.config.ts`:

```typescript
// backend/prisma/prisma.config.ts
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export default prisma;
```

**Theory**: Prisma Client is a type-safe database client that auto-generates TypeScript types from your schema. The `DATABASE_URL` tells Prisma where your PostgreSQL database is located.

#### Step 2: Generate Prisma Client

```bash
cd backend
npx prisma generate
```

**What this does**:
- Reads `schema.prisma` file
- Generates TypeScript types for all models
- Creates Prisma Client with type-safe methods
- Output: `node_modules/.prisma/client/`

**Theory**: Prisma generates code based on your schema. This gives you autocomplete and type safety when querying the database.

#### Step 3: Database Migration

**Option A: Push Schema (Development - Quick)**
```bash
npx prisma db push
```

**What this does**:
- Compares your schema with database
- Creates/updates tables automatically
- Good for development
- ⚠️ Can lose data if schema changes drastically

**Option B: Create Migration (Production - Safe)**
```bash
# Create a new migration
npx prisma migrate dev --name init

# Apply migrations
npx prisma migrate deploy
```

**What this does**:
- Creates migration files in `prisma/migrations/`
- Tracks schema changes over time
- Safe for production
- Can rollback if needed

**Theory**: Migrations are version-controlled database changes. They allow you to:
- Track what changed and when
- Apply changes to production safely
- Rollback if something goes wrong

#### Step 4: Verify Database Connection

```bash
# Open Prisma Studio (Visual Database Browser)
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View all tables
- Add/edit/delete data
- Test queries visually

#### Step 5: Common Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Push schema changes to database
npx prisma db push

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply pending migrations
npx prisma migrate deploy

# Reset database (⚠️ Deletes all data)
npx prisma migrate reset

# View database in browser
npx prisma studio

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

#### Step 6: Understanding Prisma Schema

**Location**: `backend/prisma/schema.prisma`

**Key Concepts**:

1. **Models** = Database Tables
```prisma
model User {
  id    String @id @default(cuid())
  name  String
  email String @unique
}
```

2. **Relations** = Foreign Keys
```prisma
model Message {
  senderId String
  sender   User @relation(fields: [senderId], references: [id])
}
```

3. **Enums** = Fixed Value Types
```prisma
enum Role {
  ADMIN
  MEMBER
}
```

**Theory**: Prisma schema is a single source of truth. It defines:
- Database structure
- Relationships between tables
- Data types and constraints
- Indexes for performance

#### Step 7: Using Prisma in Code

```typescript
// Import Prisma Client
import { prisma } from '../configs/database.js';

// Create a record
const user = await prisma.user.create({
  data: {
    name: 'John',
    email: 'john@example.com'
  }
});

// Find records
const users = await prisma.user.findMany({
  where: { name: { contains: 'John' } }
});

// Update record
await prisma.user.update({
  where: { id: userId },
  data: { name: 'Jane' }
});

// Delete record
await prisma.user.delete({
  where: { id: userId }
});
```

**Theory**: Prisma provides type-safe database queries. TypeScript will:
- Autocomplete field names
- Check data types
- Prevent SQL injection
- Catch errors at compile time

### Run the Application

```bash
# Terminal 1 - Backend
cd backend
pnpm dev

# Terminal 2 - Frontend
cd frontend
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📖 Prisma Setup Guide (Detailed)

### Understanding Prisma

**What is Prisma?**
Prisma is a modern ORM (Object-Relational Mapping) tool that:
- Generates type-safe database clients
- Provides a visual schema language
- Handles database migrations
- Prevents SQL injection
- Gives autocomplete in your IDE

**Why Prisma?**
- ✅ Type safety (catch errors at compile time)
- ✅ Auto-completion (faster development)
- ✅ Migration management (version control for database)
- ✅ Modern syntax (easier than raw SQL)
- ✅ Works with TypeScript perfectly

### Complete Prisma Setup Process

#### Step 1: Install Prisma (Already in package.json)

```bash
# Prisma CLI is already installed as dev dependency
# No need to install separately
```

#### Step 2: Initialize Prisma (If starting fresh)

```bash
cd backend
npx prisma init
```

This creates:
- `prisma/schema.prisma` - Database schema
- `.env` - Environment variables (if not exists)

#### Step 3: Configure Database URL

Edit `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
```

**Format Explanation**:
- `postgresql://` - Database type
- `username:password` - Database credentials
- `localhost:5432` - Host and port
- `database_name` - Your database name
- `?schema=public` - Schema name (usually public)

#### Step 4: Define Your Schema

Edit `prisma/schema.prisma`:

```prisma
// This is your database schema
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  
  // Relations
  messages  Message[]
}

model Message {
  id        String   @id @default(cuid())
  content   String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

**Key Prisma Schema Concepts**:

1. **@id** - Primary key
2. **@default(cuid())** - Auto-generate unique ID
3. **@unique** - Unique constraint
4. **@default(now())** - Default to current timestamp
5. **@relation** - Foreign key relationship

#### Step 5: Generate Prisma Client

```bash
npx prisma generate
```

**What happens**:
- Reads `schema.prisma`
- Generates TypeScript types
- Creates Prisma Client
- Outputs to `node_modules/.prisma/client/`

**Output**: You can now use `prisma.user.findMany()` with full TypeScript support!

#### Step 6: Create Database Tables

**Option A: Quick Development (db push)**
```bash
npx prisma db push
```

**When to use**:
- Development/testing
- Quick iterations
- Don't need migration history

**What it does**:
- Compares schema with database
- Creates/updates tables
- No migration files created

**Option B: Production Ready (migrate)**
```bash
# Create migration
npx prisma migrate dev --name init

# Apply to database
npx prisma migrate deploy
```

**When to use**:
- Production environments
- Need migration history
- Team collaboration

**What it does**:
- Creates migration file in `prisma/migrations/`
- Tracks all schema changes
- Can rollback if needed

#### Step 7: Use Prisma in Your Code

**Import Prisma Client**:
```typescript
// backend/src/configs/database.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

**Basic Operations**:

```typescript
// CREATE
const user = await prisma.user.create({
  data: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});

// READ (Find Many)
const users = await prisma.user.findMany({
  where: {
    name: { contains: 'John' }
  },
  include: {
    messages: true // Include related messages
  }
});

// READ (Find Unique)
const user = await prisma.user.findUnique({
  where: { id: userId }
});

// UPDATE
const updated = await prisma.user.update({
  where: { id: userId },
  data: { name: 'Jane Doe' }
});

// DELETE
await prisma.user.delete({
  where: { id: userId }
});
```

**Advanced Queries**:

```typescript
// Filter with multiple conditions
const users = await prisma.user.findMany({
  where: {
    AND: [
      { name: { contains: 'John' } },
      { email: { endsWith: '@gmail.com' } }
    ]
  },
  orderBy: { createdAt: 'desc' },
  take: 10, // Limit
  skip: 0   // Offset (pagination)
});

// Include relations
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    messages: {
      where: { createdAt: { gte: new Date('2024-01-01') } },
      orderBy: { createdAt: 'desc' }
    }
  }
});

// Nested create (create user with messages)
const user = await prisma.user.create({
  data: {
    name: 'John',
    email: 'john@example.com',
    messages: {
      create: [
        { content: 'Hello' },
        { content: 'World' }
      ]
    }
  }
});
```

#### Step 8: View Your Database

```bash
npx prisma studio
```

Opens browser at `http://localhost:5555` - Visual database browser!

#### Step 9: Update Schema (When Adding Features)

**Process**:
1. Edit `schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push` (dev) or `npx prisma migrate dev` (prod)

**Example - Adding a field**:
```prisma
model User {
  // ... existing fields
  phone String? // Add new field
}
```

Then:
```bash
npx prisma generate
npx prisma db push
```

#### Step 10: Common Prisma Commands Reference

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Create migration (production)
npx prisma migrate dev --name add_phone_field

# Apply migrations
npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# View database in browser
npx prisma studio

# Format schema file
npx prisma format

# Validate schema syntax
npx prisma validate

# See current database schema
npx prisma db pull
```

### Prisma Schema Best Practices

1. **Always use @id** for primary keys
2. **Use @default(cuid())** for string IDs (better than UUID)
3. **Add @unique** for fields that must be unique
4. **Use enums** for fixed value sets
5. **Add indexes** for frequently queried fields
6. **Use relations** instead of manual foreign keys
7. **Add @@index** for performance

**Example**:
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  phone     String   @unique
  createdAt DateTime @default(now())
  
  messages  Message[]
  
  @@index([email])  // Index for faster queries
  @@index([phone])
}
```

### Troubleshooting Prisma

**Issue: "Cannot find module '@prisma/client'"**
```bash
npx prisma generate
```

**Issue: "Database connection error"**
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL is running
- Check credentials

**Issue: "Schema is out of sync"**
```bash
npx prisma db push
# or
npx prisma migrate dev
```

**Issue: "Migration conflicts"**
```bash
# Reset migrations (⚠️ loses data)
npx prisma migrate reset

# Or manually fix migration files
```

---

## 📈 Development Progress & Roadmap

### ✅ Completed Features (100%)

#### Phase 1: Core Messaging ✅
- ✅ User authentication (Register, Login, JWT)
- ✅ 1-on-1 chat functionality
- ✅ Real-time messaging with Socket.io
- ✅ Message status (Sent, Delivered, Read)
- ✅ Text messages

#### Phase 2: Enhanced Messaging ✅
- ✅ Media messages (Images, Videos, Audio, Documents)
- ✅ Message editing
- ✅ Message deletion
- ✅ Message reactions (Emoji)
- ✅ Reply to messages
- ✅ Pin messages
- ✅ Unread message count

#### Phase 3: Group Features ✅
- ✅ Create groups
- ✅ Group management (rename, avatar, description)
- ✅ Add/remove members
- ✅ Admin/Member roles
- ✅ Leave group
- ✅ Invite links with expiration
- ✅ Join via invite link

#### Phase 4: User Features ✅
- ✅ User profiles (name, email, phone, about, gender)
- ✅ Avatar upload & management
- ✅ User search
- ✅ Block/unblock users
- ✅ View other users' profiles
- ✅ Online/offline status
- ✅ Last seen tracking

#### Phase 5: Status Updates ✅
- ✅ Create status (Text, Image, Video)
- ✅ View statuses from contacts
- ✅ View own statuses with analytics
- ✅ Status reactions
- ✅ Status views tracking
- ✅ 24-hour expiration

#### Phase 6: Security ✅
- ✅ JWT authentication
- ✅ Refresh tokens
- ✅ Password hashing (bcrypt)
- ✅ Two-Factor Authentication (TOTP)
- ✅ Input validation
- ✅ File upload security

#### Phase 7: UI/UX ✅
- ✅ Responsive design (Mobile, Tablet, Desktop)
- ✅ Dark mode theme
- ✅ Smooth animations
- ✅ Loading states
- ✅ Error handling
- ✅ Real-time updates

### 🚧 Future Enhancements (Optional)

#### Phase 8: Advanced Features
- [ ] Voice messages recording
- [ ] Video calls (WebRTC)
- [ ] Message search
- [ ] Chat archiving
- [ ] Message forwarding
- [ ] Starred messages
- [ ] Chat backup/restore
- [ ] End-to-end encryption

#### Phase 9: Performance
- [ ] Message pagination optimization
- [ ] Image compression
- [ ] Lazy loading for media
- [ ] Service worker for offline support
- [ ] CDN for static assets

#### Phase 10: Analytics
- [ ] User activity tracking
- [ ] Message statistics
- [ ] Group analytics
- [ ] Admin dashboard

---

## 📚 Theory & Concepts

### How Real-time Messaging Works

**Architecture**:
```
Client (Browser) ←→ WebSocket ←→ Server ←→ Database
```

**Flow**:
1. User opens chat → Client connects to WebSocket
2. User sends message → Client emits `message:send` event
3. Server receives → Saves to database
4. Server broadcasts → Emits `message:new` to all chat participants
5. Other clients receive → Update UI in real-time

**Why WebSocket?**
- HTTP is request-response (client asks, server responds)
- WebSocket is bidirectional (both can send anytime)
- Perfect for real-time features like chat

### How Media Uploads Work (Cloudinary)

**Process**:
1. **Frontend**: User selects file → Creates `FormData` → Sends via POST
2. **Backend**: Receives multipart/form-data using a custom parser
3. **Validation**: Checks file type and size
4. **Cloud Upload**: Uploads the raw buffer to **Cloudinary** using `uploadToCloudinary`
5. **Database**: Stores the secure Cloudinary URL and metadata
6. **Response**: Returns the Cloudinary URL to the frontend
7. **Frontend**: Displays media directly from Cloudinary CDN

**Why Cloudinary?**
- Optimized, globally distributed media delivery
- Handles images, videos, and raw files
- Built-in transformations and formats
- Secure URLs (`secure_url`) out of the box

### How Authentication Works

**JWT Token Flow**:
```
1. User Login
   ↓
2. Server validates credentials
   ↓
3. Server generates JWT tokens
   - Access Token (15 min) - for API calls
   - Refresh Token (7 days) - for getting new access token
   ↓
4. Client stores tokens
   ↓
5. Client sends Access Token with every request
   ↓
6. Server validates token
   ↓
7. If expired → Client uses Refresh Token to get new Access Token
```

**Why JWT?**
- Stateless (no server-side session storage)
- Scalable (works across multiple servers)
- Secure (signed, can't be tampered)
- Contains user info (no need to query database)

### How Database Relations Work

**Example: User → Messages**:
```prisma
model User {
  sentMessages Message[]
}

model Message {
  senderId String
  sender   User @relation(fields: [senderId], references: [id])
}
```

**Theory**:
- `@relation` creates foreign key in database
- `fields` = column in Message table
- `references` = column in User table
- Prisma handles joins automatically

**Query Example**:
```typescript
// Get user with all messages
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { sentMessages: true }
});
// user.sentMessages = array of Message objects
```

### How State Management Works

**Context API Pattern**:
```typescript
// 1. Create Context
const AuthContext = createContext();

// 2. Create Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Use in Components
const { user } = useAuth(); // Custom hook
```

**Why Context API?**
- Avoids prop drilling (passing props through many components)
- Global state accessible anywhere
- Re-renders only when state changes
- Simpler than Redux for this use case

### How Socket.io Rooms Work

**Concept**: Rooms are like chat rooms. Users join rooms, messages are sent to rooms.

```typescript
// User joins chat room
socket.join(`chat:${chatId}`);

// Send message to room
io.to(`chat:${chatId}`).emit("message:new", message);

// Only users in that room receive the message
```

**Benefits**:
- Efficient (only send to relevant users)
- Scalable (works with multiple servers)
- Organized (each chat is separate room)

---

## 🎯 Best Practices

### Database
- ✅ Always use Prisma migrations in production
- ✅ Add indexes on frequently queried fields
- ✅ Use transactions for multiple operations
- ✅ Validate data before saving

### Security
- ✅ Never expose sensitive data in API responses
- ✅ Always validate file uploads
- ✅ Use environment variables for secrets
- ✅ Hash passwords (never store plain text)

### Code Quality
- ✅ Use TypeScript for type safety
- ✅ Follow consistent naming conventions
- ✅ Add comments for complex logic
- ✅ Handle errors gracefully

### Performance
- ✅ Use pagination for large datasets
- ✅ Optimize database queries
- ✅ Cache frequently accessed data
- ✅ Lazy load heavy components

---

## ✨ Features

### 🔐 Authentication & Security
- ✅ User Registration & Login
- ✅ JWT-based Authentication
- ✅ Refresh Token Support
- ✅ Two-Factor Authentication (TOTP)
- ✅ Password Hashing (bcrypt)

### 👤 User Management
- ✅ User Profiles (Name, Email, Phone, About, Gender)
- ✅ Avatar Upload & Management
- ✅ Online/Offline Status
- ✅ Last Seen Tracking
- ✅ User Search
- ✅ Block/Unblock Users
- ✅ View Other Users' Profiles

### 💬 Messaging
- ✅ 1-on-1 Chat
- ✅ Group Chat
- ✅ Real-time Messaging (Socket.io)
- ✅ Text Messages
- ✅ Media Messages (Images, Videos, Audio, Documents)
- ✅ Message Status (Sent, Delivered, Read)
- ✅ Read Receipts
- ✅ Message Reactions (Emoji)
- ✅ Message Editing
- ✅ Message Deletion
- ✅ Reply to Messages
- ✅ Pin Messages
- ✅ Unread Message Count

### 👥 Group Management
- ✅ Create Groups
- ✅ Rename Groups
- ✅ Group Avatar Upload
- ✅ Group Description
- ✅ Add/Remove Members
- ✅ Admin/Member Roles
- ✅ Leave Group
- ✅ Invite Links (with expiration & max uses)
- ✅ Revoke Invite Links
- ✅ Join via Invite Link

### 📸 Status Updates
- ✅ Create Status (Text, Image, Video)
- ✅ View Statuses from Contacts
- ✅ View Own Statuses (with views & reactions)
- ✅ Status Reactions (Emoji)
- ✅ Status Views Tracking
- ✅ Status Expiration (24 hours)
- ✅ Delete Status

### 📁 File Management
- ✅ File Upload (Images, Videos, Audio, Documents)
- ✅ File Size Validation
- ✅ MIME Type Validation
- ✅ Secure File Storage
- ✅ File URL Generation

### 🎨 UI/UX Features
- ✅ Responsive Design (Mobile, Tablet, Desktop)
- ✅ Dark Mode Theme
- ✅ Smooth Animations
- ✅ Real-time Typing Indicators
- ✅ Loading States
- ✅ Error Handling
- ✅ Toast Notifications
- ✅ Emoji Picker
- ✅ Context Menus

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **WebSocket**: Socket.io
- **Authentication**: JWT, TOTP (Speakeasy)
- **File Upload**: Custom Multipart Parser
- **Language**: TypeScript

### Frontend
- **Framework**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: React Context API
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **WebSocket**: Socket.io Client
- **Animations**: Framer Motion
- **Build Tool**: Vite

---

## 📁 Project Structure

```
chit-chat-app/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express server setup
│   │   ├── socket/
│   │   │   └── socket.ts          # Socket.io handlers
│   │   ├── controllers/           # Request handlers
│   │   │   ├── auth.controller.ts
│   │   │   ├── chat.controller.ts
│   │   │   ├── message.controller.ts
│   │   │   ├── status.controller.ts
│   │   │   ├── block.controller.ts
│   │   │   ├── invite.controller.ts
│   │   │   └── totp.controller.ts
│   │   ├── services/              # Business logic
│   │   │   ├── auth.service.ts
│   │   │   ├── chat.service.ts
│   │   │   ├── message.service.ts
│   │   │   ├── status.service.ts
│   │   │   ├── block.service.ts
│   │   │   ├── invite.service.ts
│   │   │   └── totp.service.ts
│   │   ├── routes/                # API routes
│   │   ├── middlewares/           # Auth & file upload
│   │   ├── utils/                 # Helpers
│   │   └── configs/               # Database config
│   └── prisma/
│       └── schema.prisma          # Database schema
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Main app component
│   │   ├── components/            # React components
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Messagebubble.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── GroupInfoModal.tsx
│   │   │   ├── StatusSection.tsx
│   │   │   ├── UserProfileModal.tsx
│   │   │   └── ... (more components)
│   │   ├── context/               # React contexts
│   │   │   ├── authContext.tsx
│   │   │   └── socketContext.tsx
│   │   ├── apis/                  # API client
│   │   │   └── api.ts
│   │   └── utils/                 # Helper functions
│   └── public/
│
├── README.md                      # This file
└── FEATURES_IMPLEMENTATION.md     # Detailed implementation guide
```

---

## 📚 Documentation

- **[FEATURES_IMPLEMENTATION.md](./FEATURES_IMPLEMENTATION.md)** - Complete guide on how all features were implemented
- **[QUICK_START.md](./QUICK_START.md)** - Quick setup guide (if exists)

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/me/profile` - Get current user profile
- `PATCH /api/me/update-profile` - Update profile
- `POST /api/me/upload-avatar` - Upload avatar
- `GET /api/user/:userId` - Get user profile

### Chats
- `POST /api/chat/access-chat` - Access or create 1-on-1 chat
- `GET /api/chat/fetch-chat` - Get all chats
- `POST /api/chat/create-group` - Create group
- `PUT /api/chat/rename-group` - Rename group
- `PUT /api/chat/add-to-group` - Add member
- `PUT /api/chat/remove-from-group` - Remove member
- `DELETE /api/chat/leave-group/:chatId` - Leave group
- `PUT /api/chat/update-avatar/:chatId` - Update group avatar
- `PUT /api/chat/update-description/:chatId` - Update description

### Messages
- `GET /api/message/get-messages/:chatId` - Get messages
- `POST /api/message/send-message` - Send text message
- `POST /api/message/send-media` - Send media message
- `PUT /api/message/edit/:messageId` - Edit message
- `DELETE /api/message/delete-message/:messageId` - Delete message
- `POST /api/message/reaction/:messageId` - Add reaction
- `DELETE /api/message/reaction/:messageId` - Remove reaction
- `POST /api/message/pin/:messageId` - Pin message
- `POST /api/message/unpin/:messageId` - Unpin message
- `GET /api/message/pinned/:chatId` - Get pinned message
- `PUT /api/message/mark-read/:chatId` - Mark as read

### Status
- `POST /api/status/create` - Create status
- `GET /api/status/all` - Get all statuses
- `GET /api/status/my` - Get own statuses
- `POST /api/status/view/:statusId` - View status
- `POST /api/status/reaction/:statusId` - Add reaction
- `DELETE /api/status/reaction/:statusId` - Remove reaction
- `DELETE /api/status/delete/:statusId` - Delete status

### Invites
- `POST /api/invite/create/:chatId` - Create invite link
- `GET /api/invite/list/:chatId` - Get invite links
- `POST /api/invite/join` - Join via invite
- `DELETE /api/invite/revoke/:linkId` - Revoke invite

### Block
- `POST /api/block/block` - Block user
- `POST /api/block/unblock` - Unblock user
- `GET /api/block/list` - Get blocked users

### TOTP
- `POST /api/totp/generate` - Generate TOTP secret
- `POST /api/totp/enable` - Enable TOTP
- `POST /api/totp/disable` - Disable TOTP

---

## 🎯 Key Features Implementation

### Real-time Messaging
- Uses Socket.io for bidirectional communication
- Events: `message:new`, `message:delivered`, `message:read`, `message:deleted`, `message:edited`
- Automatic reconnection on disconnect
- Typing indicators support

### File Uploads
- Custom multipart/form-data parser
- Supports images, videos, audio, documents
- File validation (size, type)
- Secure file storage in `/uploads` directory
- Full URL generation for file access

### Group Management
- Role-based access (ADMIN, MEMBER)
- Admin-only actions (rename, add/remove members, update avatar)
- Invite links with expiration and usage limits
- Group avatars and descriptions

### Status Updates
- 24-hour expiration
- Support for text, image, and video
- View tracking
- Emoji reactions
- Own statuses visible to creator

---

## 🔒 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- TOTP two-factor authentication
- CORS protection
- Input validation
- File type and size validation
- SQL injection protection (Prisma ORM)

---

## 🧪 Testing

```bash
# Backend
cd backend
pnpm test  # If tests are configured

# Frontend
cd frontend
pnpm test  # If tests are configured
```

---

## 📦 Build for Production

```bash
# Backend
cd backend
pnpm build
pnpm start

# Frontend
cd frontend
pnpm build
pnpm preview
```

---

## 🐛 Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Run `npx prisma generate` and `npx prisma db push`

### Socket Connection Issues
- Ensure backend is running on port 5000
- Check `CLIENT_URL` in backend `.env`
- Verify CORS settings

### File Upload Issues
- Check `/uploads` directory exists
- Verify file permissions
- Check file size limits

---

## 📝 License

ISC

---

## 👨‍💻 Development

### Adding New Features

1. Update Prisma schema if database changes needed
2. Create service layer for business logic
3. Create controller for request handling
4. Add routes
5. Update frontend components
6. Add API methods in `api.ts`
7. Test thoroughly

### Code Style

- TypeScript strict mode
- ESLint for code quality
- Consistent naming conventions
- Component-based architecture

---

## 📞 Support

For issues or questions:
1. Check [FEATURES_IMPLEMENTATION.md](./FEATURES_IMPLEMENTATION.md) for implementation details
2. Review code comments
3. Check browser DevTools console
4. Verify environment variables

---

## 🎉 Status

✅ **Production Ready** - All features implemented and tested

**Last Updated**: March 2026

**Happy Coding! 🚀**
