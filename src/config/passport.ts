import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./environment";
import { AuthService } from "../services/AuthService";

const googleCallbackUrl =
    env.NODE_ENV === "production"
        ? `https://news-platform-backend.onrender.com/api/auth/google/callback`
        : `http://localhost:${env.PORT}/api/auth/google/callback`;

if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    console.error(
        "Google OAuth is not fully configured: missing client id or secret."
    );
}

try {
    passport.use(
        new GoogleStrategy(
            {
                clientID: env.GOOGLE_CLIENT_ID || "missing",
                clientSecret: env.GOOGLE_CLIENT_SECRET || "missing",
                callbackURL: googleCallbackUrl,
                scope: ["profile", "email"],
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const authService = new AuthService();
                    const user = await authService.handleGoogleProfile(profile);
                    return done(null, user);
                } catch (error) {
                    return done(error as Error, undefined);
                }
            }
        )
    );
} catch (error) {
    console.error("Failed to configure Google Strategy:", error);
}
