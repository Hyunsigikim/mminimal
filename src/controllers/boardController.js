const Board = require('../models/Board');
const User = require('../models/User');

exports.getBoards = async (req, res) => {
<<<<<<< HEAD
  const boards = await Board.find();
  res.render('boards', { boards });
=======
  try {
    const boards = await Board.find();

    // Get current user's location if logged in
    let currentUserLocation = null;
    if (req.session?.userId) {
      const user = await User.findById(req.session.userId).select('latitude longitude');
      if (user && user.latitude !== null && user.longitude !== null) {
        currentUserLocation = {
          latitude: user.latitude,
          longitude: user.longitude
        };
      }
    }

    res.render('boards', {
      boards,
      currentUserLocation
    });
  } catch (err) {
    console.error('Error fetching boards:', err);
    res.status(500).send('Error fetching boards');
  }
>>>>>>> 0e776da (변경사항 반영)
};

// Delete a board (author or admin), along with its posts and comments
exports.deleteBoard = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).send('Unauthorized');
    }
    const boardId = req.params.boardId;
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).send('Board not found');

    const me = await User.findById(req.session.userId).select('permissionLevel');
    const isAdmin = me && me.permissionLevel === 'Admin';
    const isOwner = board.authorId && String(board.authorId) === String(req.session.userId);
    if (!isOwner && !isAdmin) {
      return res.status(403).send('Forbidden');
    }

    const Post = require('../models/Post');
    const Comment = require('../models/Comment');
    const posts = await Post.find({ boardId });
    const postIds = posts.map(p => p._id);
    if (postIds.length) {
      await Comment.deleteMany({ postId: { $in: postIds } });
      await Post.deleteMany({ _id: { $in: postIds } });
    }
    await Board.deleteOne({ _id: board._id });
    return res.redirect('/boards');
  } catch (err) {
    console.error('Error deleting board:', err);
    return res.status(400).send('Error deleting board');
  }
};

// Update board meta information (author or admin only)
exports.updateBoardMeta = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).send('Unauthorized');
    }

    const boardId = req.params.boardId;
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).send('Board not found');

    // Permission: board author or Admin
    const me = await User.findById(req.session.userId).select('permissionLevel');
    const isAdmin = me && me.permissionLevel === 'Admin';
    const isOwner = board.authorId && String(board.authorId) === String(req.session.userId);
    if (!isOwner && !isAdmin) {
      return res.status(403).send('Forbidden');
    }

    const { name, address, memo, siteType, siteStatus, tags, latitude, longitude } = req.body;

    // Allowed statuses
    const allowedStatuses = ['숨김', '정상', '공사 중', '예정', '중단', '보류'];
    if (typeof name === 'string' && name.trim()) board.name = name.trim();
    if (typeof address === 'string') board.address = address;
    if (typeof memo === 'string') board.memo = memo;
    if (typeof siteType === 'string') board.siteType = siteType;
    if (typeof siteStatus === 'string' && allowedStatuses.includes(siteStatus)) board.siteStatus = siteStatus;
    // optional: update coordinates if provided
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (!Number.isNaN(latNum)) board.latitude = latNum;
    if (!Number.isNaN(lngNum)) board.longitude = lngNum;

    // Parse tags
    if (typeof tags === 'string') {
      board.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      board.tags = tags.map(t => String(t).trim()).filter(Boolean);
    }

    await board.save();
    // Redirect back to posts list for this board
    return res.redirect(`/boards/${board._id}/posts`);
  } catch (err) {
    console.error('Error updating board meta:', err);
    return res.status(400).send('Error updating board');
  }
};

exports.createBoard = async (req, res) => {
  try {
    const {
      name,
      description,
      latitude,
      longitude,
      address,
      memo,
      siteType,
      siteStatus,
      tags
    } = req.body;
    console.log('createBoard incoming body:', {
      name, description, latitude, longitude, address, memo, siteType, siteStatus, tags,
      userId: req.session?.userId
    });

    // Parse tags (comma-separated -> array of trimmed strings)
    let parsedTags = [];
    if (typeof tags === 'string' && tags.trim().length > 0) {
      parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      parsedTags = tags.map(t => String(t).trim()).filter(Boolean);
    }

    // Validate siteStatus
    const allowedStatuses = ['숨김', '정상', '공사 중', '예정', '중단'];
    const finalStatus = allowedStatuses.includes(siteStatus) ? siteStatus : '정상';

    const board = new Board({
      name,
      description,
      latitude: parseFloat(latitude) || 0,
      longitude: parseFloat(longitude) || 0,
      address,
      memo,
      siteType,
      siteStatus: finalStatus,
      tags: parsedTags,
      authorId: req.session?.userId || undefined
    });
    await board.save();
    console.log('createBoard saved document:', {
      id: board._id,
      name: board.name,
      authorId: board.authorId,
      createdAt: board.createdAt,
      lat: board.latitude,
      lng: board.longitude,
      address: board.address,
      memo: board.memo,
      siteType: board.siteType,
      siteStatus: board.siteStatus,
      tags: board.tags
    });
    res.redirect('/boards');
  } catch (err) {
    console.error('Error creating board:', err);
    res.status(400).send('Error creating board');
  }
};
