import multer from "multer";
import { Request } from "express";

// 1. Multer Memory Storage Configuration
// Files are stored in memory (as Buffer) before being sent to ImageKit/S3.
const memoryStorage = multer.memoryStorage();

// 2. File Filter to allow only images
const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        // Validation Error throw karne ke liye
        cb(new Error("Only image files are allowed."));
    }
};

// 3. Centralized Upload Instance
export const imageUploadMiddleware = multer({
    storage: memoryStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit (Aapki route file se liya gaya)
    },
    fileFilter: fileFilter,
});
