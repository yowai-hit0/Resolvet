# Resolvet - Technical Documentation

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Getting Started](#2-getting-started)
3. [API Documentation](#3-api-documentation)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Code Documentation](#6-code-documentation)
7. [Deployment Guide](#7-deployment-guide)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. System Architecture

### 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Presentation Layer                    │
│                    Next.js 15 (React 19)                       │
│                  - Server-Side Rendering                       │
│                  - Client-Side Navigation                     │
│                  - State Management (Zustand)                │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP/REST + JWT
┌───────────────────────────▼──────────────────────────────────┐
│                      Application Layer                         │
│                   Express.js 4.21                             │
│                  - Route Handling                             │
│                  - Middleware Processing                       │
│                  - Request Validation                          │
│                  - Response Formatting                         │
└────────────┬────────────┬────────────┬────────────┬─────────┘
             │            │            │            │
    ┌────────▼──┐  ┌──────▼──┐  ┌──────▼──┐  ┌──────▼──┐
    │  Auth     │  │ Tickets │  │  Users  │  │  Admin  │
    │Controller │  │Controller│  │Controller│  │Controller│
    └────┬──────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
         │             │             │             │
         └─────────────┴─────────────┴─────────────┘
                        Prisma ORM
┌───────────────────────▼───────────────────────────────────────┐
│                       Data Layer                               │
│                   PostgreSQL Database                          │
│             - Users, Tickets, Comments,                       │
│               Attachments, Tags, Events, Invites              │
└────────────────────────────┬──────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                     External Services                           │
│                   Cloudinary (File Storage)                    │
│                   SMTP (Email Service)                          │
└───────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

#### Backend Stack

```javascript
{
  "runtime": "Node.js 18+",
  "framework": "Express.js 4.21",
  "orm": "Prisma 6.16",
  "database": "PostgreSQL",
  "authentication": "JWT (jsonwebtoken)",
  "fileStorage": "Cloudinary",
  "validation": "Joi 18",
  "security": "Helmet, bcryptjs 12 rounds",
  "utilities": ["compression", "cors", "morgan"]
}
```

#### Frontend Stack

```javascript
{
  "framework": "Next.js 15.5.3",
  "ui": "React 19.1.0",
  "state": "Zustand 4.5",
  "http": "Axios 1.7",
  "styling": "TailwindCSS 4",
  "charts": "Recharts 2.12",
  "progress": "nprogress"
}
```

### 1.3 Directory Structure

```
backend/
├── config/
│   ├── database.js          # Prisma client initialization
│   └── cloudinary.js         # Cloudinary configuration
├── controllers/
│   ├── adminController.js    # Admin operations
│   ├── agentController.js    # Agent operations
│   ├── authController.js     # Authentication
│   ├── ticketController.js   # Ticket management
│   ├── userController.js     # User management
│   ├── tagController.js      # Tag management
│   └── inviteController.js   # Invitation system
├── middleware/
│   ├── auth.js               # JWT authentication
│   ├── errorHandler.js       # Error handling
│   ├── asyncHandler.js       # Async wrapper
│   ├── validation.js         # Request validation
│   └── uploadImage.js        # File upload handler
├── routes/
│   ├── admin.js              # Admin routes
│   ├── agent.js              # Agent routes
│   ├── auth.js               # Auth routes
│   ├── ticket.js             # Ticket routes
│   ├── user.js               # User routes
│   ├── tag.js                # Tag routes
│   └── invite.js             # Invitation routes
├── utils/
│   ├── apiError.js           # Error formatting
│   ├── apiResponse.js        # Success response formatting
│   ├── generateToken.js      # JWT generation
│   └── mailer.js             # Email utility
├── validators/
│   ├── adminValidators.js
│   ├── agentValidators.js
│   ├── authValidators.js
│   ├── ticketValidators.js
│   └── userValidators.js
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # Migration files
│   └── seed-csv.js           # CSV import seed
├── server.js                  # Application entry point
└── package.json
```

## 3. API Documentation

### 3.1 Base URL

Development: `http://localhost:3001/api/v1`  
Production: `https://your-domain.com/api/v1`

### 3.2 Authentication

All protected endpoints require JWT authentication:

```
Authorization: Bearer <token>
```

### 3.3 Endpoints Overview

#### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | User login | No |
| GET | `/auth/profile` | Get current user profile | Yes |

#### Ticket Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/tickets` | List tickets (paginated) | All |
| GET | `/tickets/:id` | Get ticket details | All* |
| POST | `/tickets` | Create new ticket | Admin, Agent |
| PUT | `/tickets/:id` | Update ticket | Admin, Agent |
| POST | `/tickets/:id/comments` | Add comment | Admin, Agent |
| GET | `/tickets/stats` | Get ticket statistics | All |
| POST | `/tickets/upload-temp` | Upload temporary files | All |

*Access based on ticket ownership

#### Admin Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/admin/dashboard` | Admin dashboard | Admin |
| POST | `/admin/tickets/bulk-assign` | Bulk assign tickets | Admin |
| POST | `/admin/tickets/bulk-status` | Bulk update status | Admin |
| GET | `/admin/analytics/system` | System analytics | Admin |
| GET | `/admin/analytics/agent-performance` | Agent performance | Admin |

#### Agent Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/agent/dashboard` | Agent dashboard | Agent |
| GET | `/agent/tickets` | Assigned tickets | Agent |
| PATCH | `/agent/tickets/:id/status` | Update ticket status | Agent |
| PATCH | `/agent/tickets/:id/priority` | Update priority | Agent |
| GET | `/agent/performance` | Personal performance | Agent |

#### User Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/users` | List all users | Admin |
| GET | `/users/:id` | Get user details | Admin |
| PUT | `/users/:id` | Update user | Admin, Self |
| PATCH | `/users/:id/status` | Activate/deactivate | Admin |
| GET | `/users/me` | Current user info | All |

#### Tag Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/tags` | List all tags | All |
| POST | `/tags` | Create tag | Admin |
| PUT | `/tags/:id` | Update tag | Admin |
| DELETE | `/tags/:id` | Delete tag | Admin |

#### Invitation Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/invites` | Create invitation | Super Admin |
| GET | `/invites` | List invitations | Super Admin |
| POST | `/invites/:id/resend` | Resend invitation | Super Admin |
| POST | `/invites/:id/revoke` | Revoke invitation | Super Admin |
| POST | `/invites/accept` | Accept invitation | Public |

### 3.4 Example API Calls

#### Register New User

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "first_name": "John",
    "last_name": "Doe",
    "role": "customer"
  }'
```

#### Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

#### Create Ticket

```bash
curl -X POST http://localhost:3001/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "subject": "Login issue",
    "description": "Unable to login to the system",
    "requester_email": "customer@example.com",
    "requester_name": "Jane Customer",
    "requester_phone": "+250788123456",
    "location": "Kigali",
    "priority_id": 2
  }'
```

#### Update Ticket Status

```bash
curl -X PATCH http://localhost:3001/api/v1/agent/tickets/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <agent-token>" \
  -d '{
    "status": "In_Progress"
  }'
