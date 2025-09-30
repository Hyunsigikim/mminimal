const express = require('express');
const multer = require('multer');
const path = require('path');

const userController = require('../controllers/userController');
const boardController = require('../controllers/boardController');
const postController = require('../controllers/postController');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../../uploads') });

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
router.get('/boards/:boardId/posts', postController.getPosts); // 게시글 목록 (파라미터 방식 유지)
// 새 글 작성 페이지 (TinyMCE 에디터)
router.get('/boards/:boardId/posts/new', postController.showNewPost); // 파라미터 방식
router.get('/boards/posts/new', postController.showNewPost); // 쿼리스트링 방식 (?boardId=...)

// Accept both multiple images ('images') and legacy single image ('image')
router.post(
  '/boards/:boardId/posts',
  upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'image', maxCount: 1 }
  ]),
  postController.createPost
);

// 빠른 게시글 생성 (board 페이지 유지용)
router.post(
  '/boards/:boardId/posts/quick',
  upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'image', maxCount: 1 }
  ]),
  postController.quickCreatePost
);

router.get('/boards/posts/edit', postController.showEditPost); // 쿼리스트링 방식
router.post('/boards/posts/edit',
  upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'image', maxCount: 1 }
  ]),
  postController.updatePost
);
router.post('/boards/posts/delete', postController.deletePost);

// TinyMCE 이미지 업로드 엔드포인트 (필드명: file)
router.post('/editor/upload-image', upload.single('file'), postController.uploadEditorImage);

// 댓글 라우트
router.get('/posts/:postId/comments', postController.getComments); // 기존 파라미터 방식 유지
router.post('/posts/:postId/comments', postController.createComment);

// 보드 메타 정보 업데이트 (작성자/관리자)
router.post('/boards/:boardId/meta', boardController.updateBoardMeta);
// 보드 삭제 (작성자/관리자)
router.post('/boards/:boardId/delete', boardController.deleteBoard);

module.exports = router;
