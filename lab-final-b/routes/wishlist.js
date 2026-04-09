const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

function wantsJson(req) {
  const accept = req.headers.accept || '';
  return req.xhr || accept.includes('application/json');
}

function redirectBack(req, res) {
  const back = req.get('referer');
  if (back && /^https?:\/\//i.test(back)) {
    return res.redirect(back);
  }
  return res.redirect('/wishlist');
}

router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('wishlist.product').lean();
    const wishlistItems = (user?.wishlist || []).filter(item => item.product);

    res.render('wishlist', {
      title: 'My Wishlist | ScoopCraft',
      wishlistItems
    });
  } catch (error) {
    console.error('Error loading wishlist:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/status/:productId', async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isWishlisted = (user.wishlist || []).some(
      item => item.product && item.product.toString() === req.params.productId
    );

    return res.json({ success: true, isWishlisted });
  } catch (error) {
    console.error('Error checking wishlist status:', error);
    return res.status(500).json({ success: false, error: 'Failed to check wishlist status' });
  }
});

router.post('/add/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      if (wantsJson(req)) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      return redirectBack(req, res);
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      if (wantsJson(req)) {
        return res.status(401).json({ success: false, error: 'Please sign in again.' });
      }
      return res.redirect('/auth/signin');
    }

    const alreadyExists = user.wishlist.some(item => item.product && item.product.toString() === req.params.productId);
    let added = false;
    if (!alreadyExists) {
      user.wishlist.push({ product: product._id });
      await user.save();
      added = true;
    }

    if (wantsJson(req)) {
      return res.json({ success: true, count: user.wishlist.length, isWishlisted: true, added });
    }
    return redirectBack(req, res);
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    if (wantsJson(req)) {
      return res.status(500).json({ success: false, error: 'Failed to add to wishlist' });
    }
    return redirectBack(req, res);
  }
});

router.post('/toggle/:productId', async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      if (wantsJson(req)) {
        return res.status(401).json({ success: false, error: 'Please sign in again.' });
      }
      return res.redirect('/auth/signin');
    }

    const product = await Product.findById(req.params.productId);
    if (!product) {
      if (wantsJson(req)) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      return redirectBack(req, res);
    }

    const exists = user.wishlist.some(item => item.product && item.product.toString() === req.params.productId);
    if (exists) {
      user.wishlist = user.wishlist.filter(item => item.product && item.product.toString() !== req.params.productId);
    } else {
      user.wishlist.push({ product: product._id });
    }

    await user.save();
    const isWishlisted = !exists;

    if (wantsJson(req)) {
      return res.json({ success: true, isWishlisted, count: user.wishlist.length });
    }
    return redirectBack(req, res);
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    if (wantsJson(req)) {
      return res.status(500).json({ success: false, error: 'Failed to update wishlist' });
    }
    return redirectBack(req, res);
  }
});

router.post('/remove/:productId', async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      if (wantsJson(req)) {
        return res.status(401).json({ success: false, error: 'Please sign in again.' });
      }
      return res.redirect('/auth/signin');
    }

    user.wishlist = user.wishlist.filter(item => item.product && item.product.toString() !== req.params.productId);
    await user.save();

    if (wantsJson(req)) {
      return res.json({ success: true, count: user.wishlist.length, isWishlisted: false });
    }
    return redirectBack(req, res);
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    if (wantsJson(req)) {
      return res.status(500).json({ success: false, error: 'Failed to remove from wishlist' });
    }
    return redirectBack(req, res);
  }
});

module.exports = router;