```

### 3.5 API Response Format

#### Success Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

#### Paginated Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tickets retrieved successfully",
  "data": {
    "tickets": [...]
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50,
    "hasNext": true,
    "hasPrev": false,
    "limit": 10
  }
}
```

#### Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid request",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### 3.6 OpenAPI Documentation

API documentation is auto-generated using express-oas-generator:

- Swagger UI: `http://localhost:3001/api-docs`
- ReDoc UI: `http://localhost:3001/redoc`
- OpenAPI Spec: `http://localhost:3001/openapi.json`

## 4. Database Schema

### 4.1 Entity Relationship Diagram

```
User ──┬──> Ticket (created_by)
       │
       ├──> Ticket (assignee)
       │
       ├──> Comment
       │
       ├──> Attachment
       │
       └──> TicketEvent

Ticket ──┬──> Comment
          │
          ├──> Attachment
          │
          ├──> TicketTag ──> Tag
          │
          ├──> TicketEvent
          │
          └──> TicketPriority

Invite (standalone)
```

### 4.2 Schema Documentation

#### User Model

```prisma
model User {
  id            Int        @id @default(autoincrement())
  email         String     @unique
  password_hash String
  first_name    String
  last_name     String
  role          UserRole
  is_active     Boolean    @default(true)
  created_at    DateTime   @default(now())
  updated_at    DateTime   @updatedAt
  
  // Relations
  tickets_created Ticket[]     @relation("TicketCreatedBy")
  tickets_assigned Ticket[]     @relation("TicketAssignedTo")
  comments         Comment[]
  ticket_events    TicketEvent[]
  attachments      Attachment[]
}
```

**User Roles:**
- `super_admin`: Full system access
- `admin`: Ticket and user management
- `agent`: Assigned ticket management
- `customer`: Own tickets (Phase 2)

#### Ticket Model

```prisma
model Ticket {
  id              Int          @id @default(autoincrement())
  ticket_code     String       @unique
  subject         String
  description     String
  requester_email String?
  requester_name  String?
  requester_phone String
  location        String?
  status          TicketStatus @default(New)
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt
  resolved_at     DateTime?
  closed_at       DateTime?
  
  // Foreign Keys
  created_by_id   Int
  assignee_id     Int?
  priority_id     Int
  
  // Relations
  created_by      User         @relation("TicketCreatedBy")
  assignee        User?        @relation("TicketAssignedTo")
  priority        TicketPriority
  comments        Comment[]
  ticket_events   TicketEvent[]
  attachments     Attachment[]
  tags            TicketTag[]
}
```

**Ticket Statuses:**
- New
- Assigned
- In_Progress
- On_Hold
- Resolved
- Closed
- Reopened

#### Other Models

