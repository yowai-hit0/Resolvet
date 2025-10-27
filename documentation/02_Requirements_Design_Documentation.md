# Resolvet - Requirements and Design Documentation

## 1. Overview

This document outlines the requirements and design specifications for the Resolvet support ticket management system.

## 2. High-Level Goals and Objectives

### Business Goals

1. **Centralize Support Operations**
   - Provide a single platform for all customer support tickets
   - Eliminate email-based ticket tracking
   - Improve response times and customer satisfaction

2. **Enable Team Collaboration**
   - Allow multiple agents to collaborate on tickets
   - Support internal communication via notes
   - Track all ticket activities and changes

3. **Measure Performance**
   - Monitor agent productivity
   - Track ticket resolution times
   - Generate analytics and reports

4. **Scale Operations**
   - Support growing team sizes
   - Handle increasing ticket volumes
   - Maintain system performance

### Technical Objectives

1. **Reliability**
   - Data persistence and backup
   - Error handling and recovery

2. **Security**
   - Secure authentication (JWT)
   - Role-based access control
   - Data encryption in transit

3. **Performance**
   - Sub-second response times
   - Efficient database queries
   - Optimized file handling

4. **Usability**
   - Intuitive user interface
   - Mobile-responsive design
   - Accessibility compliance

## 3. Functional Requirements

### 3.1 Authentication and Authorization

#### FR-AUTH-01: User Registration
- **Description:** Users can register with email and password
- **Priority:** Medium
- **Acceptance Criteria:**
  - Email validation
  - Password complexity requirements
  - Duplicate email prevention
  - Auto-login after registration

#### FR-AUTH-02: User Login
- **Description:** Users can login with credentials
- **Priority:** High
- **Acceptance Criteria:**
  - Secure password verification
  - JWT token generation
  - Token expiration handling
  - Session management

#### FR-AUTH-03: Role-Based Access
- **Description:** System enforces role-based permissions
- **Priority:** High
- **Roles:**
  - Super Admin: Full system access
  - Admin: Ticket and user management
  - Agent: Assigned ticket management
  - Customer: Own tickets only (Phase 2)
- **Acceptance Criteria:**
  - Middleware enforces role restrictions
  - UI elements visible based on role
  - API endpoints protected by role

#### FR-AUTH-04: Invitation System
- **Description:** Super Admins can invite users via email
- **Priority:** High
- **Acceptance Criteria:**
  - Generate unique invitation tokens
  - Send invitation emails
  - Token expiration (72 hours)
  - Role assignment via invitation
  - Accept/reject invitation flow
  - Invitation status tracking

### 3.2 Ticket Management

#### FR-TICKET-01: Create Ticket
- **Description:** Users can create support tickets
- **Priority:** High
- **Fields:**
  - Subject (required)
  - Description (required)
  - Requester information (name, email, phone)
  - Location (optional)
  - Priority
  - Tags
  - Attachments
- **Acceptance Criteria:**
  - Unique ticket code generation
  - File upload support (images, audio, video)
  - Tag assignment
  - Ticket event logging

#### FR-TICKET-02: View Tickets
- **Description:** Users can view ticket lists and details
- **Priority:** High
- **Acceptance Criteria:**
  - Role-based filtering
  - Pagination support
  - Search functionality
  - Sort by date, status, priority
  - Ticket detail view with full history

#### FR-TICKET-03: Update Ticket
- **Description:** Agents and Admins can update tickets
- **Priority:** High
- **Updatable Fields:**
  - Status
  - Priority
  - Assignee
  - Subject
  - Description
  - Tags
  - Attachments
- **Acceptance Criteria:**
  - Status transition validation
  - Event logging for changes
  - Permission checking
  - Timestamp updates

#### FR-TICKET-04: Ticket Assignment
- **Description:** Assign tickets to agents
- **Priority:** High
- **Acceptance Criteria:**
  - Only admins can assign to others
  - Agents can self-assign from available pool
  - Assignment history tracking
  - Bulk assignment support

