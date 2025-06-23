import multer from "multer";
import path from "path";
import fs from "fs";
const uploadDir = "uploads/";


if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const allowedMimeTypes = [
    "image/jpeg", "image/png", "image/gif",
    "video/mp4", "video/quicktime",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error("Unsupported file type"), false);
  } else {
    cb(null, true);
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  }
});
