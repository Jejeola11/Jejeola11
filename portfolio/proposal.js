const form = document.querySelector('#portfolio-proposal');
const submit = form.querySelector('button');
const status = form.querySelector('[role="status"]');
let requestId;

form.addEventListener('input', () => { requestId = undefined; });
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submit.disabled) return;
  requestId ??= crypto.randomUUID();
  const data = { ...Object.fromEntries(new FormData(form)), requestId };
  submit.disabled = true;
  submit.textContent = 'Submitting…';
  status.textContent = '';

  try {
    const response = await fetch('/api/portfolio-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Please try again.');
    form.reset();
    submit.textContent = 'Submitted ✅';
    status.textContent = 'Thanks for sharing your project. I’ll reply by email.';
    for (const field of form.elements) field.disabled = true;
  } catch (error) {
    submit.disabled = false;
    submit.textContent = 'Submit';
    status.textContent = error instanceof SyntaxError || error instanceof TypeError
      ? 'Your proposal could not be sent. Please try again.'
      : error.message;
  }
});
