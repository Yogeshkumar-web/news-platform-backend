import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { AuthService } from "../services/AuthService";
import { ResponseHandler } from "../utils/response";
import { env } from "../config/environment";
import { AuthenticatedRequest, ValidationError } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    googleAuth = (req: Request, res: Response, next: NextFunction) => {
        let state = "/";
        if (req.query.redirect) {
            state = req.query.redirect as string;
        }
        
        // Base64 encode the state JSON to pass to Google
        const stateStr = Buffer.from(JSON.stringify({ redirect: state })).toString("base64");
        
        passport.authenticate("google", {
            scope: ["profile", "email"],
            state: stateStr,
        })(req, res, next);
    };

    googleCallback = asyncHandler(
        async (req: Request, res: Response, next: NextFunction) => {
            passport.authenticate(
                "google",
                { session: false },
                async (err: any, user: any, info: any) => {
                    const frontendUrl = env.CLIENT_URL || "http://localhost:3000";
                    let redirectTo = "/";

                    if (req.query.state) {
                        try {
                            const decodedState = JSON.parse(
                                Buffer.from(req.query.state as string, "base64").toString("utf8")
                            );
                            if (decodedState.redirect) {
                                redirectTo = decodedState.redirect;
                            }
                        } catch (error) {
                            console.error("Error decoding state", error);
                        }
                    }

                    if (err || !user) {
                        console.error("❌ Passport Authentication Failed:", err);
                        return res.redirect(
                            `${frontendUrl}/api/auth/callback?error=auth_failed`
                        );
                    }

                    // Log the user in effectively (generate token)
                    const tokenPayload = this.authService.createTokenPayload(user);
                    const token = this.authService.generateToken(tokenPayload);

                    // Redirect securely to the frontend callback without setting cookies here
                    const finalRedirect = `${frontendUrl}/api/auth/callback?token=${token}&redirect=${encodeURIComponent(redirectTo)}`;
                    return res.redirect(finalRedirect);
                },
            )(req, res, next);
        },
    );

    register = asyncHandler(
        async (req: Request, res: Response, next: NextFunction) => {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                return ResponseHandler.error(
                    res,
                    "Missing fields",
                    400,
                    "VALIDATION_ERROR",
                );
            }

            const user = await this.authService.register({
                name,
                email,
                password,
            });

            return ResponseHandler.created(
                res,
                { user },
                "User registered successfully",
            );
        },
    );

    login = asyncHandler(
        async (req: Request, res: Response, next: NextFunction) => {
            const { email, password } = req.body;

            const result = await this.authService.login({ email, password });

            // Set HTTP-only cookie
            const cookieOptions = this.authService.getCookieOptions(
                env.NODE_ENV === "production",
            );
            res.cookie("token", result.token, cookieOptions);

            return ResponseHandler.success(
                res,
                { user: result.user, token: result.token },
                "Login successful",
            );
        },
    );

    verifyEmail = asyncHandler(async (req: Request, res: Response) => {
        const rawToken = req.body.token || req.query.token; // Accepts token in body or query

        if (!rawToken) {
            throw new ValidationError(
                "Verification token is missing.",
                "TOKEN_MISSING",
            );
        }

        const result = await this.authService.verifyUser(rawToken);

        return ResponseHandler.success(res, null, result.message);
    });

    /**
     * POST /api/auth/resend-verification
     */
    resendVerificationEmail = asyncHandler(
        async (req: Request, res: Response) => {
            const { email } = req.body;

            if (!email) {
                throw new ValidationError(
                    "Email address is required to resend the link.",
                    "EMAIL_REQUIRED",
                );
            }

            const result =
                await this.authService.resendVerificationEmail(email);

            // Security: Always return a generic success message
            return ResponseHandler.success(res, null, result.message);
        },
    );

    getProfile = asyncHandler(
        async (
            req: AuthenticatedRequest,
            res: Response,
            next: NextFunction,
        ) => {
            if (!req.user?.id) {
                return ResponseHandler.error(
                    res,
                    "User not authenticated",
                    401,
                    "NOT_AUTHENTICATED",
                );
            }

            const user = await this.authService.getProfile(req.user.id);

            return ResponseHandler.success(
                res,
                { user },
                "Profile retrieved successfully",
            );
        },
    );

    logout = asyncHandler(
        async (req: Request, res: Response, next: NextFunction) => {
            res.clearCookie("token", {
                httpOnly: true,
                secure: env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
            });

            return ResponseHandler.success(
                res,
                null,
                "Logged out successfully",
            );
        },
    );

    // New: Update user profile
    updateProfile = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const userId = req.user?.id;
            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "User not authenticated",
                    401,
                    "NOT_AUTHENTICATED",
                );
            }

            // Request body mein sirf validated fields hi honge
            const updatedUser = await this.authService.updateProfile(
                userId,
                req.body,
            );

            return ResponseHandler.success(
                res,
                { user: updatedUser },
                "Profile updated successfully",
            );
        },
    );

    // New: Upload profile avatar
    uploadAvatar = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            if (!req.user?.id) {
                return ResponseHandler.error(
                    res,
                    "User not authenticated",
                    401,
                    "NOT_AUTHENTICATED",
                );
            }

            const imageUrl = await this.authService.uploadAvatar(req.file);

            return ResponseHandler.success(
                res,
                { url: imageUrl },
                "Avatar uploaded successfully",
            );
        },
    );

    // New: Change password
    changePassword = asyncHandler(
        async (req: AuthenticatedRequest, res: Response) => {
            const userId = req.user?.id;
            const { oldPassword, newPassword } = req.body;

            if (!userId) {
                return ResponseHandler.error(
                    res,
                    "User not authenticated",
                    401,
                    "NOT_AUTHENTICATED",
                );
            }

            await this.authService.changePassword(userId, {
                oldPassword,
                newPassword,
            });

            return ResponseHandler.success(
                res,
                null,
                "Password changed successfully",
            );
        },
    );
}
