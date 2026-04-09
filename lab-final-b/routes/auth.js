const express = require('express');
const User = require('../models/User');

const router = express.Router();

router.get('/signin', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }

  res.render('signin', {
    title: 'Sign In | ScoopCraft',
    error: ''
  });
});

router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').trim().toLowerCase() });

    if (!user || !User.verifyPassword(password || '', user.passwordHash)) {
      return res.status(401).render('signin', {
        title: 'Sign In | ScoopCraft',
        error: 'Invalid email or password.'
      });
    }

    if (user.status !== 'Active') {
      return res.status(403).render('signin', {
        title: 'Sign In | ScoopCraft',
        error: 'Your account is inactive. Please contact support.'
      });
    }

    req.session.userId = user._id.toString();
    req.session.userRole = user.role;
    req.session.currentUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.redirect(user.role === 'Admin' || user.role === 'Manager' ? '/admin' : '/');
  } catch (error) {
    console.error('Error during user sign in:', error);
    res.status(500).render('signin', {
      title: 'Sign In | ScoopCraft',
      error: 'Failed to sign in. Please try again.'
    });
  }
});

router.get('/signup', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/');
  }

  res.render('signup', {
    title: 'Sign Up | ScoopCraft',
    error: ''
  });
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone, address } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).render('signup', {
        title: 'Sign Up | ScoopCraft',
        error: 'All fields are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).render('signup', {
        title: 'Sign Up | ScoopCraft',
        error: 'Password must be at least 6 characters long.'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render('signup', {
        title: 'Sign Up | ScoopCraft',
        error: 'Passwords do not match.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).render('signup', {
        title: 'Sign Up | ScoopCraft',
        error: 'Email already registered. Please sign in.'
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: User.hashPassword(password),
      role: 'Customer',
      status: 'Active',
      phone: (phone || '').trim(),
      address: (address || '').trim()
    });

    req.session.userId = user._id.toString();
    req.session.userRole = user.role;
    req.session.currentUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.redirect('/');
  } catch (error) {
    console.error('Error during user sign up:', error);
    res.status(500).render('signup', {
      title: 'Sign Up | ScoopCraft',
      error: 'Failed to create account. Please try again.'
    });
  }
});

router.post('/signout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/signin');
  });
});

module.exports = router;