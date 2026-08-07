const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const path = require("path");

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
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

upload.s3Client = s3; // Attach s3 client so we can use it for presigned URLs elsewhere

module.exports = upload;
