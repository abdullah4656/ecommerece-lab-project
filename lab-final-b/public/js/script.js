(function () {
  'use strict';

  if (typeof document === 'undefined') {
    return;
  }

  function setupFlavourLimiter(formId, tierName, flavourName, statusId, helpId, submitButtonId) {
    const form = document.getElementById(formId);
    if (!form) {
      return;
    }

    const tierInputs = Array.from(form.querySelectorAll(`input[name="${tierName}"]`));
    const flavourInputs = Array.from(form.querySelectorAll(`input[name="${flavourName}"]`));
    const status = document.getElementById(statusId);
    const help = document.getElementById(helpId);
    const submitButton = submitButtonId ? document.getElementById(submitButtonId) : null;

    function getTier() {
      const selectedTier = tierInputs.find((input) => input.checked);
      return selectedTier ? Number(selectedTier.value) : 3;
    }

    function getSelectedFlavours() {
      return flavourInputs.filter((input) => input.checked);
    }

    function updateBuilderState() {
      const tier = getTier();
      const selected = getSelectedFlavours();

      if (selected.length > tier) {
        const lastChecked = selected[selected.length - 1];
        if (lastChecked) {
          lastChecked.checked = false;
        }
      }

      const activeSelected = getSelectedFlavours();
      flavourInputs.forEach((input) => {
        const card = input.closest('.flavour-picker');
        if (card) {
          card.classList.toggle('active', input.checked);
        }

        input.disabled = !input.checked && activeSelected.length >= tier;
      });

      if (status) {
        status.textContent = `${activeSelected.length} of ${tier} selected`;
      }

      if (help) {
        help.textContent = `Pick exactly ${tier} flavours.`;
      }

      if (submitButton) {
        submitButton.disabled = activeSelected.length !== tier;
      }
    }

    tierInputs.forEach((input) => {
      input.addEventListener('change', updateBuilderState);
    });

    flavourInputs.forEach((input) => {
      input.addEventListener('change', updateBuilderState);
    });

    form.addEventListener('submit', function (event) {
      const tier = getTier();
      const selectedCount = getSelectedFlavours().length;
      if (selectedCount !== tier) {
        event.preventDefault();
      }
    });

    updateBuilderState();
  }

  function setupCustomAddToCartForm() {
    const form = document.getElementById('customAddToCartForm');
    if (!form) {
      return;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const productId = form.getAttribute('data-product-id');
      const quantity = 1;
      const scoopInput = form.querySelector('input[name="scoopCount"]:checked');
      const scoopCount = scoopInput ? Number(scoopInput.value) : 0;
      const selectedFlavours = Array.from(form.querySelectorAll('input[name="selectedFlavours"]:checked')).map((input) => input.value);
      addToCart(productId, quantity, selectedFlavours, scoopCount);
    });
  }

  function addToCart(productId, quantity, selectedFlavours, scoopCount) {
    const btn = document.getElementById('addToCartBtn');
    const messageDiv = document.getElementById('cartMessage');

    if (!productId) {
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Adding...';
    }

    fetch('/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId,
        quantity: quantity || 1,
        selectedFlavours: Array.isArray(selectedFlavours) ? selectedFlavours : [],
        scoopCount: scoopCount || 0
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (messageDiv) {
          messageDiv.style.display = 'block';
          messageDiv.textContent = data && data.success ? 'Added to cart.' : 'Could not add item.';
        }
      })
      .catch(() => {
        if (messageDiv) {
          messageDiv.style.display = 'block';
          messageDiv.textContent = 'Could not add item.';
        }
      })
      .finally(() => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Add To Cart';
        }
      });
  }

  function setWishlistButtonState(btn, isWishlisted) {
    if (!btn) {
      return;
    }

    btn.dataset.wishlisted = isWishlisted ? 'true' : 'false';
    btn.classList.toggle('active', isWishlisted);
    btn.textContent = isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist';
  }

  function addToWishlistCard(productId, trigger) {
    if (!productId || !trigger) {
      return;
    }

    trigger.disabled = true;
    trigger.textContent = 'Saving...';

    fetch(`/wishlist/add/${productId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((res) => {
        if (res.status === 401 || res.redirected) {
          window.location.href = '/auth/signin';
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data || !data.success) {
          trigger.textContent = 'Try Again';
          return;
        }

        trigger.classList.add('active');
        trigger.textContent = 'Wishlisted';
      })
      .catch(() => {
        trigger.textContent = 'Try Again';
      })
      .finally(() => {
        trigger.disabled = false;
      });
  }

  function setupWishlistCardForms() {
    const forms = Array.from(document.querySelectorAll('.wishlist-card-form'));
    forms.forEach((form) => {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const button = form.querySelector('.wishlist-card-btn');
        const productId = form.getAttribute('data-product-id');
        addToWishlistCard(productId, button);
      });
    });
  }

  function setupWishlistToggleForm() {
    const form = document.querySelector('.wishlist-toggle-form');
    if (!form) {
      return;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const productId = form.getAttribute('data-product-id');
      toggleWishlist(productId);
    });
  }

  function setupBuildYourBox() {
    const root = document.getElementById('buildYourBox');
    if (!root) {
      return;
    }

    const caseInputs = Array.from(root.querySelectorAll('input[name="caseSize"]'));
    const sizeCards = Array.from(root.querySelectorAll('.box-size-option'));
    const productCards = Array.from(root.querySelectorAll('[data-box-product]'));
    const planButtons = Array.from(root.querySelectorAll('.box-plan-btn'));
    const requiredCountEl = document.getElementById('boxRequiredCount');
    const caseSizeLabelEl = document.getElementById('boxCaseSizeLabel');
    const selectedCountEl = document.getElementById('boxSelectedCount');
    const remainingCountEl = document.getElementById('boxRemainingCount');
    const subtotalEl = document.getElementById('boxSubtotal');
    const estimatedTotalEl = document.getElementById('boxEstimatedTotal');
    const addBundleBtn = document.getElementById('boxAddBundleBtn');
    const feedbackEl = document.getElementById('boxFeedback');
    const configModal = document.getElementById('boxConfigModal');
    const modalProductName = document.getElementById('boxModalProductName');
    const baseOptionsEl = document.getElementById('boxBaseOptions');
    const flavourOptionsEl = document.getElementById('boxFlavourOptions');
    const flavourLimitLabel = document.getElementById('boxFlavourLimitLabel');
    const modalStatusEl = document.getElementById('boxModalStatus');
    const modalConfirmBtn = document.getElementById('boxModalConfirmBtn');
    const modalCloseButtons = Array.from(document.querySelectorAll('[data-box-close-modal]'));

    let planDiscount = 0;
    let isSubmitting = false;
    let activeCard = null;
    let activeSelection = { base: '', flavours: [] };
    const cardSelections = new Map();

    function getCardKey(card) {
      return card.getAttribute('data-product-id') || '';
    }

    function getProductFlavourOptions(card) {
      const raw = card.getAttribute('data-flavours') || '';
      return raw
        .split('|')
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    }

    function getAvailableBaseOptions(card) {
      const flavourOptions = getProductFlavourOptions(card);
      if (flavourOptions.length >= 3) {
        return flavourOptions.slice(0, 3);
      }
      if (flavourOptions.length) {
        return flavourOptions;
      }
      return ['Classic Vanilla', 'Chocolate Cream', 'Berry Cream'];
    }

    function getMaxFlavourByCase() {
      const size = getCaseSize();
      return Math.max(1, size - 1);
    }

    function getCaseSize() {
      const selected = caseInputs.find((input) => input.checked);
      return selected ? Number(selected.value) : 4;
    }

    function getQty(card) {
      const key = getCardKey(card);
      const entries = cardSelections.get(key) || [];
      return entries.length;
    }

    function setQty(card, nextQty) {
      const input = card.querySelector('[data-qty-input]');
      if (!input) {
        return;
      }

      input.value = String(Math.max(0, nextQty));
    }

    function syncQtyInputs() {
      productCards.forEach((card) => setQty(card, getQty(card)));
    }

    function getSelectedCount() {
      return productCards.reduce((sum, card) => sum + getQty(card), 0);
    }

    function getSubtotal() {
      return productCards.reduce((sum, card) => {
        const qty = getQty(card);
        const price = Number(card.getAttribute('data-price') || 0);
        return sum + (qty * price);
      }, 0);
    }

    function updateSizeStyles() {
      sizeCards.forEach((card) => {
        const input = card.querySelector('input[name="caseSize"]');
        card.classList.toggle('active', !!(input && input.checked));
      });
    }

    function updateQtyButtonState() {
      const required = getCaseSize();
      const selected = getSelectedCount();

      productCards.forEach((card) => {
        const qty = getQty(card);
        const decreaseBtn = card.querySelector('.box-qty-btn[data-action="decrease"]');
        const increaseBtn = card.querySelector('.box-qty-btn[data-action="increase"]');

        if (decreaseBtn) {
          decreaseBtn.disabled = qty <= 0 || isSubmitting;
        }

        if (increaseBtn) {
          increaseBtn.disabled = selected >= required || isSubmitting;
        }
      });

      syncQtyInputs();
    }

    function closeModal() {
      if (!configModal) {
        return;
      }
      configModal.classList.remove('open');
      configModal.setAttribute('aria-hidden', 'true');
      activeCard = null;
      activeSelection = { base: '', flavours: [] };
    }

    function renderModalSelectionState() {
      if (!baseOptionsEl || !flavourOptionsEl || !modalStatusEl || !modalConfirmBtn || !activeCard) {
        return;
      }

      const maxFlavours = getMaxFlavourByCase();
      const baseChecked = !!activeSelection.base;
      const flavourCount = activeSelection.flavours.length;

      Array.from(baseOptionsEl.querySelectorAll('input[type="radio"]')).forEach((input) => {
        input.checked = input.value === activeSelection.base;
      });

      Array.from(flavourOptionsEl.querySelectorAll('input[type="checkbox"]')).forEach((input) => {
        const checked = activeSelection.flavours.includes(input.value);
        input.checked = checked;
        input.disabled = !checked && flavourCount >= maxFlavours;
      });

      const ready = baseChecked && flavourCount > 0;
      modalConfirmBtn.disabled = !ready;
      modalStatusEl.textContent = ready
        ? `Ready: 1 base + ${flavourCount} flavour${flavourCount > 1 ? 's' : ''}.`
        : `Select 1 base and up to ${maxFlavours} flavours.`;
    }

    function openModalForCard(card) {
      if (!configModal || !baseOptionsEl || !flavourOptionsEl || !modalProductName || !flavourLimitLabel) {
        return;
      }

      activeCard = card;
      activeSelection = { base: '', flavours: [] };
      const flavourOptions = getProductFlavourOptions(card);
      const baseOptions = getAvailableBaseOptions(card);
      const maxFlavours = getMaxFlavourByCase();
      const productName = String(card.querySelector('h4') ? card.querySelector('h4').textContent : 'this product');

      modalProductName.textContent = `Configure ${productName}: choose 1 base and up to ${maxFlavours} flavour${maxFlavours > 1 ? 's' : ''}.`;
      flavourLimitLabel.textContent = `Choose Flavours (up to ${maxFlavours})`;

      baseOptionsEl.innerHTML = baseOptions
        .map((base, idx) => `<label class="box-option-pill"><input type="radio" name="boxBasePick" value="${escapeHtml(base)}" ${idx === 0 ? 'checked' : ''} /><span>${escapeHtml(base)}</span></label>`)
        .join('');

      activeSelection.base = baseOptions.length ? baseOptions[0] : '';

      const fallbackFlavours = flavourOptions.length ? flavourOptions : ['Caramel Crunch', 'Berry Swirl', 'Cookie Crumble', 'Pistachio Cream'];
      flavourOptionsEl.innerHTML = fallbackFlavours
        .map((flavour) => `<label class="box-option-pill"><input type="checkbox" value="${escapeHtml(flavour)}" /><span>${escapeHtml(flavour)}</span></label>`)
        .join('');

      renderModalSelectionState();
      configModal.classList.add('open');
      configModal.setAttribute('aria-hidden', 'false');
    }

    function renderSummary() {
      const required = getCaseSize();
      const selected = getSelectedCount();
      const remaining = Math.max(0, required - selected);
      const subtotal = getSubtotal();
      const estimatedTotal = subtotal * (1 - (planDiscount / 100));

      if (requiredCountEl) {
        requiredCountEl.textContent = String(required);
      }

      if (caseSizeLabelEl) {
        caseSizeLabelEl.textContent = `${required}-Pack`;
      }

      if (selectedCountEl) {
        selectedCountEl.textContent = String(selected);
      }

      if (remainingCountEl) {
        remainingCountEl.textContent = String(remaining);
      }

      if (subtotalEl) {
        subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
      }

      if (estimatedTotalEl) {
        estimatedTotalEl.textContent = `$${estimatedTotal.toFixed(2)}`;
      }

      if (addBundleBtn) {
        addBundleBtn.disabled = isSubmitting || selected === 0 || remaining !== 0;
      }

      if (feedbackEl) {
        if (selected === 0) {
          feedbackEl.textContent = 'Select products to start building your bundle.';
        } else if (remaining > 0) {
          feedbackEl.textContent = `Add ${remaining} more pint${remaining > 1 ? 's' : ''} to complete your ${required}-pack.`;
        } else {
          feedbackEl.textContent = 'Bundle ready. Add to cart now.';
        }
      }

      updateQtyButtonState();
      updateSizeStyles();
    }

    function handleQtyClick(event) {
      const btn = event.target.closest('.box-qty-btn');
      if (!btn || isSubmitting) {
        return;
      }

      const card = btn.closest('[data-box-product]');
      if (!card) {
        return;
      }

      const action = btn.getAttribute('data-action');
      const currentQty = getQty(card);
      const required = getCaseSize();
      const selected = getSelectedCount();

      if (action === 'decrease') {
        const key = getCardKey(card);
        const entries = cardSelections.get(key) || [];
        entries.pop();
        cardSelections.set(key, entries);
      }

      if (action === 'increase' && selected < required) {
        openModalForCard(card);
      }

      renderSummary();
    }

    function resetBundle() {
      cardSelections.clear();
      productCards.forEach((card) => setQty(card, 0));
      renderSummary();
    }

    function addBundleToCart() {
      const selectedItems = [];

      productCards.forEach((card) => {
        const key = getCardKey(card);
        const productId = card.getAttribute('data-product-id');
        const entries = cardSelections.get(key) || [];
        entries.forEach((entry) => {
          selectedItems.push({
            productId,
            quantity: 1,
            selectedFlavours: [`Base: ${entry.base}`].concat(entry.flavours.map((value) => `Flavor: ${value}`)),
            scoopCount: entry.flavours.length
          });
        });
      });

      if (!selectedItems.length) {
        return Promise.resolve();
      }

      const requests = selectedItems.map((item) =>
        fetch('/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity,
            selectedFlavours: item.selectedFlavours,
            scoopCount: item.scoopCount
          })
        }).then((res) => {
          if (!res.ok) {
            throw new Error('Cart add failed');
          }
          return res.json();
        })
      );

      return Promise.all(requests);
    }

    caseInputs.forEach((input) => {
      input.addEventListener('change', function () {
        resetBundle();
      });
    });

    planButtons.forEach((button) => {
      button.addEventListener('click', function () {
        if (isSubmitting) {
          return;
        }

        planButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        planDiscount = Number(button.getAttribute('data-discount') || 0);
        renderSummary();
      });
    });

    root.addEventListener('click', handleQtyClick);

    if (baseOptionsEl) {
      baseOptionsEl.addEventListener('change', function (event) {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }
        if (target.type === 'radio') {
          activeSelection.base = target.value;
          renderModalSelectionState();
        }
      });
    }

    if (flavourOptionsEl) {
      flavourOptionsEl.addEventListener('change', function (event) {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
          return;
        }

        const maxFlavours = getMaxFlavourByCase();
        if (target.checked) {
          if (activeSelection.flavours.length >= maxFlavours) {
            target.checked = false;
            return;
          }
          activeSelection.flavours.push(target.value);
        } else {
          activeSelection.flavours = activeSelection.flavours.filter((value) => value !== target.value);
        }

        renderModalSelectionState();
      });
    }

    modalCloseButtons.forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && configModal && configModal.classList.contains('open')) {
        closeModal();
      }
    });

    if (modalConfirmBtn) {
      modalConfirmBtn.addEventListener('click', function () {
        if (!activeCard || !activeSelection.base || !activeSelection.flavours.length) {
          return;
        }

        const key = getCardKey(activeCard);
        const entries = cardSelections.get(key) || [];
        entries.push({
          base: activeSelection.base,
          flavours: activeSelection.flavours.slice(0)
        });
        cardSelections.set(key, entries);
        closeModal();
        renderSummary();
      });
    }

    if (addBundleBtn) {
      addBundleBtn.addEventListener('click', function () {
        const required = getCaseSize();
        const selected = getSelectedCount();
        if (selected !== required || isSubmitting) {
          return;
        }

        isSubmitting = true;
        addBundleBtn.textContent = 'Adding Bundle...';
        renderSummary();

        addBundleToCart()
          .then(() => {
            if (feedbackEl) {
              feedbackEl.textContent = 'Bundle added to cart successfully. You can continue building or go to cart.';
            }
            resetBundle();
          })
          .catch(() => {
            if (feedbackEl) {
              feedbackEl.textContent = 'Could not add bundle right now. Please try again.';
            }
          })
          .finally(() => {
            isSubmitting = false;
            addBundleBtn.textContent = 'Add Bundle To Cart';
            renderSummary();
          });
      });
    }

    renderSummary();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


function setupChatbotWidget() {
  const toggle = document.getElementById('chatbotToggle');
  const panel = document.getElementById('chatbotPanel');
  const close = document.getElementById('chatbotClose');
  const form = document.getElementById('chatbotForm');
  const input = document.getElementById('chatbotInput');
  const body = document.getElementById('chatbotBody');
  const promptButtons = Array.from(document.querySelectorAll('.chatbot-prompt'));

  if (!toggle || !panel || !form || !input || !body) return;

  const state = {
    lastIntent: '',
    customerName: '',
    history: []
  };

  const intents = [
    {
      key: 'sizes',
      keywords: ['size', 'fit', 'measurement', 'length', 'width'],
      reply: 'We offer standard and custom sizes for all coats. You can check sizing charts on each product page or request a personalized measurement.'
    },
    {
      key: 'personalization',
      keywords: ['custom', 'personalize', 'monogram', 'embroidery', 'design'],
      reply: 'You can personalize coats with initials, embroidery, or special fabric choices. Select "Customize" on the product page to start.'
    },
    {
      key: 'shipping',
      keywords: ['shipping', 'delivery', 'arrive', 'dispatch', 'time'],
      reply: 'We dispatch orders within 2-4 business days. Shipping options and estimated delivery times are shown at checkout.'
    },
    {
      key: 'returns',
      keywords: ['return', 'exchange', 'refund', 'policy', 'wrong size'],
      reply: 'Our return and exchange policy allows returns within 14 days of delivery. Personalized items may have specific restrictions.'
    },
    {
      key: 'pricing',
      keywords: ['price', 'cost', 'expensive', 'cheap', 'how much'],
      reply: 'Prices vary based on coat style, fabric, and personalization. Each product page shows the exact price before adding to cart.'
    },
    {
      key: 'cart_checkout',
      keywords: ['cart', 'checkout', 'payment', 'coupon', 'discount'],
      reply: 'Review your selected items in the cart. Proceed to checkout to confirm shipping, personalization, and optional discounts.'
    },
    {
      key: 'order_tracking',
      keywords: ['order', 'track', 'status', 'history', 'my orders'],
      reply: 'After signing in, open My Orders to see order history and track current orders.'
    },
    {
      key: 'support',
      keywords: ['support', 'contact', 'help', 'issue', 'problem', 'query'],
      reply: 'Use the Contact page or email us for support. Include your order details for faster assistance.'
    }
  ];

  function normalize(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function extractName(text) {
    const match = text.match(/my name is\s+([a-zA-Z]+)/i) || text.match(/i am\s+([a-zA-Z]+)/i);
    return match ? match[1] : '';
  }

  function keywordScore(normalizedText, intent) {
    return intent.keywords.reduce((score, keyword) => normalizedText.includes(normalize(keyword)) ? score + 1 : score, 0);
  }

  function detectIntent(normalizedText) {
    let bestIntent = null;
    let bestScore = 0;
    intents.forEach((intent) => {
      const score = keywordScore(normalizedText, intent);
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    });
    return bestScore > 0 ? bestIntent : null;
  }

  function isGreeting(text) {
    return /(^|\s)(hello|hi|hey|good morning|good evening)(\s|$)/i.test(text);
  }

  function isThanks(text) {
    return /(thanks|thank you|thx)/i.test(text);
  }

  function appendMessage(role, text) {
    const row = document.createElement('div');
    row.className = `chatbot-msg ${role}`;
    row.innerHTML = `<p>${text}</p>`;
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    return row;
  }

  function getReply(text) {
    const safeText = String(text || '').trim();
    const normalizedText = normalize(safeText);
    const name = extractName(safeText);

    if (name) {
      state.customerName = name;
      return `Nice to meet you, ${name}. I can help with coat sizes, personalization, orders, cart, checkout, and support queries.`;
    }

    if (isGreeting(safeText)) {
      return state.customerName
        ? `Hi ${state.customerName}! How can I help you today — sizes, personalization, cart, or order tracking?`
        : 'Hi! I can help you with coat sizes, customization, cart, checkout, and tracking your order.';
    }

    if (isThanks(safeText)) {
      return 'You are welcome! Let me know if you need help choosing the perfect coat or customizing it.';
    }

    const intent = detectIntent(normalizedText);
    if (intent) {
      state.lastIntent = intent.key;
      return intent.reply;
    }

    if (state.lastIntent === 'cart_checkout') {
      return 'If checkout is not moving forward, first confirm cart has items, then ensure all required fields are filled before previewing your order.';
    }

    return 'I did not fully catch that. Ask me about coat sizes, personalization, pricing, cart, checkout, orders, or support.';
  }

  function replyWithTyping(text) {
    const typingNode = appendMessage('chatbot-typing', 'Assistant is typing...');
    fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question: text })
    })
      .then((res) => res.json())
      .then((data) => {
        if (typingNode && typingNode.parentNode) {
          typingNode.parentNode.removeChild(typingNode);
        }
        appendMessage('bot', data.answer || getReply(text));
      })
      .catch(() => {
        if (typingNode && typingNode.parentNode) {
          typingNode.parentNode.removeChild(typingNode);
        }
        appendMessage('bot', getReply(text));
      });
  }

  function askQuestion(text) {
    appendMessage('user', text);
    state.history.push({ role: 'user', text: text });
    replyWithTyping(text);
  }

  function openChat() {
    panel.classList.add('open');
    input.focus();
  }

  function closeChat() {
    panel.classList.remove('open');
  }

  toggle.addEventListener('click', () => {
    panel.classList.contains('open') ? closeChat() : openChat();
  });

  if (close) {
    close.addEventListener('click', closeChat);
  }

  promptButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const question = button.getAttribute('data-question');
      if (!question) return;
      if (!panel.classList.contains('open')) openChat();
      askQuestion(question);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    askQuestion(text);
  });
}


  function toggleWishlist(productId) {
    const btn = document.getElementById('addToWishlistBtn');
    const messageDiv = document.getElementById('wishlistMessage');

    if (!productId) {
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
    }

    const currentlyWishlisted = btn && btn.dataset.wishlisted === 'true';
    const endpoint = currentlyWishlisted ? `/wishlist/remove/${productId}` : `/wishlist/add/${productId}`;

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((res) => {
        if (res.status === 401 || res.redirected) {
          window.location.href = '/auth/signin';
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) {
          return;
        }

        const nextState = !!data.isWishlisted;
        setWishlistButtonState(btn, nextState);

        if (messageDiv) {
          messageDiv.style.display = 'block';
          messageDiv.textContent = data.success
            ? nextState
              ? 'Added to wishlist.'
              : 'Removed from wishlist.'
            : 'Could not update wishlist item.';
        }
      })
      .catch(() => {
        if (messageDiv) {
          messageDiv.style.display = 'block';
          // messageDiv.textContent = 'Could not update wishlist item.';
          messageDiv.textContent = 'Could not update wishlist item.';

        }
      })
      .finally(() => {
        if (btn) {
          btn.disabled = false;
          const isWishlisted = btn.dataset.wishlisted === 'true';
          setWishlistButtonState(btn, isWishlisted);
        }
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupFlavourLimiter('customAddToCartForm', 'scoopCount', 'selectedFlavours', 'productSelectionStatus', 'productSelectionHelp', 'addToCartBtn');
    setupCustomAddToCartForm();
    setupWishlistCardForms();
    setupWishlistToggleForm();
    setupBuildYourBox();
    setupChatbotWidget();
  });

  window.toggleWishlist = toggleWishlist;
  window.addToWishlistCard = addToWishlistCard;
})();



const faqs = document.querySelectorAll(".faq-item");

faqs.forEach(faq => {
  const btn = faq.querySelector(".faq-question");

  btn.addEventListener("click", () => {
    faq.classList.toggle("active");

    const answer = faq.querySelector(".faq-answer");

    if (faq.classList.contains("active")) {
      answer.style.maxHeight = answer.scrollHeight + "px";
    } else {
      answer.style.maxHeight = null;
    }
  });
});
document.querySelectorAll('.accordion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    item.classList.toggle('active');

    // Optional: close others
    document.querySelectorAll('.accordion-item').forEach(other => {
      if(other !== item) other.classList.remove('active');
    });
  });
});