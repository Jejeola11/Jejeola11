(() => {
  const byId = id => document.getElementById(id);
  const dialog = byId('referral-offer');
  const link = byId('offer-link');
  const copy = byId('copy-offer-link');
  const pay = byId('offer-pay');
  const status = byId('offer-status');
  let timer;
  let refreshing = false;

  async function refresh() {
    if (!dialog.open || document.hidden || refreshing) return;
    refreshing = true;
    try {
      const session = await FuseExplore.session();
      byId('offer-signin').hidden = Boolean(session);
      if (!session) {
        link.value = '';
        copy.disabled = true;
        byId('offer-count').value = 0;
        byId('offer-qualified').hidden = true;
        return;
      }
      const offer = await Fuse.api('black-friday-offer');
      link.value = offer.referral_url || '';
      copy.disabled = !link.value;
      byId('offer-count').value = offer.signups;
      byId('offer-qualified').hidden = !offer.eligible;
      if (!link.value) status.textContent = 'Your referral link is unavailable. Please try again shortly.';
    } catch {
      status.textContent = 'Could not refresh referrals. Retrying shortly.';
    } finally {
      refreshing = false;
    }
  }

  function openOffer() {
    if (dialog.open) return;
    dialog.showModal();
    refresh();
    timer = setInterval(refresh, 10000);
  }

  document.querySelectorAll('[data-unlock-offer]').forEach(button => button.addEventListener('click', openOffer));
  dialog.addEventListener('close', () => {
    clearInterval(timer);
    status.textContent = '';
  });
  document.addEventListener('visibilitychange', refresh);
  if (new URLSearchParams(location.search).get('offer') === '1') openOffer();

  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link.value);
      status.textContent = 'Referral link copied.';
    } catch {
      link.select();
      status.textContent = 'Your link is selected. Use your device’s copy command.';
    }
  });

  pay.addEventListener('click', async () => {
    pay.disabled = true;
    status.textContent = 'Opening Paystack checkout…';
    try {
      const checkout = await Fuse.api('paystack-init', { pack: 'black-friday-creator-bundle' });
      location.assign(checkout.authorization_url);
    } catch (error) {
      status.textContent = error.message;
      pay.disabled = false;
    }
  });
})();
