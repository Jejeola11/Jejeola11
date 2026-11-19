(() => {
  const banner = document.getElementById('blackFriday');
  const offer = document.getElementById('blackFridayOffer');
  const offerLink = offer.querySelector('a');
  const signupUrl = offerLink.getAttribute('href');
  async function resolveOfferUrl() {
    return await window.FuseExplore?.session() ? '/blackfriday' : signupUrl;
  }
  offerLink.addEventListener('click', async event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.location.assign(await resolveOfferUrl());
  });
  resolveOfferUrl().then(url => { offerLink.href = url; });
  const deadline = Date.parse('2026-11-20T08:01:38.305Z');
  const digits = banner.querySelectorAll('[data-clock]');
  let interval;
  function render() {
    const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    banner.hidden = seconds === 0;
    offer.hidden = banner.hidden;
    if (banner.hidden) clearInterval(interval);
    [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
      .forEach((value, index) => { digits[index].textContent = String(value).padStart(2, '0'); });
  }
  render();
  if (!banner.hidden) interval = setInterval(render, 250);
})();
