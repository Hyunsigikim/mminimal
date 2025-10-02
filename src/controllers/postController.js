const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Board = require('../models/Board');
const User = require('../models/User');

// Constants
const UPLOAD_PATH = path.join(__dirname, '../../uploads');

// Resolve ids from params, query, or body to support both styles
function getBoardId(req) {
  return req.params?.boardId || req.query?.boardId || req.body?.boardId;
}
function getPostId(req) {
  return req.params?.postId || req.query?.postId || req.body?.postId;
}

exports.getPosts = async (req, res) => {
  try {
    const boardId = getBoardId(req);
    console.log('getPosts called for boardId:', boardId);

    // 쿼리 파라미터 추출
    const page = parseInt(req.query.page) || 1;
    const limit = 8; // 무조건 8개로 고정
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // 검색 조건 설정
    let searchQuery = { boardId };
    if (search) {
      searchQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch board info for header/empty state context
    const board = await Board.findById(boardId).lean();

    // 포스트 조회 (페이지네이션 적용)
    const posts = await Post.find(searchQuery)
      .populate('authorId', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log('Found posts:', posts.length, 'for page:', page, 'with limit:', limit, 'skip:', skip);
    console.log('Search query:', JSON.stringify(searchQuery));
    console.log('Total posts in DB for this board:', await Post.countDocuments({ boardId }));

    // 전체 포스트 수 조회 (페이지네이션 정보용)
    const totalPosts = await Post.countDocuments({ boardId });
    const totalPages = Math.ceil(totalPosts / limit);

    console.log('Pagination debug:', {
      totalPosts,
      limit,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });

    const postsWithComments = await Promise.all(
      posts.map(async (post) => {
        const oldestComments = await Comment.find({ postId: post._id })
          .populate('authorId', 'username')
          .sort({ createdAt: 1 })
          .limit(4);

        console.log(`Post ${post.title} has ${oldestComments.length} comments`);
        oldestComments.forEach((comment, cIndex) => {
          console.log(`  Comment ${cIndex + 1}: ${comment.authorId ? comment.authorId.username : 'No author'}`);
        });

        return { ...post.toObject(), recentComments: oldestComments };
      })
    );

    const currentUserId = req.session.userId || null;
    let isAdmin = false;
    let currentUser = null;
    if (currentUserId) {
      currentUser = await User.findById(currentUserId).select('username');
      const me = await User.findById(currentUserId).select('permissionLevel');
      isAdmin = me && me.permissionLevel === 'Admin';
    }

    console.log('Rendering posts template with pagination data');
    res.render('posts', {
      posts: postsWithComments,
      boardId,
      board,
      userId: currentUserId,
      isAdmin,
      currentUser,
      // 페이지네이션 정보
      currentPage: page,
      totalPages: totalPages,
      totalPosts: totalPosts,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      // 검색 정보
      search: search,
      limit: limit
    });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).send('Error fetching posts: ' + err.message);
  }
};

// 게시글 생성 처리
exports.createPost = async (req, res) => {
  try {
    const boardId = getBoardId(req) || 'default';
    const { title, content } = req.body;
    const { getFileUrl } = require('../utils/fileUpload');
    
    // Process uploaded files
    let images = [];
    if (req.files) {
      // Handle multiple images
      if (req.files.images && Array.isArray(req.files.images)) {
        images = req.files.images.map(file => getFileUrl(req, file.path));
      }
      // Handle single image (legacy support)
      if (req.files.image && Array.isArray(req.files.image) && req.files.image.length > 0) {
        images = [...images, getFileUrl(req, req.files.image[0].path)];
      }
      // Handle single file (from TinyMCE)
      if (req.files.file && Array.isArray(req.files.file) && req.files.file.length > 0) {
        images = [...images, getFileUrl(req, req.files.file[0].path)];
      }
    }
    
    // Use first image as the main image for backward compatibility
    const imageUrl = images.length > 0 ? images[0] : null;

    // Do not auto-append images into content; views will render a dedicated gallery

    if (!req.session.userId) {
      return res.status(401).send('User not logged in');
    }

    const user = await User.findById(req.session.userId).select('username');
    if (!user) return res.status(404).send('User not found');

    const post = new Post({
      title,
      content,
      boardId,
      authorId: req.session.userId,
      imageUrl,
      images
    });

    await post.save();
    
    // Update the board's modifiedAt timestamp
    await Board.findByIdAndUpdate(boardId, { 
      $set: { modifiedAt: new Date() } 
    });
    
    return res.redirect(`/posts/${post._id}/comments`);
  } catch (err) {
    console.error('Error creating post:', err);
    return res.status(400).send('Error creating post: ' + err.message);
  }
};

// 새 글 작성 페이지 (TinyMCE 에디터)
exports.showNewPost = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/login');
    }
    const boardId = getBoardId(req);
    return res.render('post_new', { boardId });
  } catch (err) {
    console.error('Error showing new post editor:', err);
    return res.status(500).send('Error showing editor');
  }
};