### 3.3 Communication

#### FR-COMM-01: Add Comments
- **Description:** Users can add comments to tickets
- **Priority:** High
- **Acceptance Criteria:**
  - Public and internal comments
  - Rich text support
  - File attachments
  - Timestamp and author tracking
  - Comment notifications (future)

#### FR-COMM-02: Internal Notes
- **Description:** Staff can add internal-only notes
- **Priority:** Medium
- **Acceptance Criteria:**
  - Only agents/admins can create internal notes
  - Customers cannot view internal notes
  - Marked distinctly in UI
  - Tracked in event history

### 3.4 File Management

#### FR-FILE-01: Upload Attachments
- **Description:** Support ticket file attachments
- **Priority:** High
- **File Types:**
  - Images: JPG, PNG, GIF, WebP
  - Audio: OGG, MP3, WAV, M4A
  - Video: MP4, AVI, MOV, WebM
- **Acceptance Criteria:**
  - Upload to Cloudinary
  - File size validation (10MB limit)
  - MIME type verification
  - Attachment metadata storage
  - Multiple file upload support

#### FR-FILE-02: View Attachments
- **Description:** View and download attachments
- **Priority:** High
- **Acceptance Criteria:**
  - Display file type icons
  - Preview images
  - Download functionality
  - Security: Access control based on ticket permissions

### 3.5 Tagging and Organization

#### FR-TAG-01: Create Tags
- **Description:** Admins can create tags
- **Priority:** Medium
- **Acceptance Criteria:**
  - Unique tag names
  - Tag search and filtering
  - Tag color coding (future)

#### FR-TAG-02: Assign Tags
- **Description:** Tags can be assigned to tickets
- **Priority:** Medium
- **Acceptance Criteria:**
  - Multiple tags per ticket
  - Search by tags
  - Tag-based filtering

### 3.6 Analytics and Reporting

#### FR-ANALYTICS-01: Admin Dashboard
- **Description:** Dashboard with system-wide metrics
- **Priority:** High
- **Metrics:**
  - Total tickets by status
  - Tickets created per day
  - Agent performance
  - Average resolution time
- **Acceptance Criteria:**
  - Real-time data
  - Visual charts
  - Export capability (future)

#### FR-ANALYTICS-02: Agent Performance
- **Description:** Track agent statistics
- **Priority:** Medium
- **Metrics:**
  - Tickets assigned
  - Tickets resolved
  - Average resolution time
  - Activity rate
- **Acceptance Criteria:**
  - Role-based visibility
  - Time-based filters

#### FR-ANALYTICS-03: Ticket Statistics
- **Description:** Statistics by status and priority
- **Priority:** Medium
- **Acceptance Criteria:**
  - Count by status
  - Count by priority
  - Recent activity trends
  - Export to CSV (future)

### 3.7 User Management

#### FR-USER-01: List Users
- **Description:** View all system users
- **Priority:** Medium
- **Acceptance Criteria:**
  - Pagination
  - Filter by role
  - Search by name/email
  - Admin only

#### FR-USER-02: User Status Management
- **Description:** Activate/deactivate users
- **Priority:** Medium
- **Acceptance Criteria:**
  - Soft delete (is_active flag)
  - Prevent login for inactive users
  - Audit logging

#### FR-USER-03: Role Management
- **Description:** Change user roles
- **Priority:** High
- **Acceptance Criteria:**
  - Only Super Admin can change roles
  - Immediate access update
  - Event logging

## 4. System Architecture

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                       Client (Browser)                   │
│                    Next.js + React + Zustand             │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST
                     │ JWT Authentication
