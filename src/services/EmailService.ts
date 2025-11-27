import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/environment";
import logger from "../utils/logger";
import { InternalError } from "../types";

export class EmailService {
    private transporter: Transporter;
    private fromEmail: string = env.EMAIL_FROM;
    private baseUrl: string = "http://localhost:3000";

    constructor() {
        // Nodemailer setup: Robust SMTP Configuration
        this.transporter = nodemailer.createTransport({
            host: env.EMAIL_HOST,
            port: env.EMAIL_PORT,
            // Production mein, port 465 (SSL) ke liye secure: true use karna zaroori hai.
            secure: env.NODE_ENV === "production" && env.EMAIL_PORT === 465,
            auth: {
                user: env.EMAIL_USER,
                pass: env.EMAIL_PASS,
            },
            // Development/Testing ke liye, self-signed certificates/TLS issues ignore karna
            tls: {
                rejectUnauthorized: false,
            },
        });

        // Robustness Check: Transporter connection check karna (Good practice)
        this.transporter
            .verify()
            .then(() => {
                logger.info(
                    `✅ Email transporter is ready. HOST: ${env.EMAIL_HOST}`
                );
            })
            .catch((err) => {
                logger.error(
                    "❌ Email transporter failed to connect. Check SMTP credentials.",
                    err
                );
                // Production mein, agar email service fail ho toh process exit karna bhi ek option hai.
            });
    }

    /**
     * Sends the email verification link to a user.
     */
    public async sendVerificationEmail(
        toEmail: string,
        name: string,
        token: string
    ): Promise<void> {
        const verificationLink = `${this.baseUrl}/verify-email?token=${token}`;

        const mailOptions = {
            from: this.fromEmail,
            to: toEmail,
            subject: "Verify Your News Platform Account",
            html: `
                <p>Hello ${name},</p>
                <p>Thank you for registering! Please click the link below to verify your email address:</p>
                <a href="${verificationLink}" style="color: #1a73e8; font-weight: bold;">Verify Email Address</a>
                <p>This link will expire in ${env.VERIFICATION_TOKEN_EXPIRES_IN}.</p>
                <p>If you did not sign up for this account, please ignore this email.</p>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            logger.info("Verification email sent successfully via Nodemailer", {
                toEmail,
            });
        } catch (error) {
            logger.error(
                "Failed to send verification email via Nodemailer",
                error
            );
            // Robust Error Handling: InternalError throw karo taaki global handler use catch kare
            throw new InternalError(
                "Could not send verification email due to server SMTP error."
            );
        }
    }
}

export const emailService = new EmailService();

// import { Resend } from "resend";
// import { env } from "../config/environment";
// import logger from "../utils/logger";
// import { InternalError } from "../types";

// // Initialize Resend Client with API Key
// const resend = new Resend(env.RESEND_API_KEY);

// export class EmailService {
//     private fromEmail: string = env.RESEND_FROM_EMAIL;
//     private baseUrl: string = "http://localhost:3000"; // Frontend URL - adjust as needed

//     /**
//      * Sends a verification email using the Resend API.
//      */
//     public async sendVerificationEmail(
//         toEmail: string,
//         name: string,
//         token: string
//     ): Promise<void> {
//         const verificationLink = `${this.baseUrl}/verify-email?token=${token}`;

//         const emailOptions = {
//             from: this.fromEmail, // Must be a verified email in Resend
//             to: [toEmail],
//             subject: "Verify Your News Platform Account",
//             html: `
//                 <p>Hello ${name},</p>
//                 <p>Thank you for registering. Please click the button below to verify your email address:</p>
//                 <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #1a73e8; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
//                     Verify Email Address
//                 </a>
//                 <p>This link will expire in ${env.VERIFICATION_TOKEN_EXPIRES_IN}.</p>
//                 <p>If you did not sign up for this account, please ignore this email.</p>
//             `,
//             text: `Hello ${name},\n\nPlease verify your email: ${verificationLink}\n\nThis link will expire in ${env.VERIFICATION_TOKEN_EXPIRES_IN}.`,
//         };

//         try {
//             const { error } = await resend.emails.send(emailOptions);

//             if (error) {
//                 logger.error("Resend API Error:", error);
//                 throw new InternalError(
//                     `Email sending failed: ${error.message}`
//                 );
//             }

//             logger.info("Verification email sent successfully via Resend", {
//                 toEmail,
//             });
//         } catch (error) {
//             logger.error(
//                 "Failed to send verification email via Resend:",
//                 error
//             );
//             // Re-throw a generic operational error
//             throw new InternalError(
//                 "Could not send verification email. Please check server logs."
//             );
//         }
//     }
// }

// export const emailService = new EmailService();
