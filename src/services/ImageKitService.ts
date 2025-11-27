import ImageKit from "imagekit";
import { InternalError } from "../utils/apiError";
import { env } from "../config/environment";

// ImageKit credentials ko aapko .env file ya config se load karna hoga
const imagekit = new ImageKit({
    publicKey: env.IMAGEKIT_PUBLIC_KEY,
    privateKey: env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
});

export class ImageKitService {
    /**
     * Uploads a file buffer to ImageKit.io
     * @param file - The file object from Multer (req.file)
     * @returns The public URL of the uploaded image
     */
    public async uploadImage(file: Express.Multer.File): Promise<string> {
        if (!file.buffer) {
            throw new InternalError("File buffer missing for upload.");
        }

        try {
            const uploadResponse = await imagekit.upload({
                file: file.buffer, // Image file buffer
                fileName: file.originalname, // Original filename
                folder: "/news-images", // Optional: Aapka ImageKit folder
                // Tags aur is tarah ke aur options yahan add kiye ja sakte hain
            });

            // Upload successful hone par ImageKit ki URL return karein
            return uploadResponse.url;
        } catch (error) {
            console.error("ImageKit Upload Error:", error);
            // Robust error handling
            throw new InternalError("Failed to upload image to ImageKit.");
        }
    }

    // Yahan deleteImage, listImages jaise functions bhi daal sakte hain.
}
