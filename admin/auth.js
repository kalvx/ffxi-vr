const form = document.querySelector('#login-form');
const statusLine = document.querySelector('#status');

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

if (sessionStorage.getItem('vr-admin-auth') === 'ok') location.replace('content/');

form.addEventListener('submit', async event => {
  event.preventDefault();
  const configured = window.VR_ADMIN_HASH || '';
  if (!/^[a-f0-9]{64}$/i.test(configured)) {
    statusLine.textContent = 'Admin password has not been configured. Run tools\\SET_ADMIN_PASSWORD.ps1 first.';
    return;
  }
  const supplied = await sha256(document.querySelector('#password').value);
  if (supplied.toLowerCase() === configured.toLowerCase()) {
    sessionStorage.setItem('vr-admin-auth', 'ok');
    location.replace('content/');
  } else {
    statusLine.textContent = 'Access denied. Check the passphrase and try again.';
    document.querySelector('#password').select();
  }
});
