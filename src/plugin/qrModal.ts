import { Modal, App } from 'obsidian';
import QRCode from 'qrcode';
import { networkInterfaces } from 'os';

function getLocalNetworkIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

export function getServerUrl(port: number, hostname: string): string {
  const host = hostname === '0.0.0.0' ? getLocalNetworkIP() : hostname;
  return `http://${host}:${port}`;
}

export class QrCodeModal extends Modal {
  private url: string;

  constructor(app: App, url: string) {
    super(app);
    this.url = url;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('ws-qr-modal');

    contentEl.createEl('h2', { text: 'Server is running' });

    const qrContainer = contentEl.createDiv({ cls: 'ws-qr-container' });

    try {
      const dataUrl = await QRCode.toDataURL(this.url, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      const img = qrContainer.createEl('img', { cls: 'ws-qr-image' });
      img.src = dataUrl;
      img.alt = 'QR code for server URL';
    } catch {
      qrContainer.createEl('p', { text: 'Failed to generate QR code.' });
    }

    const urlContainer = contentEl.createDiv({ cls: 'ws-qr-url-container' });
    const urlLink = urlContainer.createEl('a', {
      text: this.url,
      href: this.url,
      cls: 'ws-qr-url',
    });
    urlLink.setAttr('target', '_blank');

    const copyBtn = urlContainer.createEl('button', {
      text: 'Copy URL',
      cls: 'ws-qr-copy-btn',
    });
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(this.url);
      copyBtn.setText('Copied!');
      setTimeout(() => copyBtn.setText('Copy URL'), 1500);
    });

    const style = contentEl.createEl('style');
    style.textContent = `
      .ws-qr-modal { text-align: center; }
      .ws-qr-modal h2 { margin-bottom: 12px; }
      .ws-qr-container { display: flex; justify-content: center; margin: 16px 0; }
      .ws-qr-image { border-radius: 8px; }
      .ws-qr-url-container { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; }
      .ws-qr-url { font-size: 14px; }
      .ws-qr-copy-btn {
        padding: 4px 12px; border-radius: 4px; cursor: pointer;
        background: var(--interactive-accent); color: var(--text-on-accent);
        border: none; font-size: 13px;
      }
      .ws-qr-copy-btn:hover { opacity: 0.9; }
    `;
  }

  onClose() {
    this.contentEl.empty();
  }
}
