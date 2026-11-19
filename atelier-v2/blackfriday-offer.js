(() => {
  const byId = id => document.getElementById(id);
  const dialog = byId('referral-offer');
  const link = byId('offer-link');
  const copy = byId('copy-offer-link');
  const pay = byId('offer-pay');
  const status = byId('offer-status');
  const progressLink = byId('bf-progress-link');
  const progressCopy = byId('bf-progress-copy');
  const progressStatus = byId('bf-progress-status');
  const finalAction = byId('bf-final-action');
  const finalSignIn = byId('bf-final-signin');
  const deadline = Date.parse(byId('bf-closing').dateTime);
  const isClosed = () => Date.now() >= deadline;
  let signedIn = false;
  let refreshing = false;
  let signups = 0;
  let qualified = false;

  function updateEligibility(count, eligible) {
    signups = count;
    qualified = eligible;
    byId('offer-count').value = count;
    byId('offer-qualified').hidden = !eligible;
    const closed = isClosed();
    pay.toggleAttribute('data-locked', !eligible || closed);
    byId('bf-progress-count').value = count;
    byId('bf-progress-meter').value = count;
    finalSignIn.hidden = signedIn || closed;
    finalAction.hidden = !signedIn && !closed;
    finalAction.disabled = closed;
    finalAction.textContent = closed ? 'Offer Closed' : eligible ? 'Pay ₦15,000' : 'Check My Progress';
    document.querySelectorAll('[data-unlock-offer]').forEach(button => {
      if (closed) {
        button.disabled = true;
        button.textContent = 'Offer Closed';
      }
    });
  }

  async function refresh() {
    if (document.hidden || refreshing) return;
    refreshing = true;
    try {
      const session = await FuseExplore.session();
      signedIn = Boolean(session);
      byId('offer-signin').hidden = signedIn;
      if (!session) {
        progressLink.value = link.value = '';
        progressCopy.disabled = true;
        progressStatus.textContent = 'Sign in to see your referral link and verified signups.';
        copy.disabled = true;
        updateEligibility(0, false);
        return;
      }
      const offer = await Fuse.api('black-friday-offer');
      progressLink.value = link.value = offer.referral_url || '';
      progressCopy.disabled = !link.value;
      const remaining = Math.max(0, 5 - offer.signups);
      progressStatus.textContent = isClosed() ? 'This offer has closed.' : remaining ? remaining + (remaining === 1 ? ' verified signup to go.' : ' verified signups to go.') : 'You qualify. Your checkout is ready.';
      copy.disabled = !link.value;
      updateEligibility(offer.signups, offer.eligible);
      if (!link.value) status.textContent = 'Your referral link is unavailable. Please try again shortly.';
    } catch {
      status.textContent = 'Could not refresh referrals. Retrying shortly.';
      progressStatus.textContent = status.textContent;
    } finally {
      refreshing = false;
    }
  }

  function openOffer() {
    if (dialog.open) return;
    dialog.showModal();
    refresh();

  }

  document.querySelectorAll('[data-unlock-offer]').forEach(button => button.addEventListener('click', openOffer));
  dialog.addEventListener('close', () => {
    status.textContent = '';
  });
  document.addEventListener('visibilitychange', refresh);
  updateEligibility(signups, qualified);
  refresh();
  setInterval(refresh, 10000);
  setTimeout(() => updateEligibility(signups, qualified), Math.max(0, deadline - Date.now()));
  finalAction.addEventListener('click', () => {
    if (isClosed()) return;
    if (!qualified) {
      byId('bf-progress').scrollIntoView({ block: 'start' });
      return;
    }
    openOffer();
    pay.click();
  });
  progressCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(progressLink.value);
      progressStatus.textContent = 'Referral link copied.';
    } catch {
      progressLink.select();
      progressStatus.textContent = 'Your link is selected. Use your device’s copy command.';
    }
  });
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
    if (isClosed()) {
      status.textContent = 'The Black Friday offer has closed.';
      return;
    }
    if (!qualified) {
      const remaining = Math.max(1, 5 - signups);
      status.textContent = byId('offer-signin').hidden
        ? 'Invite ' + remaining + ' more ' + (remaining === 1 ? 'person' : 'people') + ' to unlock payment.'
        : 'Sign in to get your referral link and start inviting friends.';
      return;
    }
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

(() => {
  const reels = document.getElementById('bf-reels');
  const pause = document.getElementById('bf-reel-pause');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let active = false;
  let direction = 1;
  let resumeAt = 0;
  const playing = new Set();
  const observer = new IntersectionObserver(([entry]) => { active = entry.isIntersecting; });
  observer.observe(reels);
  function syncMotionPreference() { pause.hidden = reducedMotion.matches; }
  syncMotionPreference();
  reducedMotion.addEventListener('change', syncMotionPreference);
  pause.addEventListener('click', () => {
    paused = !paused;
    pause.textContent = paused ? 'Resume scrolling' : 'Pause scrolling';
  });
  for (const event of ['pointerdown', 'wheel', 'keydown']) {
    reels.addEventListener(event, () => { resumeAt = Date.now() + 4000; }, { passive: true });
  }
  for (const video of reels.querySelectorAll('video')) {
    video.addEventListener('play', () => {
      for (const other of playing) if (other !== video) other.pause();
      playing.add(video);
    });
    video.addEventListener('pause', () => playing.delete(video));
    video.addEventListener('ended', () => playing.delete(video));
  }
  setInterval(() => {
    if (!active || paused || reducedMotion.matches || document.hidden || playing.size ||
      Date.now() < resumeAt || reels.matches(':focus-within') ||
      (matchMedia('(hover: hover)').matches && reels.matches(':hover'))) return;
    const max = reels.scrollWidth - reels.clientWidth;
    if (max <= 0) return;
    if (reels.scrollLeft >= max - 1) direction = -1;
    if (reels.scrollLeft <= 0) direction = 1;
    reels.scrollLeft += direction;
  }, 32);
})();
