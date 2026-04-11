# Google OAuth Integration Report for Backend Team

> [!IMPORTANT]
> The primary reason Google OAuth fails in headless architectures (Next.js + Node.js) involves cross-domain cookie policies and the inability of browsers to share backend-generated cookies with frontend routes reliably. We have established a robust mechanism to fix this.

## 1. Problem We Fixed on Frontend
Previously, when the user clicked "Continue with Google", they were redirected to `http://localhost:5000/api/auth/google`. After the OAuth dance, the Backend attempted to set an `HttpOnly` cookie via headers during the `302 Redirect` back to `http://localhost:3000/`.
Next.js on the frontend **did not intercept or own this cookie** because browsers block or drop cookies across different ports/domains (`SameSite=Lax` issues) during cross-origin redirects. Thus, the user was redirected back to the frontend unauthenticated.

## 2. The Solution
We have created a dedicated **Frontend OAuth Callback Route Handler** (`/api/auth/callback`) within the Next.js application.

This route works as an intermediary:
1. It catches the generated JWT token passed securely via the URL.
2. The Next.js Backend itself securely sets the `token` cookie associated directly with the frontend domain.
3. It then redirects the user cleanly to their final destination.

---

## 3. Backend Action Items for Google OAuth
The backend Google OAuth callback controller (`/api/auth/google/callback`) MUST be updated to follow this exact flow:

### 1. Verify User & Generate Token
When Google redirects to your backend callback, handle the passport/oauth verification as usual. Upon successful verification, generate your JWT `token`.

### 2. Redirect to Frontend Callback
Instead of trying to `res.cookie()` and redirecting to the homepage, **the Backend MUST redirect the user to the Frontend's API route** and append the token as a URL query parameter. 

Example Backend Implementation (Express/Node.js):
```javascript
// Inside your Google OAuth Callback Route
app.get('/api/auth/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
    try {
        const user = req.user;
        // Generate Token
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        // Extract original "redirectTo" route if you kept it in state
        const redirectTo = req.query.state || '/dashboard';
        
        // IMPORTANT: Let Next.js Frontend handle setting the cookie!
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const finalRedirect = `${frontendUrl}/api/auth/callback?token=${token}&redirect=${encodeURIComponent(redirectTo)}`;
        
        return res.redirect(finalRedirect);
    } catch (error) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/api/auth/callback?error=auth_failed`);
    }
});
```

### 3. Handle `redirect` parameter
Notice that in `e:\01.web-projects\meaupost18\frontend\src\features\auth\components\GoogleLoginButton.tsx`, we send a `redirect` query parameter when initiating the flow:
`http://localhost:5000/api/auth/google?redirect=/dashboard`

If you are using Passport.js, you can capture this `redirect` query parameter and pass it inside the OAuth `state` parameter so it persists across the Google redirect. When Google returns to your callback, extract it from the `state` so you know where to send the user after the frontend completes the cookie setup.

> [!TIP]
> By passing the JWT back to the Next.js API Route `/api/auth/callback`, the Frontend Next.js Server naturally sets the highly secure HttpOnly session cookie on the correct domain without triggering browser cross-site policy warnings.
