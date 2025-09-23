### Super Admin Role and Invitation System — Implementation Guide

This document provides a step-by-step blueprint to add a Super Admin role and an email-based invitation system to the existing app. It is designed to minimize breaking changes and align with the current stack:

- Backend: Node.js/Express, Prisma ORM, JWT auth
- Frontend: Next.js (app router), Zustand stores (`client/src/store`), existing Admin/Agent areas, tailwindcss

Follow these steps in order. Use the embedded checklists to track progress.


### Goals

- **Super Admin** can do everything an Admin can do, plus:
  - **Invite** users by email and **assign roles** (Admin/Agent)
  - **Manage invitations** (view, resend, revoke)
  - **Change user roles**
- **Invitation flow** supports existing and new users with token validation, expiry handling, and auto-login after acceptance.


### High-Level Changes

- **Roles**: introduce `SUPER_ADMIN` in the role model and enforce it via middleware.
- **Database**: add `Invite` model and update `User` model for roles if needed.
- **Backend APIs**: create `/invites` endpoints for create/list/resend/revoke and `/invites/accept` to accept invites.
- **Email**: send invite links with a signed token containing email, role, and expiry.
- **Frontend**: add Super Admin dashboard actions (Invite User, Manage Invites) and an invite acceptance page handling registration/login flows.


---

### 1) Database Changes (Prisma)

Checklist:
- [ ] Add `SUPER_ADMIN` to roles
- [ ] Create `Invite` model

Proposed Prisma changes in `backend/prisma/schema.prisma`:

```prisma
// Add SUPER_ADMIN to Role enum (or create Role enum if not present)
enum UserRole {
  super_admin  
  admin
  agent
  customer
}

model Invite {
  id        String   @id @default(cuid())
  email     String
  role      Role
  token     String   @unique
  expiresAt DateTime
  status    InviteStatus @default(PENDING)
  createdAt DateTime @default(now())
  acceptedAt DateTime?

  // optional: index for lookups
  @@index([email])
}

enum InviteStatus {
  PENDING
  ACCEPTED
  REVOKED
  EXPIRED
}
```

---

### 2) Auth and Role Enforcement

Checklist:
- [ ] Update role constants/utilities
- [ ] Extend auth middleware to check `SUPER_ADMIN`
- [ ] Seed one Super Admin user

Files involved:
- `backend/middleware/auth.js`
- `backend/prisma/seed.js`

Changes:
- Add a role checker helper, e.g., `requireRole(["SUPER_ADMIN"])` and `requireRole(["SUPER_ADMIN", "ADMIN"])` where needed.
- Admin routes keep working with Admin; new Super Admin-only routes will be protected accordingly.

Seeding Super Admin (minimal):
```js
// backend/prisma/seed.js (add logic)
// Ensure a SUPER_ADMIN user exists
// Email/password can be environment-configured for security
```


---

### 3) Invitation Token Strategy

Checklist:
- [ ] Create a signed token that encodes email, role, and expiry
- [ ] Store the token server-side in `Invite`

Token options:
- **JWT** using existing JWT utilities (`backend/utils/generateToken.js`) or a new signing secret
- Include claims: `{ email, role, inviteId, exp }`
- Store random `token` (UUID) in DB and send the signed token in link; validate both: signature and that DB `Invite` exists and not expired/revoked

Invite Link format:
```
{FRONTEND_BASE_URL}/auth/invite/accept?token=SIGNED_TOKEN
```

Security notes:
- Enforce single-use by marking invite `ACCEPTED` or `REVOKED` and verifying status on accept.
- Invalidate on expiry.

---

### 4) Backend APIs

Checklist:
- [ ] Routes and validators
- [ ] Controllers and services
- [ ] Email send
- [ ] Auto-login on acceptance

New route file: `backend/routes/invite.js` (mounted at `/invites`)

Endpoints:
1. `POST /invites` — Create invite
   - Auth: `SUPER_ADMIN`
   - Body: `{ email: string, role: "ADMIN" | "AGENT", expiresInHours?: number }`
   - Flow:
     - Normalize email.
     - If an existing PENDING invite for the same email+role exists and not expired → optionally return conflict or allow reissue with revoke old.
     - Create `Invite` with token and expiry.
     - Send email with acceptance link.
     - Return invite summary.

2. `GET /invites` — List invites (with filters)
   - Auth: `SUPER_ADMIN`
   - Query: `status?`, `email?`, pagination

3. `POST /invites/:id/resend` — Resend invite
   - Auth: `SUPER_ADMIN`
   - If expired → renew expiry and new token (optional), update `EXPIRED` → `PENDING` (or create new invite)

4. `POST /invites/:id/revoke` — Revoke invite
   - Auth: `SUPER_ADMIN`
   - Set status `REVOKED`

