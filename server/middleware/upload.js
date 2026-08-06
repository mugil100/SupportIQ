const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        // Sanitise original filename — strip path traversal chars
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, Date.now() + "-" + safeName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

    const ext = path.extname(file.originalname).toLowerCase();
    const mimeMatch = allowedMimeTypes.includes(file.mimetype);
    const extMatch = allowedExtensions.includes(ext);

    if (mimeMatch && extMatch) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed."));
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5mb
    fileFilter
});

module.exports = upload;
