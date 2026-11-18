(() => {
  const banner = document.getElementById('blackFriday');
  const deadline = Date.parse('2026-11-20T08:01:38.305Z');
  const digits = banner.querySelectorAll('[data-clock]');
  let interval;
  function render() {
    const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    banner.hidden = seconds === 0;
    if (banner.hidden) clearInterval(interval);
    [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
      .forEach((value, index) => { digits[index].textContent = String(value).padStart(2, '0'); });
  }
  banner.querySelector('button').addEventListener('click', () => {
    clearInterval(interval);
    banner.hidden = true;
    try { sessionStorage.setItem('fuse-black-friday-dismissed', String(deadline)); } catch {}
  });
  try { if (sessionStorage.getItem('fuse-black-friday-dismissed') === String(deadline)) return; } catch {}
  render();
  if (!banner.hidden) interval = setInterval(render, 250);
})();