5. `POST /invites/accept` — Accept invite
   - Public endpoint
   - Body: `{ token: string, name?: string, password?: string }`
   - Flow:
     - Verify signature and parse claims → `{ email, role, inviteId }`
     - Find `Invite` by `inviteId` or `token`. Validate: status PENDING, not expired.
     - Check if user exists by email.
       - If user exists: ensure they can login; assign role if not present. Mark invite ACCEPTED. Return auth token (JWT) if you want auto-login or instruct client to login (configurable). For this spec: return JWT.
       - If user does not exist: require `name` and `password`. Create user, assign role(s), mark invite ACCEPTED, and return JWT.

Validation:
- Add validators in `backend/validators` (e.g., `inviteValidators.js`) similar to existing style.

Controller layout (suggested):
- `backend/controllers/inviteController.js`
  - `createInvite`
  - `listInvites`
  - `resendInvite`
  - `revokeInvite`
  - `acceptInvite`

Email sending:
- If email provider is not configured, reuse current mailer (if any) or add a lightweight nodemailer transport using SMTP credentials from env.
- Template includes CTA link to the accept page.

Auto-login:
- Reuse `generateToken` to produce the same JWT the login flow uses, and set cookie/session as current app does.

Edge cases:
- Expired → return 410 Gone with hint to request resend
- Already accepted or revoked → 409 Conflict
- Invalid token/signature → 400 Bad Request


---

### 5) Role-Based Access Updates

Checklist:
- [ ] Protect new invite routes with `SUPER_ADMIN`
- [ ] Allow Super Admin to manage roles from user management screens

Changes:
- Update `backend/routes/admin.js` or `backend/controllers/adminController.js` to expose role-change API restricted to `SUPER_ADMIN` (e.g., `PATCH /users/:id/role`).
- Ensure existing Admin capabilities remain intact.


---

### 6) Frontend Updates (Next.js)
Checklist:
- [ ] Add Super Admin UI: Invite button and Invite Management page
- [ ] Add Invite Accept page under `auth`
- [ ] Integrate API calls in `client/src/lib/api.js`
- [ ] Update Navbar/Sidebar visibility for Super Admin controls

File additions:
- Add UI to change user roles directly from `users/[id]/page.js` for Super Admins

- `client/src/app/(admin)/admin/invitations/page.js` — list invites, actions (resend, revoke), and an Invite button
- `client/src/app/(admin)/admin/invitations/create.jsx` — modal/form for email + role
- `client/src/app/auth/invite/accept/page.js` — reads `token` from search params; renders:
  - If token valid and user exists → prompt login (or auto-login if backend returns JWT)
  - If token valid and user not found → registration form (name, password)(name it onboarding form), submit to `/invites/accept`

Navigation/Access:
- Show Super Admin-only items in `client/src/components/Sidebar.jsx` and/or `Navbar.jsx` when `auth.user.roles` contains `SUPER_ADMIN`.

State and API:
- In `client/src/lib/api.js`, add:
  - `createInvite(body)` → `POST /invites`
  - `listInvites(params)` → `GET /invites`
  - `resendInvite(id)` → `POST /invites/:id/resend`
  - `revokeInvite(id)` → `POST /invites/:id/revoke`
  - `acceptInvite(body)` → `POST /invites/accept`
- In `client/src/store/auth.js`, extend to handle auto-login from invite acceptance (store token/cookie similarly to login)

UX details:
- Invite form: email input + role select (Admin/Agent), optional expiry
- Pending list with badges: Pending/Accepted/Revoked/Expired
- Row actions: Resend, Revoke
- Accept page handles error states: invalid/expired/already-accepted; offer Resend link (which opens a request to Super Admin or instructs to contact)


---

### 7) Validators and Middleware

Checklist:
- [ ] Add `inviteValidators.js` for request body validation
- [ ] Reuse `middleware/validation.js` to attach validators to routes
- [ ] Extend `middleware/auth.js` with `requireRole(["SUPER_ADMIN"])`

Validator examples:
- Create Invite: require valid email and role in {ADMIN, AGENT}
- Accept Invite: require `token`; if user does not exist, require `name` and `password` (strong password rules consistent with existing auth validators)


---

### 8) Email Content

Checklist:
- [ ] Add invite email template with variables: recipient email, role, accept URL, expiry
- [ ] Configure transport (SMTP or provider)

Template snippet:
```html
<p>You have been invited to join Resolvet as <strong>{{role}}</strong>.</p>
<p>This invitation expires on {{expiry}}.</p>
<p><a href="{{acceptUrl}}">Accept your invitation</a></p>
```


---

### 9) Error Handling and Edge Cases

Implement consistent responses using `utils/apiError.js` and `utils/apiResponse.js`.

Cases to cover:
- Invalid/forged token → 400
- Invite not found → 404
- Expired invite → 410 and set status to `EXPIRED`
- Already accepted/revoked → 409
- Email already used by active user when creating invite → 409 (optional) or allow if role assignment is the goal

