# School Discipline Management System (SDMS) — Full Overview

**School:** Ecole des Sciences Byimana
**Author:** Kwizera Elissa
**Live app:** https://kwizeraelissa.lovable.app

---

## 1. Introduction

The School Discipline Management System (SDMS) is a secure, web-based platform built for **Ecole des Sciences Byimana** to centralize everything related to student discipline and daily school operations:

- Student records and classes
- Incident reporting and mark deductions
- Time-bound permissions (late entry, leave, etc.)
- School-wide events calendar
- Real-time internal chat
- Analytics and audit reporting
- A role-aware AI Assistant that can take actions inside the app on the user's behalf

The app is mobile-responsive (PWA-ready) so staff can use it on phones as well as computers.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS, shadcn/ui components |
| Backend | Lovable Cloud (Postgres + Auth + Storage + Edge Functions + Realtime) |
| Security | Row-Level Security (RLS) on every table, JWT auth, role checks via SECURITY DEFINER functions |
| AI | Lovable AI Gateway (role-restricted agent) |
| Validation | Zod schemas on forms |
| Routing | React Router with a `ProtectedRoute` guard |

---

## 3. User Roles & Permissions

Every account is created via sign-up but stays **inactive** until the Principal approves it and assigns a role.

| Role | What they can do |
|---|---|
| **Principal** | Approve/reject accounts, delete users, manage events, view analytics, view & clear audit logs, full oversight |
| **Director of Studies (DOS)** | Manage students and classes, view analytics, upload student data (CSV) |
| **Dean of Discipline (DOD)** | Review incident reports, deduct discipline marks, grant permissions |
| **Teacher** | Report incidents against students |
| **Discipline Staff** | Report incidents, follow up on students on the ground |

All role checks are enforced **on the server** (RLS + `has_role()` function). The UI hides what a user can't do; the database refuses it even if the UI is bypassed.

---

## 4. User Journey

```
Landing page  →  Sign up  →  Pending approval page (with app tour)
                                       ↓
                       Principal reviews in User Management
                                       ↓
                     Approves + assigns a role (e.g. Teacher)
                                       ↓
                        User signs in → Role-based Dashboard
```

Supporting flows:
- **Sign in** at `/auth`
- **Password reset** at `/reset-password`
- **Pending page** (`/pending`) shows an app tour while the user waits and a "Check approval status" button

---

## 5. Features

| Page / Route | Description |
|---|---|
| `/` — **Landing** | Public marketing page describing the app, roles, and CTAs |
| `/auth` — **Sign in / Sign up** | Split-screen with school branding |
| `/pending` — **Pending Approval** | App tour + status check for new sign-ups |
| `/dashboard` — **Dashboard** | KPIs (students, pending incidents, active permissions, upcoming events), Quick Actions, clickable Recent Activity timeline |
| `/sis` — **Student Information System** | Classes and students; add student, add class, CSV bulk import |
| `/sis/class/:id` — **Class Students** | Students in a class |
| `/student/:id` — **Student Profile** | Photo, marks, incidents, permissions |
| `/report` — **Incident Report** | Staff submit an incident with evidence upload |
| `/reports` — **Reports** | DOD reviews incidents and applies mark deductions |
| `/analytics` — **Analytics** | Discipline trends, exports (PDF / CSV) |
| `/calendar` — **Event Calendar** | School events (managed only by the Principal) |
| `/chat` — **Chat** | Real-time 1-to-1 and group conversations |
| `/notifications` — **Notifications** | Real-time alerts (approvals, incidents, chat) |
| `/users` — **User Management** | Principal approves, assigns roles, or deletes users |
| `/audit-logs` — **Audit Logs** | System-wide log of key actions; Principal can delete entries or clear all |
| `/about` — **About** | About the app and its author |

**Global elements:**
- **AI Assistant** floating button (bottom-right) available on every authenticated page
- Skeleton loaders, empty states, error boundary, and toast notifications throughout

---

## 6. Database (High Level)

All tables live in the `public` schema and are protected by RLS.

| Table | Purpose |
|---|---|
| `profiles` | One row per user, holds `full_name`, `email`, `status` (pending / approved), `desired_role` |
| `user_roles` | Assigned roles (`principal`, `dos`, `dod`, `teacher`, `discipline_staff`) — separate from profiles for security |
| `classes` | Class list managed by DOS |
| `students` | Student records (students are **not** app users) |
| `incidents` | Reported incidents, status, deducted marks |
| `permissions` | Time-bound permissions with `expires_at` |
| `events` | Principal-managed school events |
| `conversations` / `conversation_members` / `messages` | Real-time chat |
| `notifications` | Per-user alerts |
| `audit_logs` | System-wide action log |