// 빠른 게시글 생성 (board 페이지 유지)
exports.quickCreatePost = async (req, res) => {
  try {
    console.log('=== QUICK CREATE POST DEBUG ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    console.log('Request body keys:', Object.keys(req.body));
    
    const boardId = getBoardId(req);
    console.log('Board ID from request:', boardId);
    
    if (!boardId) {
      console.error('Error: No boardId provided');
      return res.status(400).send('Board ID is required');
    }
    
    const { title, content } = req.body;
    console.log('Title length:', title?.length);
    console.log('Content length:', content?.length);
    
    const { getFileUrl } = require('../utils/fileUpload');
    
    // Process uploaded files
    let images = [];
    if (req.files) {
      console.log('Uploaded files:', Object.keys(req.files));
      // Handle multiple images
      if (req.files.images && Array.isArray(req.files.images)) {
        images = req.files.images.map(file => {
          const url = getFileUrl(req, file.path);
          console.log('Processed image URL:', url);
          return url;
        });
      }
      // Handle single image (legacy support)
      if (req.files.image && Array.isArray(req.files.image) && req.files.image.length > 0) {
        images = [...images, ...req.files.image.map(file => getFileUrl(req, file.path))];
      }
      // Handle single file (from TinyMCE)
      if (req.files.file && Array.isArray(req.files.file) && req.files.file.length > 0) {
        images = [...images, ...req.files.file.map(file => getFileUrl(req, file.path))];
      }
    }
    
    // Use first image as the main image for backward compatibility
    const imageUrl = images.length > 0 ? images[0] : null;

    if (!req.session.userId) {
      return res.status(401).send('User not logged in');
    }

    const user = await User.findById(req.session.userId).select('username');
    if (!user) return res.status(404).send('User not found');

    const post = new Post({
      title,
      content,
      boardId,
      authorId: req.session.userId,
      imageUrl,
      images
    });

    await post.save();

    // Update the board's modifiedAt timestamp
    await Board.findByIdAndUpdate(boardId, { 
      $set: { modifiedAt: new Date() } 
    });

    // 빠른 생성의 경우 board 페이지로 리다이렉션 (쿼리 파라미터로 성공 표시)
    return res.redirect(`/boards/${boardId}/posts?created=true`);
  } catch (err) {
    console.error('Error creating quick post:', err);
    return res.status(400).send('Error creating post: ' + err.message);
  }
};

// 게시글 수정 페이지 (create와 동일한 에디터 재사용)
exports.showEditPost = async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect('/login');
    const postId = getPostId(req);
    const post = await Post.findById(postId).populate('authorId', 'username');
    if (!post) return res.status(404).send('Post not found');

    const me = await User.findById(req.session.userId).select('permissionLevel');
    const isAdmin = me && me.permissionLevel === 'Admin';
    const isOwner = post.authorId && String(post.authorId._id) === String(req.session.userId);
    if (!isOwner && !isAdmin) return res.status(403).send('Forbidden');

    const boardId = getBoardId(req) || String(post.boardId);
    return res.render('post_new', { boardId, post });
  } catch (err) {
    console.error('Error showing edit page:', err);
    return res.status(500).send('Error showing edit page');
  }
};
exports.updatePost = async (req, res) => {
  try {
    console.log('=== UPDATE POST DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Request query:', req.query);
    console.log('Request params:', req.params);

    if (!req.session.userId) return res.status(401).send('Unauthorized');
    const postId = getPostId(req);
    console.log('Extracted postId:', postId);

    const post = await Post.findById(postId);
    if (!post) {
      console.log('Post not found with ID:', postId);
      return res.status(404).send('Post not found');
    }
    console.log('Found post:', post.title);

    // 권한 확인 (작성자 또는 Admin)
    const me = await User.findById(req.session.userId).select('permissionLevel');
    const isAdmin = me && me.permissionLevel === 'Admin';
    const isOwner = String(post.authorId) === String(req.session.userId);
    console.log('User permissions - isAdmin:', isAdmin, 'isOwner:', isOwner);

    if (!isOwner && !isAdmin) return res.status(403).send('Forbidden');

    const { title, content } = req.body;
    console.log('Updating with title:', title, 'content length:', content?.length);
    console.log('Full request body keys:', Object.keys(req.body));
    console.log('Content preview:', content?.substring ? content.substring(0, 100) : content);

    let hasChanges = false;
    if (typeof title === 'string' && title.trim() !== post.title) {
      post.title = title.trim();
      hasChanges = true;
      console.log('Title updated');
    }
    if (typeof content === 'string' && content !== post.content) {
      post.content = content;
      hasChanges = true;
      console.log('Content updated');
    }

    // Handle image deletion
    const deleteImages = req.body.deleteImages;
    if (deleteImages && Array.isArray(deleteImages)) {
      console.log('Images to delete:', deleteImages);
      const fs = require('fs').promises;
      const path = require('path');
      
      // Delete files from server
      for (const index of deleteImages) {
        const idx = parseInt(index);
        if (!isNaN(idx) && idx >= 0 && idx < post.images.length) {
          const imagePath = post.images[idx];
          try {
            // Convert URL back to filesystem path
            const relativePath = imagePath.replace(/^\/data\//, '');
            const fullPath = path.join(__dirname, '../../data', relativePath);
            await fs.unlink(fullPath);
            console.log('Deleted file:', fullPath);
          } catch (err) {
            console.error('Error deleting file:', err);
          }
          post.images.splice(idx, 1);
          hasChanges = true;
        }
      }
    }

    // Handle new image uploads
    const { getFileUrl } = require('../utils/fileUpload');
    let newImages = [];
    
    if (req.files) {
      // Handle multiple images
      if (req.files.images && Array.isArray(req.files.images)) {
        newImages = req.files.images.map(file => getFileUrl(req, file.path));
      }
      // Handle single image (legacy support)
      if (req.files.image && Array.isArray(req.files.image) && req.files.image.length > 0) {
        newImages = [...newImages, ...req.files.image.map(file => getFileUrl(req, file.path))];
      }
      // Handle single file (from TinyMCE)
      if (req.files.file && Array.isArray(req.files.file) && req.files.file.length > 0) {
        newImages = [...newImages, ...req.files.file.map(file => getFileUrl(req, file.path))];
      }
    }

    if (newImages.length > 0) {
      post.images = [...post.images, ...newImages];
      // Update imageUrl to the first image if it's not set
      if (!post.imageUrl || post.imageUrl === '') {
        post.imageUrl = newImages[0];
      }
      hasChanges = true;
      console.log('Added new images:', newImages.length);
    }

    if (hasChanges) {
      console.log('Attempting to save post to database...');
      console.log('Post before save:', {
        id: post._id,
        title: post.title,
        contentLength: post.content?.length || 0
      });

      try {
        await post.save();
        console.log('✅ Post saved successfully to database');

        // Verify the save worked
        const savedPost = await Post.findById(postId);
        console.log('Verification - saved post title:', savedPost.title);
        console.log('Verification - saved post content length:', savedPost.content?.length || 0);
      } catch (saveError) {
        console.error('❌ Database save failed:', saveError);
        throw saveError;
      }
    } else {
      console.log('No changes detected - skipping database save');
    }

    const boardId = getBoardId(req) || String(post.boardId);
    console.log('Redirecting to:', `/posts/${postId}/comments`);
    return res.redirect(`/posts/${postId}/comments`);
  } catch (err) {
    console.error('Error updating post:', err);
    return res.status(400).send('Error updating post');
  }
};

// 게시글 삭제 처리
exports.deletePost = async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).send('Unauthorized');
    const postId = getPostId(req);
    const post = await Post.findById(postId);
    if (!post) return res.status(404).send('Post not found');

    const me = await User.findById(req.session.userId).select('permissionLevel');
    const isAdmin = me && me.permissionLevel === 'Admin';
    const isOwner = String(post.authorId) === String(req.session.userId);
    if (!isOwner && !isAdmin) return res.status(403).send('Forbidden');

    await Comment.deleteMany({ postId: post._id });
    await Post.deleteOne({ _id: post._id });

    const boardId = getBoardId(req) || String(post.boardId);
    return res.redirect(`/boards/${boardId}/posts`);
  } catch (err) {
    console.error('Error deleting post:', err);
    return res.status(400).send('Error deleting post');
  }
};

