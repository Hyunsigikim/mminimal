const Post = require('../models/Post');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const User = require('../models/User');
const Board = require('../models/Board');

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
<<<<<<< HEAD
    // Fetch board info for header/empty state context
    const board = await Board.findById(boardId).lean();
    const posts = await Post.find({ boardId })
      .populate('authorId', 'username')
      .sort({ createdAt: -1 });

    console.log('Found posts:', posts.length);
    posts.forEach((post, index) => {
      console.log(`Post ${index + 1}:`, {
        id: post._id,
        title: post.title,
        authorId: post.authorId,
        authorUsername: post.authorId ? post.authorId.username : 'No authorId'
      });
=======

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
>>>>>>> 0e776da (변경사항 반영)
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

<<<<<<< HEAD
    console.log('Rendering posts template with data');
    res.render('posts', { posts: postsWithComments, boardId, board, userId: currentUserId, isAdmin, currentUser });
=======
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
>>>>>>> 0e776da (변경사항 반영)
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).send('Error fetching posts: ' + err.message);
  }
};

<<<<<<< HEAD
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

=======
>>>>>>> 0e776da (변경사항 반영)
// 게시글 생성 처리
exports.createPost = async (req, res) => {
  try {
    const boardId = getBoardId(req);
    const { title } = req.body;
    let { content } = req.body;
    // Support multiple files via multer.fields: req.files is an object map
    let images = [];
    if (req.files && typeof req.files === 'object') {
      if (Array.isArray(req.files.images)) {
        images = req.files.images.map(f => `/uploads/${f.filename}`);
      }
      // Legacy single field `'image'` may also be present via fields()
      if (!images.length && Array.isArray(req.files.image) && req.files.image.length > 0) {
        images = req.files.image.map(f => `/uploads/${f.filename}`);
      }
    }
    // Backward compatibility: single file via req.file (when using upload.single)
    const imageUrl = (!images.length && req.file) ? `/uploads/${req.file.filename}` : null;

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
    return res.redirect(`/posts/${post._id}/comments`);
  } catch (err) {
    console.error('Error creating post:', err);
    return res.status(400).send('Error creating post: ' + err.message);
  }
};

<<<<<<< HEAD
=======
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
    const boardId = getBoardId(req);
    const { title } = req.body;
    let { content } = req.body;

    // Support multiple files via multer.fields: req.files is an object map
    let images = [];
    if (req.files && typeof req.files === 'object') {
      if (Array.isArray(req.files.images)) {
        images = req.files.images.map(f => `/uploads/${f.filename}`);
      }
      // Legacy single field `'image'` may also be present via fields()
      if (!images.length && Array.isArray(req.files.image) && req.files.image.length > 0) {
        images = req.files.image.map(f => `/uploads/${f.filename}`);
      }
    }
    // Backward compatibility: single file via req.file (when using upload.single)
    const imageUrl = (!images.length && req.file) ? `/uploads/${req.file.filename}` : null;

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

    // 빠른 생성의 경우 board 페이지로 리다이렉션 (쿼리 파라미터로 성공 표시)
    return res.redirect(`/boards/${boardId}/posts?created=true`);
  } catch (err) {
    console.error('Error creating quick post:', err);
    return res.status(400).send('Error creating post: ' + err.message);
  }
};

>>>>>>> 0e776da (변경사항 반영)
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
      deleteImages.forEach(index => {
        const idx = parseInt(index);
        if (!isNaN(idx) && idx >= 0 && idx < post.images.length) {
          const deletedImage = post.images.splice(idx, 1);
          console.log('Deleted image:', deletedImage);
          hasChanges = true;
        }
      });
    }

    // Handle new image uploads
    let newImages = [];
    if (req.files && typeof req.files === 'object') {
      if (Array.isArray(req.files.images)) {
        newImages = req.files.images.map(f => `/uploads/${f.filename}`);
      }
      // Legacy single field `'image'` may also be present via fields()
      if (!newImages.length && Array.isArray(req.files.image) && req.files.image.length > 0) {
        newImages = req.files.image.map(f => `/uploads/${f.filename}`);
      }
    }

    if (newImages.length > 0) {
      post.images.push(...newImages);
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

// TinyMCE 이미지 업로드 핸들러
exports.uploadEditorImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const location = `/uploads/${req.file.filename}`;
    // TinyMCE는 { location: 'url' } 형식을 기대함
    return res.json({ location });
  } catch (err) {
    console.error('Error uploading image:', err);
    return res.status(500).json({ error: 'Image upload failed' });
  }
};