**Key security helpers:**
- `has_role(user_id, role)` — SECURITY DEFINER, prevents RLS recursion
- `has_any_role(user_id, roles[])`
- `is_conversation_member(...)` — used by chat RLS
- `handle_new_user()` — trigger creates a pending profile on sign-up
- `expire_permissions()` — background job to expire permissions past their date

---

## 7. Security

- Auth handled by Lovable Cloud (email + password, JWT session).
- **No one can access app data without an approved account and an assigned role.**
- Roles live in a separate `user_roles` table (never in `profiles`) — prevents privilege escalation.
- All role checks are done server-side through `has_role()`.
- `ProtectedRoute` component guards every authenticated route on the frontend.
- Zod validates all form input (students, sign-up, etc.).
- Destructive actions (delete class, delete user, clear audit logs) require an `AlertDialog` confirmation.
- The `delete-user` Edge Function re-verifies the caller is a Principal before using the service role to remove the account.
- Global `ErrorBoundary` prevents blank crash screens.

---

## 8. Design System

- **Palette**
  - Navy `#0F172A` for headings
  - Primary blue `#2563EB` for actions
  - Emerald `#10B981` for success/permissions
  - Amber `#F59E0B` / red `#EF4444` for warnings & pending incidents
  - Slate-50 `#F8FAFC` app background so white cards pop
- **Typography:** modern sans-serif stack (Inter / system-ui), strong hierarchy between titles, subtitles, and captions
- **Components:** rounded cards with subtle borders and soft shadows, pill-shaped active nav items, radial brand glow on the landing page
- **Accessibility:** body text uses slate-600+ for WCAG-safe contrast on white
- **Responsive:** grids collapse to single column on mobile; AI FAB stays out of content

---

## 9. How to Use — Per Role

### New user (any role)
1. Open the app → **Sign up**.
2. Choose the role you'd like to be assigned.
3. You'll land on the **Pending** page — read the tour while you wait.
4. Once the Principal approves you, sign in again and you'll go straight to the Dashboard.

### Teacher / Discipline Staff
1. Dashboard → **Report Incident**.
2. Pick the student, describe what happened, attach evidence if needed.
3. Submit — the DOD will be notified.

### Dean of Discipline (DOD)
1. Dashboard → **Reports**.
2. Open a pending incident, review it, and apply a mark deduction or dismiss it.
3. Grant a **Permission** to a student when needed (with an expiry date).

### Director of Studies (DOS)
1. **SIS** → create classes.
2. Add students one by one or via **CSV upload**.
3. Check **Analytics** for trends.

### Principal
1. **User Management** → approve pending sign-ups and assign roles.
2. **Calendar** → schedule school events.
3. **Analytics** → view discipline trends.
4. **Audit Logs** → review system activity; delete entries or clear all if needed.
5. **User Management** → delete users when necessary.

### Everyone
- **Chat** with any other staff member.
- Get **Notifications** in real time.
- Open the **AI Assistant** (floating button) and just ask — "add a student named …", "take me to reports", "who has pending incidents?".

---

## 10. AI Assistant

The AI Assistant is a real in-app **agent**, not just a chatbot.

- Understands natural-language commands.
- Converts them into structured **actions** (create, update, delete, navigate, query).
- **Plans multi-step tasks** and executes them in order, showing numbered confirmations (✅ / 🚫 / 🧭).
- Keeps **short-term memory** of the last ~8 turns for context.
- Actions are **restricted to the caller's role** — the backend re-checks permissions before running anything, so a Teacher can't perform Principal-only actions even if they ask.
- Responds in **plain, human-friendly text** (no markdown clutter).

Powered by Lovable AI Gateway through the `ai-assistant` Edge Function.

---

## 11. Deployment

- Hosted on Lovable.
- **Preview:** https://id-preview--faa4b71e-d799-4bad-b23b-a179adbe02ed.lovable.app
- **Published:** https://kwizeraelissa.lovable.app
- Custom domains can be attached from Project → Settings → Domains.

---

## 12. Credits

Designed and built by **Kwizera Elissa**, a student at **Ecole des Sciences Byimana**, to make school discipline management faster, fairer, and fully digital.
