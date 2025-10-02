const express = require('express');
const path = require('path');
const { createUploader } = require('../utils/fileUpload');

const userController = require('../controllers/userController');
const boardController = require('../controllers/boardController');
const postController = require('../controllers/postController');

const router = express.Router();

// Create a default uploader for routes that don't have a boardId yet
const defaultUpload = createUploader('temp');

// Middleware to handle file uploads with board-based storage
const handleFileUpload = (req, res, next) => {
  // Check for boardId in URL params, then in request body, or use 'default'
  const boardId = req.params.boardId || req.body.boardId || 'default';
  const uploader = createUploader(boardId);
  
  // Handle both single and multiple file uploads
  const uploadFields = uploader.fields([
    { name: 'images', maxCount: 20 },
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 }
  ]);
  
  uploadFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// 사용자 라우트
router.get('/login', userController.showLogin);
router.post('/login', userController.login);
router.get('/register', userController.showRegister);
router.post('/register', userController.register);
router.get('/logout', userController.logout);

// 사용자 프로필 라우트
router.get('/profile', userController.showProfile);
router.post('/profile', userController.updateProfile);

// 관리자 기능: 닉네임 없는 사용자들 수정
router.post('/admin/fix-usernames', userController.fixUsernames);
// 게시판 라우트
router.get('/boards', boardController.getBoards);
router.get('/boards/new', boardController.showNewBoard);
router.post('/boards', boardController.createBoard);

// 게시글 라우트
router.get('/boards/:boardId/posts', postController.getPosts);

// 새 글 작성 페이지 (TinyMCE 에디터)
router.get('/boards/:boardId/posts/new', postController.showNewPost);
router.get('/boards/posts/new', postController.showNewPost);

// 게시글 생성 및 수정 라우트 (파일 업로드 포함)
router.post('/boards/:boardId/posts', handleFileUpload, postController.createPost);
router.post('/boards/:boardId/posts/quick', handleFileUpload, postController.quickCreatePost);
router.post('/boards/posts/edit', handleFileUpload, postController.updatePost);

// 게시글 관리 라우트
router.get('/boards/posts/edit', postController.showEditPost);
router.post('/boards/posts/delete', postController.deletePost);

// TinyMCE 이미지 업로드 엔드포인트 (보드 ID를 URL 파라미터로 받음)
router.post('/boards/:boardId/editor/upload-image', (req, res, next) => {
  const boardId = req.params.boardId || 'default';
  console.log('Uploading image for board:', boardId);
  
  const uploader = createUploader(boardId);
  uploader.single('file')(req, res, (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, postController.uploadEditorImage);

// 댓글 라우트
router.get('/posts/:postId/comments', postController.getComments); // 기존 파라미터 방식 유지
router.post('/posts/:postId/comments', postController.createComment);

// 보드 메타 정보 업데이트 (작성자/관리자)
router.post('/boards/:boardId/meta', boardController.updateBoardMeta);
// 보드 삭제 (작성자/관리자)
router.post('/boards/:boardId/delete', boardController.deleteBoard);

module.exports = router;
