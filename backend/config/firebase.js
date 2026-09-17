const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to Cloudinary (handles both PDFs and Images)
 * @param {string} fileName - Name of the file
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - MIME type of file
 * @param {string} folder - Folder path in Cloudinary
 * @returns {Promise<Object>} - Returns object with url and metadata
 */
const uploadToCloudinary = async (
  fileName,
  fileBuffer,
  mimeType,
  folder = "siraba-products",
) => {
  try {
    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadParams = {
        folder: folder,
        public_id: fileName, // Preserve extension
        resource_type: "auto",
        overwrite: true,
      };

      if (isImage) {
        uploadParams.format = "webp";
        uploadParams.quality = "auto";
        uploadParams.fetch_format = "auto";
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadParams,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );

      // Convert buffer to stream and pipe
      const { Readable } = require("stream");
      Readable.from(fileBuffer).pipe(uploadStream);
    });

    return {
      url: result.secure_url,
      fileName: result.original_filename || fileName,
      publicId: result.public_id,
      mimeType: mimeType,
      fileType: isImage ? "image" : "pdf",
      size: result.bytes,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of file to delete
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`File deleted: ${publicId}`);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  cloudinary,
};
