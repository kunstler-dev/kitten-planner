// A single persistent <webview> with chatgpt.com, laid over a placeholder in the AI tab.
// Kept alive between visits so the page (and her login) doesn't reload every time.
const GPT_URL = 'https://chatgpt.com/';
let host;
let webview;
let placeholder = null;
let raf = 0;

function ensure() {
  if (host) return;
  host = document.createElement('div');
  host.id = 'gpt-host';
  webview = document.createElement('webview');
  webview.setAttribute('partition', 'persist:chatgpt');
  webview.setAttribute('allowpopups', '');
  webview.setAttribute('src', GPT_URL);
  host.append(webview);
  document.body.append(host);
}

function follow() {
  raf = requestAnimationFrame(follow);
  if (!placeholder?.isConnected) return hideGpt();
  const r = placeholder.getBoundingClientRect();
  host.style.transform = `translate(${r.left}px, ${r.top}px)`;
  host.style.width = `${r.width}px`;
  host.style.height = `${r.height}px`;
}

export function showGpt(el) {
  ensure();
  placeholder = el;
  host.classList.add('visible');
  cancelAnimationFrame(raf);
  follow();
}

export function hideGpt() {
  cancelAnimationFrame(raf);
  placeholder = null;
  host?.classList.remove('visible');
}

export const gpt = {
  back: () => webview?.canGoBack?.() && webview.goBack(),
  reload: () => webview?.reload?.(),
  home: () => webview?.loadURL?.(GPT_URL),
  url: () => {
    try {
      return webview?.getURL?.() || GPT_URL;
    } catch {
      return GPT_URL;
    }
  },
  async logout() {
    await window.api.gptLogout();
    webview?.loadURL?.(GPT_URL);
  },
};
