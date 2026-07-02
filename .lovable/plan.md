
## Goal
Produce a single, complete description of the School Discipline Management System (SDMS) that a new person (developer, staff member, or evaluator) can read to fully understand what the app is, who it's for, how it works, and how to use it.

## Deliverable
A new Markdown document at `docs/SDMS_OVERVIEW.md` (and link it from `README.md`) containing:

### 1. Introduction
- Name: School Discipline Management System (SDMS)
- School: Ecole des Sciences Byimana
- Purpose: centralize student discipline, records, permissions, incidents, events, and communication
- Author: Kwizera Elissa

### 2. Tech Stack
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui
- Backend: Lovable Cloud (Auth, Postgres with RLS, Storage, Edge Functions, Realtime)
- AI: Lovable AI Gateway (role-aware agent)
- PWA-ready, mobile responsive

### 3. User Roles & Permissions
Table of roles and what each one can do:
- Principal — approves accounts, manages events, deletes users, views analytics & audit logs
- Director of Studies (DOS) — manages students, classes, analytics
- Dean of Discipline (DOD) — reviews incidents, grants permissions, adjusts discipline marks
- Teacher — reports incidents
- Discipline Staff — reports incidents, follows up on students

### 4. User Journey
- Landing page → Sign up → Pending approval page (with app tour) → Principal approves & assigns role → Role-based dashboard
- Password reset flow
- Sign-in flow

### 5. Features (with page references)
- Dashboard: KPIs, quick actions, recent activity timeline
- Student Information System (SIS): student list, classes, profiles, CSV upload
- Incident Reporting: staff report, DOD reviews and deducts marks
- Permissions: DOD grants time-bound permissions
- Events Calendar: Principal-managed
- Chat: 1-to-1 and group real-time messaging
- Notifications: real-time alerts
- Analytics: discipline trends, exports (PDF/CSV)
- Audit Logs: system-wide action logs, Principal can clear
- User Management: Principal-only, approve/delete users
- AI Assistant: role-aware in-app agent that plans and executes actions (navigate, CRUD) with session memory and confirmations
- About page

### 6. Database (high level)
List tables and their purpose: profiles, user_roles, students, classes, incidents, permissions, events, conversations, conversation_members, messages, notifications, audit_logs. Note that RLS protects every table and `has_role` prevents recursion.

### 7. Security
- Auth via Lovable Cloud, JWT sessions
- Role checks server-side via `has_role` SECURITY DEFINER
- Principal approval required — no anonymous access to app data
- Zod validation on forms, protected routes, error boundary
- Edge function `delete-user` verifies principal role before service-role deletion

### 8. Design System
- Palette: navy `#0F172A`, primary blue `#2563EB`, emerald `#10B981`, amber/red for warnings, slate-50 background
- Typography: Inter / system sans-serif
- Modern card-based UI, rounded pill nav active states, subtle radial glow on landing

### 9. How to Use (per role, step-by-step)
Short walkthroughs:
- New user: sign up → wait on Pending page → get approved
- Teacher: dashboard → Report Incident → submit
- DOD: dashboard → Reports → review → deduct marks / grant permission
- DOS: SIS → add class → add students (or CSV)
- Principal: User Management → approve → assign role; Events → schedule; Audit Logs → review
- Everyone: Chat, Notifications, AI Assistant (FAB bottom-right)

### 10. AI Assistant
- Understands natural language
- Plans multi-step actions
- Executes CRUD + navigation restricted to caller's role
- Plain-text responses, session memory (last 8 turns)

### 11. Deployment
- Hosted on Lovable
- Published URL: https://kwizeraelissa.lovable.app

### 12. Credits
- Built by Kwizera Elissa, Ecole des Sciences Byimana

## README update
Replace the default Lovable README template with a short project intro that links to `docs/SDMS_OVERVIEW.md` for the full description.

## Out of scope
No code, UI, database, or feature changes — documentation only.