exports.getComments = async (req, res) => {
  try {
    const postId = getPostId(req);
    const post = await Post.findById(postId).populate('authorId');
    if (!post) return res.status(404).send('Post not found');
    const comments = await Comment.find({ postId })
      .populate('authorId', 'username')
      .sort({ createdAt: 1 }); // 코멘트는 먼저 작성된 순서

    // 권한 확인 (작성자 또는 Admin)
    const currentUserId = req.session.userId || null;
    let isAdmin = false;
    let currentUser = null;
    if (currentUserId) {
      currentUser = await User.findById(currentUserId).select('username');
      const me = await User.findById(currentUserId).select('permissionLevel');
      isAdmin = me && me.permissionLevel === 'Admin';
    }

    return res.render('comments', {
      post,
      comments,
      postId,
      userId: currentUserId,
      isAdmin,
      currentUser
    });
  } catch (err) {
    console.error('Error fetching comments:', err);
    return res.status(500).send('Error fetching comments');
  }
};

exports.createComment = async (req, res) => {
  try {
    const { content } = req.body;
    console.log('createComment called with:', { content, postId: getPostId(req), userId: req.session.userId });

    if (!req.session.userId) {
      console.error('User not logged in');
      return res.status(401).send('User not logged in');
    }

    // 사용자 정보 확인
    const User = require('../models/User');
    const user = await User.findById(req.session.userId);
    console.log('Comment user found:', user ? user.username : 'No user found');

    if (!user) {
      console.error('User not found in database');
      return res.status(404).send('User not found');
    }

    const post = await Post.findById(getPostId(req));
    if (!post) {
      console.error('Post not found');
      return res.status(404).send('Post not found');
    }

    const comment = new Comment({
      content,
      postId: getPostId(req),
      authorId: req.session.userId // 세션의 userId를 ObjectId로 변환
    });

    await comment.save();
    console.log('Comment created successfully with authorId:', comment.authorId);

    // 저장된 코멘트 확인
    const savedComment = await Comment.findById(comment._id).populate('authorId', 'username');
    console.log('Saved comment author:', savedComment.authorId ? savedComment.authorId.username : 'No author');

    res.redirect(`/posts/${req.params.postId}/comments`);
  } catch (err) {
    console.error('Error creating comment:', err);
    res.status(400).send('Error creating comment: ' + err.message);
  }
};

