import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./environment";
import db from "./database";


// Google Strategy Configuration
console.log("🔹 Initializing Google Strategy...");
console.log("   - Client ID Present:", !!env.GOOGLE_CLIENT_ID);
console.log("   - Client Secret Present:", !!env.GOOGLE_CLIENT_SECRET);
console.log("   - Callback URL (configured):", `http://localhost:${env.PORT}/api/auth/google/callback`);

if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    console.error("❌ CRITICAL ERROR: Google Client ID or Secret is MISSING in environment variables!");
}

try {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID || "missing",
          clientSecret: env.GOOGLE_CLIENT_SECRET || "missing",
          callbackURL: `http://localhost:${env.PORT}/api/auth/google/callback`,
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          console.log("✅ Google Strategy Callback Received!");
          console.log("   - Profile ID:", profile.id);
          try {
            // Check if user already exists with this Google ID
            const existingUser = await db.user.findUnique({
              where: { googleId: profile.id },
              include: {
                  subscription: {
                      where: { status: "ACTIVE" as any },
                  },
              },
            });

            if (existingUser) {
              return done(null, { ...existingUser, isSubscriber: !!existingUser.subscription });
            }

            // Check if user exists with the same email (account linking)
            const email = profile.emails?.[0]?.value;
            
            if (email) {
              const existingEmailUser = await db.user.findUnique({
                where: { email },
                include: {
                    subscription: { where: { status: "ACTIVE" as any } },
                },
              });

              if (existingEmailUser) {
                // Link Google ID to existing user
                const updatedUser = await db.user.update({
                  where: { id: existingEmailUser.id },
                  data: {
                    googleId: profile.id,
                    isVerified: true, // Trust Google verification
                  },
                  include: {
                      subscription: { where: { status: "ACTIVE" as any } },
                  },
                });
                return done(null, { ...updatedUser, isSubscriber: !!updatedUser.subscription });
              }
            }

            // Create new user
            const newUser = await db.user.create({
              data: {
                googleId: profile.id,
                email: email!,
                // Fallback: If displayName is missing, use email username
                name: profile.displayName || email!.split('@')[0], 
                profileImage: profile.photos?.[0]?.value || "",
                isVerified: true, 
                role: "USER",
                // Explicitly set defaults to satisfy potential DB NOT NULL constraints
                status: "ACTIVE", 
                isSuspended: false,
                hashedPass: "google-oauth-user", 
                bio: "",
              },
              include: { subscription: true },
            });

            return done(null, { ...newUser, isSubscriber: !!newUser.subscription });
          } catch (error) {
            console.error("❌ Error inside Google Strategy Callback:", error);
            return done(error as Error, undefined);
          }
        }
      )
    );
    console.log("✅ Google Strategy configured successfully");
} catch (error) {
    console.error("❌ Failed to configure Google Strategy:", error);
}

// We don't need serialization/deserialization for JWT sessions usually,
// but Passport might require it if using sessions.
// Since we are using JWT, we might skip session support in the route.
