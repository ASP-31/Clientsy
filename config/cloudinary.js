const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary using credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer storage engine for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Extract category from request body (appended before file in FormData)
    const category = req.body.category || 'other';
    
    // Map to plural folder names as specified: clientsy/invoices, clientsy/contracts, etc.
    let folderSuffix = 'others';
    if (['invoice', 'receipt', 'contract', 'proposal'].includes(category)) {
      folderSuffix = `${category}s`;
    } else if (category === 'other') {
      folderSuffix = 'others';
    } else {
      folderSuffix = `${category}s`;
    }

    // Generate unique name for the file
    const cleanName = file.originalname
      .split('.')[0]
      .replace(/[^a-zA-Z0-9]/g, '_');
    
    return {
      folder: `Clientsy/${folderSuffix}`,
      resource_type: 'auto',
      public_id: `${Date.now()}-${cleanName}`
    };
  }
});

// Enforce allowed file types (PDF, PNG, JPG, JPEG)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, PNG, JPG, and JPEG are allowed.'), false);
  }
};

// Configured multer instance
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limits
  },
  fileFilter
});

module.exports = {
  cloudinary,
  upload
};