┌────────────────────▼────────────────────────────────────┐
│                   API Server (Express)                   │
│                  /api/v1/*                               │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ Auth     │ Tickets  │ Admin   │  Agent   │          │
│  │ Users    │ Tags     │ Invites  │          │          │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┘          │
│       │          │          │          │                │
│       └──────────┴──────────┴──────────┘                │
│                    Middleware Layer                      │
│          (Auth, Validation, Error Handling)              │
└────────────────────┬────────────────────────────────────┘
                     │ Prisma ORM
┌────────────────────▼────────────────────────────────────┐
│                   PostgreSQL Database                    │
│  users | tickets | comments | attachments | events      │
└──────────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    Cloudinary                            │
│              (File Storage Service)                       │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Technology Stack

**Backend:**
- Runtime: Node.js 18+
- Framework: Express.js 4.21
- ORM: Prisma 6.16
- Database: PostgreSQL
- Authentication: JWT (jsonwebtoken)
- File Storage: Cloudinary
- Validation: Joi
- Security: Helmet, bcryptjs

**Frontend:**
- Framework: Next.js 15
- UI Library: React 19
- State Management: Zustand
- HTTP Client: Axios
- Styling: TailwindCSS
- Charts: Recharts

**Development:**
- Package Manager: npm
- API Documentation: OpenAPI 3.0 / Swagger
- Development Tools: Nodemon
- Environment: dotenv

### 4.3 Database Schema

**Core Models:**

1. **User**
   - Email, password_hash, name, role
   - Relationships: created tickets, assigned tickets, comments, attachments

2. **Ticket**
   - Code, subject, description, status, priority
   - Requester info (email, name, phone, location)
   - Timestamps (created, updated, resolved, closed)
   - Relationships: assignee, creator, comments, attachments, tags, events

3. **Comment**
   - Content, is_internal flag
   - Relationships: ticket, author

4. **Attachment**
   - Filenames, MIME type, size, Cloudinary URL
   - Relationships: ticket, uploader

5. **Tag**
   - Name
   - Relationships: tickets (many-to-many)

6. **TicketPriority**
   - Name
   - Relationships: tickets

7. **TicketEvent**
   - Change type, old/new values
   - Relationships: ticket, user

8. **Invite**
   - Email, role, token, status, expiry
   - Relationships: none

### 4.4 Component Design

**Backend Components:**

```
controllers/
├── authController.js      # Login, register, profile
├── userController.js      # User CRUD operations
├── ticketController.js    # Ticket management
├── adminController.js     # Admin dashboard, analytics
├── agentController.js     # Agent dashboard
├── tagController.js      # Tag management
└── inviteController.js    # Invitation system

routes/
├── auth.js              # Authentication routes
├── user.js              # User management routes
├── ticket.js            # Ticket routes
├── admin.js             # Admin routes
├── agent.js             # Agent routes
├── tag.js               # Tag routes
└── invite.js            # Invitation routes

middleware/
├── auth.js              # JWT verification
├── errorHandler.js      # Error handling
├── validation.js        # Request validation
└── uploadImage.js       # File upload handling

utils/
├── apiError.js          # Error response formatting
├── apiResponse.js       # Success response formatting
├── generateToken.js     # JWT generation
└── mailer.js            # Email sending
```

**Frontend Components:**

```
app/
├── (admin)/admin/       # Admin pages
│   ├── page.js         # Admin dashboard
│   ├── tickets/        # Ticket management
│   ├── users/          # User management
│   ├── analytics/      # Analytics dashboard
│   ├── tags/           # Tag management
│   └── invitations/    # Invitation management
├── (agent)/agent/       # Agent pages
│   ├── page.js         # Agent dashboard
│   └── tickets/        # Assigned tickets
├── auth/
│   ├── invite/accept/  # Accept invitation
│   ├── login/          # Login page
│   └── register/       # Registration
└── page.js              # Landing/home page

components/
├── Navbar.jsx           # Navigation bar
├── Sidebar.jsx          # Side navigation
├── Toaster.jsx          # Toast notifications
├── CommandPalette.jsx   # Command interface
├── Loader.jsx           # Loading indicator
└── Attachments.jsx      # File display

store/
├── auth.js              # Authentication state
└── ui.js                # UI state (toasts, modals)
```

## 5. Interface Design

### 5.1 API Design Principles

**RESTful API:**
- Standard HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Resource-based URLs
- JSON request/response format
- Consistent error handling
- Pagination for list endpoints

**Response Format:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Format:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "errors": [ ... ]
}
```

### 5.2 User Interface Design Principles

- **Responsive Design:** Mobile-first approach
- **Accessibility:** WCAG 2.1 compliance
- **Consistency:** Standardized components and patterns
- **Performance:** Lazy loading, code splitting
- **Feedback:** Loading states, error messages, success confirmations

## 6. Acceptance Criteria

### Overall System Acceptance

1. **Functional Completeness**
   - ✅ All core tickets features working
   - ✅ Authentication and authorization operational
   - ✅ File uploads functional
   - ✅ Analytics displaying accurate data

2. **Performance**
   - ✅ API response time < 500ms
   - ✅ Page load time < 2s
   - ✅ File upload < 10s (for 1MB files)

3. **Security**
   - ✅ JWT authentication working
   - ✅ Role-based access enforced
   - ✅ Input validation on all endpoints
   - ✅ Password hashing with bcrypt

4. **Usability**
   - ✅ Intuitive navigation
   - ✅ Clear error messages
   - ✅ Responsive design working

## 7. Design Patterns

### Backend Patterns

1. **MVC Architecture**
   - Models: Prisma schema
   - Views: JSON responses
   - Controllers: Request handling

2. **Middleware Pattern**
   - Authentication middleware
   - Error handling middleware
   - Validation middleware

3. **Repository Pattern**
   - Prisma client abstraction
   - Database operation encapsulation

### Frontend Patterns

1. **Component-Based Architecture**
   - Reusable React components
   - Props drilling minimized with Zustand

2. **State Management**
   - Zustand for global state
   - Local state for component-specific data

3. **API Client Pattern**
   - Centralized API calls
   - Interceptors for auth and errors

## 8. Integration Points

### External Services

1. **Cloudinary**
   - Image/audio/video storage
   - CDN delivery
   - Image transformations

2. **Email Service (SMTP)**
   - Invitation emails
   - Notification emails (future)

### Internal Integrations

1. **Database Layer**
   - Prisma ORM
   - PostgreSQL connection pooling
   - Transaction support

2. **Authentication Layer**
   - JWT token generation/validation
   - Session management
   - Role-based access control

## 9. Scalability Considerations

### Current Architecture Supports

- Multiple concurrent users
- Horizontal scaling (stateless API)
- Database connection pooling
- Caching strategies (future)

### Future Enhancements

- Redis for session storage
- Message queue for async tasks
- CDN for static assets
- Load balancing

## 10. Testing Strategy

### Manual Testing

- ✅ User flows (login, create ticket, update status)
- ✅ Role-based access verification
- ✅ File upload functionality
- ✅ Dashboard analytics

### Automated Testing (Future)

- Unit tests for controllers
- Integration tests for API endpoints
- E2E tests for critical user flows
- Load testing for performance

## 11. Security Requirements

### Authentication Security

- Password hashing with bcrypt (12 rounds)
- JWT tokens with expiration
- Secure HTTP headers (Helmet)
- CORS configuration

### Authorization Security

- Role-based access control (RBAC)
- Endpoint-level authorization
- Data-level access restrictions
- Audit logging

### Data Security

- Input validation and sanitization
- SQL injection prevention (Prisma)
- XSS prevention
- Secure file uploads

## 12. Compliance and Standards

### Code Standards

- ESLint configuration
- Consistent code formatting
- Error handling patterns
- Documentation requirements

### API Standards

- OpenAPI 3.0 specification
- RESTful conventions
- HTTP status codes
- Error response format

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Active

