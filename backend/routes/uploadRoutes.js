const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { uploadToCloudinary } = require("../config/firebase");

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      return cb(null, true);
    }
    cb(
      new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Unsupported file type"),
    );
  },
});

// @route POST /api/upload
// @desc  Uploads file to Firebase Storage (PDFs and Images)
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const fileType = req.file.mimetype;
    const isPdf = fileType === "application/pdf";
    const isImage = fileType.startsWith("image/");

    // Validate Cloudinary is configured
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error("Cloudinary not properly configured");
      return res.status(500).json({ message: "Upload service not configured" });
    }

    const folder = req.body.folder || (isPdf ? "pdfs" : "images");
    const baseName =
      req.body.publicId || path.parse(req.file.originalname).name;
    const uniqueId = crypto.randomBytes(6).toString("hex");
    const fileName =
      `${baseName}-${uniqueId}${path.extname(req.file.originalname)}`.replace(
        /[^a-zA-Z0-9-_\.]/g,
        "",
      );

    try {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(
        fileName,
        req.file.buffer,
        fileType,
        folder,
      );

      const metadata = {
        url: result.url,
        fileName: result.fileName,
        publicId: result.publicId,
        fileType: result.fileType,
        size: req.file.size,
        service: "Cloudinary",
      };

      return res.status(201).json({
        url: result.url,
        ...metadata,
        download_url: result.url,
      });
    } catch (uploadError) {
      console.error("Upload error:", uploadError.message);
      console.error("Full error:", uploadError);
      return res.status(500).json({
        message: uploadError.message || "Error uploading file",
        error:
          process.env.NODE_ENV === "development"
            ? uploadError.message
            : undefined,
      });
    }
  } catch (error) {
    console.error("Upload endpoint error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// @route GET /api/upload/view-doc
// @desc  Proxy/viewer endpoint that streams documents with proper inline MIME headers (PDF/Images)
router.get("/view-doc", async (req, res) => {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl) {
      return res.status(400).json({ message: "File URL is required" });
    }

    const decodedUrl = decodeURIComponent(rawUrl);
    const axios = require("axios");

    const fetchOpts = {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
    };

    let response;
    try {
      response = await axios.get(decodedUrl, fetchOpts);
    } catch (fetchErr) {
      // Cloudinary returns 401 for PDFs uploaded as image resource_type
      if (
        fetchErr.response?.status === 401 &&
        decodedUrl.includes("cloudinary.com")
      ) {
        const candidateUrls = [];
        if (decodedUrl.endsWith(".pdf.pdf")) {
          candidateUrls.push(decodedUrl.replace(/\.pdf\.pdf$/i, ".pdf.png"));
          candidateUrls.push(decodedUrl.replace(/\.pdf\.pdf$/i, ".png"));
          candidateUrls.push(decodedUrl.replace(/\.pdf\.pdf$/i, ".pdf.jpg"));
          candidateUrls.push(decodedUrl.replace(/\.pdf\.pdf$/i, ".jpg"));
        } else if (decodedUrl.endsWith(".pdf")) {
          candidateUrls.push(decodedUrl.replace(/\.pdf$/i, ".png"));
          candidateUrls.push(decodedUrl.replace(/\.pdf$/i, ".pdf.png"));
          candidateUrls.push(decodedUrl.replace(/\.pdf$/i, ".jpg"));
          candidateUrls.push(decodedUrl.replace(/\.pdf$/i, ".pdf.jpg"));
        }

        let fallbackSuccess = false;
        for (const candUrl of candidateUrls) {
          try {
            response = await axios.get(candUrl, fetchOpts);
            fallbackSuccess = true;
            break;
          } catch (e) {
            // try next candidate
          }
        }

        if (!fallbackSuccess) {
          throw fetchErr;
        }
      } else {
        throw fetchErr;
      }
    }

    const buffer = Buffer.from(response.data);
    let mimeType = "application/pdf"; // default fallback

    // Magic Bytes inspection
    if (buffer.slice(0, 4).toString() === "%PDF") {
      mimeType = "application/pdf";
    } else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      mimeType = "image/jpeg";
    } else if (buffer.slice(0, 4).toString("hex") === "89504e47") {
      mimeType = "image/png";
    } else if (
      buffer.slice(0, 4).toString() === "RIFF" &&
      buffer.slice(8, 12).toString() === "WEBP"
    ) {
      mimeType = "image/webp";
    } else if (
      response.headers["content-type"] &&
      response.headers["content-type"] !== "application/octet-stream"
    ) {
      mimeType = response.headers["content-type"];
    }

    const ext = mimeType.includes("pdf")
      ? "pdf"
      : mimeType.includes("png")
        ? "png"
        : mimeType.includes("webp")
          ? "webp"
          : "jpg";

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="document.${ext}"`);
    return res.send(buffer);
  } catch (error) {
    console.error("View document error:", error.message);
    return res.status(500).json({ message: "Failed to load document" });
  }
});

// @route GET /api/upload/:filename
// @desc  Previously served files from GridFS. Now direct URLs are returned on upload.
router.get("/:filename", (req, res) => {
  return res.status(410).json({
    message:
      "Direct file retrieval is now handled via Cloudinary URLs returned at upload time.",
  });
});

// Handle multer errors cleanly (must be after routes)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "File too large. Max 5MB allowed." });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "Unsupported file type. Allowed: PDF, JPG, PNG, WEBP.",
      });
    }
    return res.status(400).json({ message: err.message });
  }
  return next(err);
});

module.exports = router;