Resend behavior:
- If expired, either create a new invite or renew expiry and rotate token.


---

### 10) Seeding and Backfill

Checklist:
- [ ] Seed one Super Admin
- [ ] Optionally backfill existing Admins/Agents into `roles` array if migrating from single role

Environment:
- Add `SUPER_ADMIN_SEED_EMAIL` and `SUPER_ADMIN_SEED_PASSWORD` to `.env`


---

### 11) Security Considerations

- Keep invite validity short (e.g., 48–72 hours)
- Rotate and validate tokens server-side; mark invites single-use
- Do not leak whether an email exists beyond necessary flows
- Ensure password complexity and hashing are identical to existing auth
- Require HTTPS links in production


---

### 12) Rollout Plan

Checklist:
- [ ] Feature flag the Super Admin UI components initially
- [ ] Deploy DB migration
- [ ] Deploy backend routes
- [ ] Seed Super Admin
- [ ] Enable UI and test end-to-end

Testing scenarios:
- Super Admin invites a new Admin → Accept → Register → Auto-login → Access Admin pages
- Super Admin invites an existing Agent email → Accept while logged out → Login prompt → Role assigned
- Expired invite → Accept shows expired UI → Resend works
- Revoked invite → 409


---

### 13) Minimal Code Touch Points (for low-risk integration)

- Backend
  - `prisma/schema.prisma`: add `Role` enum values, `Invite` model
  - `controllers/inviteController.js`: new
  - `routes/invite.js`: new; mount in `server.js` alongside others
  - `middleware/auth.js`: add `requireRole`
  - `validators/inviteValidators.js`: new
  - `utils/generateToken.js`: optionally add `generateInviteToken`
  - `prisma/seed.js`: ensure Super Admin

- Frontend
  - `src/lib/api.js`: new API methods
  - `src/components/Sidebar.jsx` and/or `Navbar.jsx`: Super Admin-only entries
  - `src/app/(admin)/admin/invitations/page.js`: manage invites UI
  - `src/app/(admin)/admin/invitations/create.jsx`: invite form modal
  - `src/app/auth/invite/accept/page.js`: accept flow UI
  - `src/store/auth.js`: handle auto-login from invite acceptance


---

### 14) API Contracts (Request/Response)

1) Create Invite
```http
POST /invites
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{
  "email": "user@example.com",
  "role": "ADMIN",
  "expiresInHours": 72
}
```
Response
```json
{
  "success": true,
  "data": {
    "id": "inv_...",
    "email": "user@example.com",
    "role": "ADMIN",
    "status": "PENDING",
    "expiresAt": "2025-09-30T12:00:00.000Z"
  }
}
```

2) List Invites
```http
GET /invites?status=PENDING&page=1&pageSize=20
Authorization: Bearer <admin-jwt>
```

3) Resend Invite
```http
POST /invites/:id/resend
Authorization: Bearer <admin-jwt>
```

4) Revoke Invite
```http
POST /invites/:id/revoke
Authorization: Bearer <admin-jwt>
```

5) Accept Invite
```http
POST /invites/accept
Content-Type: application/json

{
  "token": "<signed-token>",
  "name": "Jane Doe",
  "password": "StrongP@ssw0rd"
}
```
Response (auto-login)
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "user@example.com", "roles": ["ADMIN"] },
    "token": "<jwt>"
  }
}
```


---

### 15) UI States and Copies

- Invite Management
  - Empty state: “No invites yet. Send your first invite.”
  - Pending row: badge + resend/revoke buttons
  - Accepted row: show `acceptedAt`
  - Revoked/Expired: disabled actions; tooltip with reason

- Accept Page
  - Valid token + new user: registration(onboarding) form with role notice (“You’re joining as Admin/Agent”)
  - Valid token + existing user: show prompt to login; if backend returns JWT, redirect based on role
  - Expired: show “Invitation expired.” with a hint to contact admin
  - Invalid: show “Invalid invitation link.”


---

### 16) Redirect Rules After Login/Acceptance

- If roles contain `SUPER_ADMIN` → `/admin` super admin dashboard
- If roles contain `ADMIN` → `/admin`
- If roles contain `AGENT` → `/agent`


---

### 17) Future Enhancements (Optional)

- Add invite notes and audit logs (who invited, message)
- Allow custom email messages per invite
- Bulk invites via CSV upload


---

### Implementation Order (Quick Reference)

1. Prisma models/migration (`Role.SUPER_ADMIN`, `Invite`)
2. Seed Super Admin
3. Auth middleware: `requireRole(["SUPER_ADMIN"])`
4. Backend invite routes/controllers/validators + email send + accept
5. Frontend API wrappers and UI pages (manage + accept)
6. Edge cases and tests; rollout and verify
