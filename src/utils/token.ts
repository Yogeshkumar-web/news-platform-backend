import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/environment";

export const generateVerificationToken = (): string => {
    // Generates a 64 character hex string
    return randomBytes(32).toString("hex");
};

export const hashToken = async (token: string): Promise<string> => {
    // Uses BCRYPT_SALT_ROUNDS from env (default 12)
    const saltRounds = env.BCRYPT_SALT_ROUNDS;
    return bcrypt.hash(token, saltRounds);
};

export const compareTokens = async (
    rawToken: string,
    hashedToken: string
): Promise<boolean> => {
    return bcrypt.compare(rawToken, hashedToken);
};
