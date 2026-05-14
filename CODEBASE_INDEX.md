# Backend Codebase Index

Purpose: compact working map for future backend changes. Read this first, then use `rg` and targeted file reads for source-of-truth details.

## Project Shape

- Stack: Express 4, TypeScript, CommonJS, Prisma/PostgreSQL, Passport Google OAuth, JWT/cookie auth, ImageKit, SMTP email.
- Runtime scripts:
  - Dev: `npm run dev` -> `nodemon --exec ts-node --transpile-only src/server.ts`
  - Build: `npm run build` -> `npm ci && tsc`
  - Start: `npm start` -> `node dist/server.js`
- Boot flow:
  - `src/server.ts` imports `App` from `src/index.ts`, sets graceful shutdown and process error handlers, then calls `app.listen()`.
  - `src/index.ts` builds the Express app, initializes middleware, mounts routes, then installs global 404/error handlers.

## Middleware And Config

- Middleware order in `src/index.ts`:
  - security headers, trace IDs, compression.
  - CORS from `env.CORS_ORIGINS`, JSON/urlencoded parsers, cookies, Passport init.
  - global rate limit, request logging, static upload serving.
  - route mounting, then `notFoundHandler`, then `globalErrorHandler`.
- Static uploads are currently mounted as `"api/uploads"` without a leading slash.
- Env validation: `src/config/environment.ts`.
  - Required includes database, ImageKit, SMTP, and `JWT_SECRET`.
  - Defaults/options include Google OAuth, Redis URL, CORS origins, rate limits, client URL.
- Database client: `src/config/database.ts`.
- OAuth strategy: `src/config/passport.ts`.

## Mounted Route Map

- Health/info:
  - `GET /health`
  - `GET /api`
- Auth mounted at `/api/auth` via `src/routes/authRoute.ts`:
  - `POST /register`, `POST /login`
  - `POST /verify-email`, `POST /resend-verification`
  - `GET /me`
  - `POST /logout`
  - `PUT /profile`
  - `POST /avatar`
  - `PATCH /password-change`
  - `GET /google`, `GET /google/callback`
- Articles mounted at `/api/articles` via `src/routes/articlesRoute.ts`:
  - Public: `GET /`, `GET /category/:categoryName`, `GET /:slug`
  - Writer/admin: `POST /`, `GET /my/articles`, `GET /edit/:id`, `PUT /:id`, `PATCH /:id/status`, `DELETE /:id`, `POST /upload-image`
  - Admin: `GET /admin/all`, `PATCH /admin/bulk-status`
  - Placeholder/stub routes exist for `/featured`, `/popular`, `/search`; confirm implementation before using.
- Categories mounted at `/api/categories` via `src/routes/categoryRoute.ts`:
  - Public: `GET /`
  - Admin: `GET /admin/all`, `POST /`, `PUT /:id`, `DELETE /:id`
- Comments mounted at `/api/comments` via `src/routes/commentsRoute.ts`:
  - Authenticated create: `POST /create`
  - Public: `GET /:articleId`, `GET /stats/:articleId`
  - Admin-gated after `router.use(authenticateToken)` and `router.use(requireRole(["ADMIN", "SUPERADMIN"]))`:
    `PATCH /:id/status`, `PUT /:id`, `DELETE /:id`, `GET /user/:userId?`, `POST /:id/spam`, `POST /:id/approve`, `GET /admin/recent`
- Users mounted at `/api/users` via `src/routes/userRoute.ts`:
  - Authenticated: `GET /me/saved-articles`
  - Admin/superadmin: `GET /`, `PUT /:id/role`, `PATCH /:id/status`
- Stats mounted at `/api/stats` via `src/routes/statsRoute.ts`:
  - Authenticated writer/admin: `GET /dashboard`
  - Superadmin: `GET /admin/system-config`
  - Authenticated: `GET /system`

## Layered Architecture

- Routes: `src/routes/*Route.ts` define paths, methods, auth/role middleware, validation, and controller calls.
- Controllers: `src/controllers/*Controller.ts` orchestrate request/response handling.
- Services: `src/services/*Service.ts` contain business logic.
- Repositories: `src/repositories/*Repository.ts` contain Prisma/database access.
- Middleware:
  - auth/roles: `src/middleware/authMiddleware.ts`
  - validation/sanitization: `src/middleware/validation.ts`
  - security/rate limiting/file upload/error handling: matching files in `src/middleware`.
- Utilities:
  - response/errors: `src/utils/response.ts`, `src/utils/apiError.ts`, `src/types/index.ts`
  - async wrapper, pagination, category, token, health, logging helpers under `src/utils`.

## Prisma And Data Model

- Prisma schema: `prisma/schema.prisma`.
- Generated Prisma client output: `src/generated/prisma`.
  - Treat as generated/read-only for normal feature work.
  - Do not hand-edit generated model/client files.
- Main enums:
  - `UserRole`: `ADMIN`, `SUPERADMIN`, `WRITER`, `SUBSCRIBER`, `USER`
  - `SubscriptionStatus`: `ACTIVE`, `INACTIVE`, `TRIAL`, `CANCELED`
  - `UserStatus`: `ACTIVE`, `BANNED`
  - `CommentStatus`: `APPROVED`, `PENDING`, `SPAM`, `ARCHIVED`, `DELETED`
  - `ArticleStatus`: `DRAFT`, `PUBLISHED`, `ARCHIVED`, `PENDING_REVIEW`
- Main models:
  - `User`: auth identity, verification/OAuth fields, role/status, profile, articles, comments, likes, saved articles, subscription.
  - `Subscription`: one-to-one user plan/status/payment reference.
  - `Article`: title/slug/content/status/thumbnail/featured/premium/view counts, author, categories, comments, likes, saved users.
  - `Category`: key/label/count/hidden flag.
  - `ArticleCategory`: many-to-many join between articles and categories.
  - `Comment`: threaded comments with moderation fields.
  - `Like`: unique user/article likes.

## Known Hotspots

- Frontend/backend contract mismatches:
  - Saved articles: frontend has `/api/users/saved-articles`; backend exposes `/api/users/me/saved-articles`.
  - User role update: frontend uses `PATCH /api/users/:id/role`; backend uses `PUT /api/users/:id/role`.
  - Admin comments list: frontend expects `/api/comments/admin/all`; backend defines `/api/comments/admin/recent`.
  - Some frontend auth/profile helpers omit `/api` or use old paths.
- `commentsRoute.ts` applies admin role middleware before update/delete/user-comment routes, even though comments mention owner access.
- `articlesRoute.ts` declares `/admin/bulk-status` twice; the implemented route appears after `/:slug`, so ordering may matter.
- Static uploads mount path is `"api/uploads"` instead of `"/api/uploads"`.
- Some log strings contain mojibake from encoding issues; avoid broad cleanup unless requested.
