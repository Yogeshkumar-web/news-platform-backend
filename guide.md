Haanji, **User Management** feature ab poori tarah se implement ho chuka hai, aur yeh ab frontend team ke liye ready hai.

Lekin, aapke remaining features (Comment Moderation, System Statistics, aur Category Management) abhi implement hone baaki hain.

Yahaan Admin Dashboard ke liye **current status** aur **available endpoints** ki guide di gayi hai:

---

# 👑 Admin Dashboard API Guide (Current Status)

**Required Authentication:** Sabhi Admin endpoints ko `Authorization: Bearer <token>` header aur `ADMIN` ya `SUPERADMIN` role ki zaroorat hai.

---

## 1. User Management (✅ Completed)

Base Route: `/users`

| Feature              | Method  | Endpoint            | Payload / Query                                                                      | Notes                                                  |
| :------------------- | :------ | :------------------ | :----------------------------------------------------------------------------------- | :----------------------------------------------------- |
| **List All Users**   | `GET`   | `/users`            | **Query:** `page`, `pageSize`, `role`, `status` (e.g., `?role=WRITER&status=ACTIVE`) | Paginated list of users.                               |
| **Update User Role** | `PATCH` | `/users/:id/role`   | **JSON Body:** `{ "role": "ADMIN" }`                                                 | Role options: `SUPERADMIN`, `ADMIN`, `WRITER`, `USER`. |
| **Ban / Unban**      | `PATCH` | `/users/:id/status` | **JSON Body:** `{ "status": "BANNED" }`                                              | Status options: `ACTIVE`, `BANNED`.                    |

**Security Note:** Admin user apni khud ki `role` ya `status` is endpoint se change nahin kar sakta.

---

## 2. Article Management (✅ Partially Available)

Base Route: `/articles`

| Feature                | Method  | Endpoint                      | Role                  | Notes                                                              |
| :--------------------- | :------ | :---------------------------- | :-------------------- | :----------------------------------------------------------------- |
| **List All Articles**  | `GET`   | `/articles/admin/all`         | `ADMIN`, `SUPERADMIN` | Sabhi articles (DRAFT, PUBLISHED, etc.) ko list karta hai.         |
| **Bulk Status Update** | `PATCH` | `/articles/admin/bulk-status` | `ADMIN`, `SUPERADMIN` | Route defined hai, lekin **logic abhi implement karna baaki hai**. |

---

## 3. Comment Moderation (❌ Missing)

| Feature                  | Status                      | Notes                                                                                                                        |
| :----------------------- | :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| **Moderation Endpoints** | **Missing**                 | Comments ko `SPAM` mark karne, `APPROVE` karne, ya `DELETE` karne ke liye koi dedicated endpoints abhi available nahin hain. |
| **Validation**           | Validation logic ready hai. |                                                                                                                              |

---

## 4. Category Management (❌ Missing)

| Feature             | Status        | Notes                                                                                          |
| :------------------ | :------------ | :--------------------------------------------------------------------------------------------- |
| **CRUD Endpoints**  | **Missing**   | Categories ko Create, Edit, ya Delete karne ke liye koi endpoints abhi available nahin hain.   |
| **Read Categories** | **Available** | Public endpoint `GET /categories` se categories ki read-only list (count ke saath) mil jayegi. |

---

## 5. System Statistics / Analytics (❌ Missing)

| Feature            | Status      | Notes                                                                                                                           |
| :----------------- | :---------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **Statistics API** | **Missing** | Total users, total articles, ya platform views jaisa koi analytics data provide karne ke liye koi endpoint available nahin hai. |