// TinyMCE 에디터 이미지 업로드
exports.uploadEditorImage = async (req, res) => {
  try {
    console.log('=== UPLOAD EDITOR IMAGE DEBUG ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Request method:', req.method);
    console.log('Params:', req.params);
    console.log('Request file:', req.file);
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    console.log('File info:', file);

    // 파일이 저장된 경로 확인
    if (!file.path) {
      throw new Error('File path is missing');
    }

    // URL에서 boardId 추출
    const boardId = req.params.boardId || 'default';
    
    // 파일이 저장된 상대 경로 생성
    const filePath = file.path.replace(/\\/g, '/');
    const basePath = path.join('data', 'boards', boardId).replace(/\\/g, '/');
    
    // 웹에서 접근 가능한 URL 생성
    let imageUrl;
    if (filePath.includes(basePath)) {
      // 파일이 올바른 보드 디렉토리에 저장된 경우
      const relativePath = filePath.split('data/boards/').pop();
      imageUrl = `/data/boards/${relativePath}`;
    } else {
      // 파일이 다른 경로에 저장된 경우 (에러 상황)
      console.error('File saved in wrong directory:', filePath);
      const error = new Error(`File was not saved in the expected directory. Expected: ${basePath}, Actual: ${filePath}`);
      console.error(error);
      return res.status(500).json({ 
        error: 'File storage error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    console.log('Generated image URL:', imageUrl);
    
    // TinyMCE가 인식할 수 있도록 location 필드에 URL 반환
    res.json({
      location: imageUrl
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    return res.status(500).json({ 
      error: err.message || 'Image upload failed',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