**Comment:** Ticket comments with internal/public flag
**Attachment:** File uploads linked to tickets
**Tag:** Categorization labels
**TicketPriority:** Priority levels
**TicketEvent:** Audit log for ticket changes
**Invite:** Email invitation tokens

### 4.3 Database Migrations

Prisma generates migrations based on schema changes:

```bash
# Create new migration
npx prisma migrate dev --name description_of_change

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## 5. Authentication & Authorization

### 5.1 JWT Authentication Flow

```
1. User submits credentials
2. Server validates credentials
3. Generate JWT token (24h expiry)
4. Return token to client
5. Client stores token (localStorage)
6. Client includes token in subsequent requests
7. Server validates token on protected routes
```

### 5.2 Token Structure

```javascript
{
  userId: 1,
  role: "admin",
  iat: 1234567890,
  exp: 1234574490  // 24 hours
}
```

### 5.3 Role-Based Access Control

#### Middleware Implementation

```javascript
// middleware/auth.js
export const authenticate = asyncHandler(async (req, res, next) => {
  // Verify JWT token
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.userId);
  next();
});

export const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Access denied'));
    }
    next();
  };
};
```

#### Role Permissions Matrix

| Feature | Super Admin | Admin | Agent | Customer |
|---------|-------------|-------|-------|----------|
| View all tickets | ✅ | ✅ | Assigned only | Own only |
| Create tickets | ✅ | ✅ | ✅ | Phase 2 |
| Update tickets | ✅ | ✅ | Assigned only | Phase 2 |
| Assign tickets | ✅ | ✅ | No | No |
| Manage users | ✅ | View only | No | No |
| Create invitations | ✅ | No | No | No |
| View analytics | ✅ | ✅ | Personal only | No |
| Manage tags | ✅ | ✅ | No | No |

### 5.4 Password Security

- Hashing: bcryptjs (12 rounds)
- Storage: password_hash field
- Verification: `bcrypt.compare()`
- Minimum length: 6 characters (recommended: 8+)

## 7. Deployment Guide

### 7.1 Production Checklist

- [ ] Update environment variables
- [ ] Set secure JWT_SECRET
- [ ] Configure production database
- [ ] Set up Cloudinary credentials
- [ ] Configure SMTP for emails
- [ ] Build frontend
- [ ] Run database migrations
- [ ] Set up process manager (PM2)
- [ ] Configure reverse proxy (nginx)
- [ ] Enable HTTPS/SSL
- [ ] Set up monitoring

### 7.2 Backend Deployment

```bash
# Install production dependencies
npm install --production

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build and start
npm start
```

### 7.3 Frontend Deployment

```bash
# Build Next.js application
npm run build

# Start production server
npm start

# Or deploy to Vercel
vercel deploy --prod
```

### 7.4 Docker Deployment (Future)

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "server.js"]
```

## 8. Troubleshooting

### 8.1 Common Issues

#### Database Connection Error

**Error:** `Can't reach database server`

**Solution:**
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Verify DATABASE_URL in .env
# Ensure credentials are correct
```

#### JWT Verification Failed

**Error:** `Invalid token`

**Solution:**
- Check JWT_SECRET in .env matches
- Verify token expiration
- Ensure token format: `Bearer <token>`

#### File Upload Fails

**Error:** `Upload failed to Cloudinary`

**Solution:**
- Verify Cloudinary credentials
- Check file size limits (10MB)
- Validate file types
- Check network connectivity

#### CORS Error

**Error:** `CORS policy blocked`

**Solution:**
```javascript
// Update CORS configuration in server.js
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true
}));
```

### 8.2 Development Tools

#### Prisma Studio

```bash
npx prisma studio
# Opens at http://localhost:5555
```

#### API Documentation

```bash
# Backend running on port 3001
# Visit: http://localhost:3001/api-docs
```

#### Health Check

```bash
curl http://localhost:3001/api/v1/health
```

### 8.3 Logs and Debugging

```bash
# Backend logs
npm run dev

# Database query logs
# Set in Prisma schema:
# datasource db {
#   provider = "postgresql"
#   url = env("DATABASE_URL")
#   logging = true  // Enable query logging
# }
```

### 8.4 Performance Optimization

1. **Database Indexing**
   - Index frequently queried fields
   - Add indexes in Prisma schema

2. **Pagination**
   - Always use pagination for list endpoints
   - Limit page size (default: 10)

3. **File Compression**
   - Already enabled via `compression` middleware
   - Cloudinary handles image optimization

4. **Caching** (Future)
   - Redis for session storage
   - Cache frequent queries
   - CDN for static assets

---

## 9. Additional Resources

- Prisma Docs: https://www.prisma.io/docs/
- Express.js Docs: https://expressjs.com/
- Next.js Docs: https://nextjs.org/docs/
- JWT Best Practices: https://datatracker.ietf.org/doc/html/rfc7519
- Cloudinary Docs: https://cloudinary.com/documentation

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Maintained By:** Resolvet Development Team

