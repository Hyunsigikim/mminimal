const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

// Ensure upload directory exists
const ensureUploadDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
};

// Configure multer storage
const getStorage = (boardId) => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const targetBoardId = boardId || 'default';
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        // Create directory path: data/boards/{boardId}/{year}{month}{day}
        const uploadDir = path.join(
          process.cwd(), // 프로젝트 루트 디렉토리 기준
          'data',
          'boards',
          targetBoardId,
          `${year}${month}${day}`
        );
        
        console.log('Creating upload directory:', uploadDir);
        await ensureUploadDir(uploadDir);
        console.log('Directory created successfully');
        
        cb(null, uploadDir);
      } catch (err) {
        console.error('Error creating upload directory:', err);
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const date = new Date();
      const dateStr = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
      ].join('');
      
      const timeStr = [
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
      ].map(n => String(n).padStart(2, '0')).join('');
      
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${dateStr}${timeStr}_${randomStr}${ext}`;
      
      cb(null, filename);
    }
  });
};

// Create multer upload middleware
const createUploader = (boardId) => {
  // boardId가 없으면 기본값 사용
  const targetBoardId = boardId || 'default';
  console.log('Creating uploader for board:', targetBoardId);
  
  return multer({
    storage: getStorage(targetBoardId),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images are allowed.'));
      }
    }
  });
};

// Get web-accessible URL for a file
const getFileUrl = (req, filePath) => {
  if (!filePath) return null;
  
  // Convert absolute path to web-accessible URL
  const relativePath = path.relative(
    path.join(__dirname, '../../data'),
    filePath
  ).replace(/\\/g, '/');
  
  return `/data/${relativePath}`;
};

module.exports = {
  createUploader,
  getFileUrl
};
