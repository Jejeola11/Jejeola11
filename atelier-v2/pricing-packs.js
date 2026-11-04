(() => {
  const status = document.getElementById('passStatus');
  const money = amount => '₦' + Number(amount).toLocaleString('en-NG');
  const root = document.getElementById('packs');
  const cards = Array.from(root?.querySelectorAll('[data-pack-id]') || []);
  let eligible = false;

  async function checkout(button, pack, label) {
    button.disabled = true;
    button.textContent = 'Opening secure checkout…';
    if (status) status.textContent = '';
    try {
      const client = await Fuse.client();
      const { data } = await client.auth.getSession();
      if (!data.session) {
        location.assign('/signup?next=' + encodeURIComponent(location.pathname + location.search));
        return;
      }
      // The server always verifies the product, price and discount before Paystack.
      const out = await Fuse.api('paystack-init', { pack });
      location.assign(out.authorization_url);
    } catch (error) {
      if (status) status.textContent = error.message || 'Could not start payment. Please try again.';
      button.disabled = false;
      button.textContent = label;
    }
  }

  const passButton = document.getElementById('creatorPassButton');
  passButton?.addEventListener('click', () => checkout(passButton, 'fuse-creator-pass', 'Get Full Access for ₦25,900'));
  // Cards are already in the HTML. Bind them before any network or auth work.
  for (const card of cards) {
    const button = card.querySelector('[data-pack]');
    const label = button.textContent;
    button.addEventListener('click', () => checkout(button, card.dataset.packId, label));
  }

  function updatePrice(card) {
    const amount = Number(card.dataset.amountNaira);
    const price = card.querySelector('.price');
    price.replaceChildren();
    if (eligible) {
      const original = document.createElement('del');
      original.textContent = money(amount);
      price.append(original);
    }
    const current = document.createElement('strong');
    current.textContent = money(eligible ? Math.round(amount * .75) : amount);
    price.append(current);
  }

  // Refresh values in place; a slow/failed request never hides the pack list.
  async function refreshPacks() {
    try {
      const response = await fetch('/api/credit-pricing');
      if (!response.ok) return;
      const data = await response.json();
      for (const pack of data.packs || []) {
        const card = cards.find(card => card.dataset.packId === pack.id);
        if (!card || !Number.isFinite(pack.amount_naira) || !Number.isSafeInteger(pack.credits)) continue;
        card.dataset.amountNaira = String(pack.amount_naira);
        card.querySelector('.name').textContent = pack.label;
        card.querySelector('.credits').textContent = pack.credits + ' credits';
        card.querySelector('.uses li').textContent = pack.note;
        updatePrice(card);
      }
    } catch { /* Static cards remain visible and server-verified checkout still works. */ }
  }

  async function refreshReferral() {
    try {
      const offer = await Fuse.api('fuse-earn');
      const expiry = offer.discountExpiresAt;
      eligible = Boolean(expiry && new Date(expiry) > new Date());
      if (!eligible) return;
      const note = document.getElementById('referralOffer');
      if (note) {
        note.hidden = false;
        note.textContent = 'Your referral offer is active: Paystack will automatically apply 25% off your first credit pack until ' + new Date(expiry).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) + '.';
      }
      cards.forEach(updatePrice);
    } catch { /* Referral lookup is optional and never delays cards or checkout. */ }
  }
  refreshPacks();
  refreshReferral();
})();
