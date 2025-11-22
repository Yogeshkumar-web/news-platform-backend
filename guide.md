**IMPORTANT: Missing Features Confirmation**

Aapki zaroorat ke hisaab se, current backend code mein user profile update aur password change ke liye **koi dedicated endpoints implement nahi kiye gaye hain**.

Frontend team ko in features ko use karne ke liye **backend mein naye routes aur logic add karna hoga**.

Yahaan missing information aur recommended implementation details di gayi hain:

---

## 1\. Update Profile Endpoint

| Detail                | Current Status (Missing) | Recommended Implementation                                                                                   |
| :-------------------- | :----------------------- | :----------------------------------------------------------------------------------------------------------- |
| **Endpoint**          | **Missing**              | `PUT` ya `PATCH /auth/profile` (ya `/users/me`)                                                              |
| **Method**            | **Missing**              | `PUT` ya `PATCH`                                                                                             |
| **Authentication**    | Zaroori                  | `Authorization: Bearer <token>` (User ID is taken from token)                                                |
| **Payload Structure** | **Missing**              | **JSON Body:** `name`, `email`, `bio`, `profileImage` (URL), etc. (Jo fields update karne hain, woh bhejein) |
| **Validation**        | **Missing**              | New validation rules in `validation.ts` for updated fields.                                                  |

### Recommended Payload Example (PUT /auth/profile):

```json
{
    "name": "Yogesh Kumar Updated",
    "bio": "Senior Writer for Tech News",
    "profileImage": "https://cdn.example.com/new-avatar.jpg" // Optional field
}
```

---

## 2\. Profile Image Upload

| Detail                              | Current Status | Recommended Action                                                                                                                                                                                                              |
| :---------------------------------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Reuse `/articles/upload-image`?** | **NO.**        | **Naya Endpoint Banayein.** `/articles/upload-image` sirf article content ke liye designed hai aur `uploadDir` (uploads/images) mein save karta hai. Profile images ke liye **alag logic** aur **alag directory** honi chahiye. |
| **Recommended Endpoint**            | **Missing**    | `POST /users/avatar` (ya `/auth/upload-avatar`)                                                                                                                                                                                 |
| **Payload**                         | **Missing**    | `multipart/form-data` file upload, field name: `avatar` (recommended).                                                                                                                                                          |
| **Logic**                           | **Missing**    | Ek naya controller method aur service function banana hoga jo file ko handle kare aur user record mein `profileImage` field update kare.                                                                                        |

---

## 3\. Change Password Feature

| Detail                | Current Status (Missing) | Recommended Implementation                                                        |
| :-------------------- | :----------------------- | :-------------------------------------------------------------------------------- |
| **Support?**          | **Missing**              | Yes, it should be supported.                                                      |
| **Endpoint**          | **Missing**              | `PATCH /auth/password-change` (ya `/users/change-password`)                       |
| **Method**            | **Missing**              | `PATCH`                                                                           |
| **Authentication**    | Zaroori                  | `Authorization: Bearer <token>`                                                   |
| **Payload Structure** | **Missing**              | **JSON Body:** `oldPassword` (verification ke liye) aur `newPassword`.            |
| **Validation**        | **Missing**              | New validation rules in `validation.ts` for both `oldPassword` and `newPassword`. |

### Recommended Payload Example (PATCH /auth/password-change):

```json
{
    "oldPassword": "CurrentSecurePassword123!",
    "newPassword": "NewSecurePassword456@" // Must meet all password strength rules
}
```
