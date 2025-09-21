import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/AuthService";
import { ResponseHandler } from "../utils/response";
import { env } from "../config/environment";
import { AuthenticatedRequest } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return ResponseHandler.error(
          res,
          "Missing fields",
          400,
          "VALIDATION_ERROR"
        );
      }

      const user = await this.authService.register({ name, email, password });

      return ResponseHandler.created(
        res,
        { user },
        "User registered successfully"
      );
    }
  );

  login = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, password } = req.body;

      const result = await this.authService.login({ email, password });

      // Set HTTP-only cookie
      const cookieOptions = this.authService.getCookieOptions(
        env.NODE_ENV === "production"
      );
      res.cookie("token", result.token, cookieOptions);

      return ResponseHandler.success(
        res,
        { user: result.user },
        "Login successful"
      );
    }
  );

  getProfile = asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user?.id) {
        return ResponseHandler.error(
          res,
          "User not authenticated",
          401,
          "NOT_AUTHENTICATED"
        );
      }

      const user = await this.authService.getProfile(req.user.id);

      return ResponseHandler.success(
        res,
        { user },
        "Profile retrieved successfully"
      );
    }
  );

  logout = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      res.clearCookie("token", {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      return ResponseHandler.success(res, null, "Logged out successfully");
    }
  );
}
