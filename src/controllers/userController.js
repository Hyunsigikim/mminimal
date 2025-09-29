const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
};

exports.showRegister = (req, res) => {
  res.render('register');
};

exports.showLogin = (req, res) => {
  res.render('login');
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      res.redirect('/boards');
    } else {
      res.status(401).send('Invalid credentials');
    }
  } catch (err) {
    res.status(400).send('Error logging in');
  }
};

exports.register = async (req, res, next) => {
  try {
    const { username, email, password, confirmPassword, position, address, permissionLevel } = req.body;

    // Validate required fields
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).send('All required fields must be filled');
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      return res.status(400).send('Passwords do not match');
    }

    // Check password strength
    if (password.length < 6) {
      return res.status(400).send('Password must be at least 6 characters long');
    }

    // Check if email is already taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send('Email already registered');
    }

    // Check if username is already taken
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).send('Username already taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with all fields
    const user = new User({
      username,
      email,
      password: hashedPassword,
      position: position || 'Member',
      address: address || '',
      permissionLevel: permissionLevel || 'Member'
    });

    await user.save();
    console.log('User registered successfully:', username);

    res.redirect('/login?message=Registration successful! Please login.');
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(400).send('Error registering user: ' + err.message);
  }
};

exports.showProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.render('profile', { user });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).send('Error fetching profile');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, email, position, address, permissionLevel } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).send('Email already taken');
      }
    }

    // Check if username is already taken by another user
    if (username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).send('Username already taken');
      }
    }

    // Update all fields
    user.username = username;
    user.email = email;
    user.position = position || user.position;
    user.address = address || user.address;
    user.permissionLevel = permissionLevel || user.permissionLevel;

    await user.save();
    console.log('Profile updated successfully for user:', username);

    res.redirect('/profile?message=Profile updated successfully!');
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(400).send('Error updating profile: ' + err.message);
  }
};

// Fix missing usernames for existing users
exports.fixUsernames = async (req, res) => {
  try {
    const usersWithoutUsername = await User.find({ username: { $exists: false } });
    let fixedCount = 0;

    for (const user of usersWithoutUsername) {
      // Generate a default username based on email or use a counter
      const baseUsername = user.email.split('@')[0];
      let username = baseUsername;
      let counter = 1;

      // Make sure username is unique
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user.username = username;
      await user.save();
      fixedCount++;
    }

    res.json({ message: `Fixed ${fixedCount} users with missing usernames` });
  } catch (err) {
    console.error('Error fixing usernames:', err);
    res.status(500).json({ error: 'Error fixing usernames' });
  }
};
