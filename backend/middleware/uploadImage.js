import multer from 'multer';
import { ApiError } from '../utils/apiError.js';

const storage = multer.memoryStorage();

const mediaFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/',
    'audio/',
    'video/'
  ];
  
  const isAllowed = allowedMimeTypes.some(type => file.mimetype.startsWith(type));
  
  if (!isAllowed) {
    return cb(ApiError.badRequest('Only image, audio, and video uploads are allowed'), false);
  }
  cb(null, true);
};

export const uploadSingleImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: mediaFileFilter
}).single('image');

export const uploadMultipleImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: mediaFileFilter
}).array('images', 10);

export const uploadSingleMedia = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for audio/video
  fileFilter: mediaFileFilter
}).single('media');

export const uploadMultipleMedia = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for audio/video
  fileFilter: mediaFileFilter
}).array('media', 10);


