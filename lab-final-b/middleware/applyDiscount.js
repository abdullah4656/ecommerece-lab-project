// Reusable discount middleware
// Expects req.orderTotals.baseTotal to be set before running
// Looks for coupon code in req.body.coupon or req.query.coupon

module.exports = function applyDiscount(req, res, next) {
  try {
    const baseTotal =
      req.orderTotals && typeof req.orderTotals.baseTotal === 'number'
        ? req.orderTotals.baseTotal
        : 0;

    const coupon =
      (req.body && req.body.coupon) ||
      (req.query && req.query.coupon) ||
      null;

    let discount = 0;
    let finalTotal = baseTotal;

    if (coupon && coupon.toString().trim().toUpperCase() === 'SAVE10') {
      discount = baseTotal * 0.1;
      finalTotal = baseTotal - discount;
      req.appliedCoupon = 'SAVE10';
    }

    req.orderTotals = {
      ...(req.orderTotals || {}),
      baseTotal,
      discount,
      finalTotal
    };

    next();
  } catch (err) {
    console.error('Error applying discount:', err);
    next(err);
  }
};


