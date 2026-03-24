import { Plugin } from 'typings';
import { EventRef, TAbstractFile, TFile } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS } from './settings/settings';
import { ServerController } from './server/controller';
import { setupUiElements } from './uiSetup';
import { HtmlServerPluginSettingsTab } from './settings/settingsTab';
import { QrCodeModal, getServerUrl } from './qrModal';

export default class HtmlServerPlugin extends Plugin {
  public settings!: PluginSettings;

  serverController?: ServerController;

  private uiCleanupFns?: { clearRibbonButtons: () => void };
  private vaultEventRefs: EventRef[] = [];

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    this.app.workspace.onLayoutReady(async () => {
      this.uiCleanupFns = setupUiElements(this);

      this.addSettingTab(new HtmlServerPluginSettingsTab(this.app, this));

      this.serverController = new ServerController(this);

      if (this.settings.startOnLoad) {
        await this.startServer();
      } else {
        this.app.workspace.trigger('html-server-event', {
          isServerRunning: false,
        });
      }

      this.addCommand({
        id: 'start-server',
        name: 'Start the Web Server',
        checkCallback: (checking) => {
          if (checking) {
            return !this.serverController?.isRunning();
          }
          this.startServer();
        },
      });

      this.addCommand({
        id: 'stop-server',
        name: 'Stop the Web Server',
        checkCallback: (checking) => {
          if (checking) {
            return !!this.serverController?.isRunning();
          }
          this.stopServer();
        },
      });

      this.addCommand({
        id: 'show-qr-code',
        name: 'Show Server QR Code',
        checkCallback: (checking) => {
          if (checking) {
            return !!this.serverController?.isRunning();
          }
          this.showQrCode();
        },
      });
    });
  }

  async onunload() {
    await this.stopServer();
  }

  async saveSettings() {
    await this.saveData(this.settings);
    await this.serverController?.reload();
  }

  async startServer() {
    await this.serverController?.start();
    if (this.serverController?.isRunning()) {
      this.registerVaultEvents();
      this.app.workspace.trigger('html-server-event', {
        isServerRunning: true,
      });
      if (this.settings.showQrOnStart) {
        this.showQrCode();
      }
    }
    return !!this.serverController?.isRunning();
  }

  showQrCode() {
    const url = getServerUrl(this.settings.port, this.settings.hostname);
    new QrCodeModal(this.app, url).open();
  }

  async stopServer() {
    this.unregisterVaultEvents();
    await this.serverController?.stop();
    this.app.workspace.trigger('html-server-event', { isServerRunning: false });
    return !this.serverController?.isRunning();
  }

  private registerVaultEvents() {
    this.unregisterVaultEvents();
    if (!this.settings.liveReload) return;

    const broadcast = (event: string) => (file: TAbstractFile) => {
      if (file instanceof TFile) {
        this.serverController?.broadcastReload(event, file.path);
      }
    };

    this.vaultEventRefs.push(
      this.app.vault.on('modify', broadcast('modify')),
      this.app.vault.on('create', broadcast('create')),
      this.app.vault.on('delete', broadcast('delete')),
      this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
        if (file instanceof TFile) {
          this.serverController?.broadcastReload('rename', file.path);
        }
      })
    );
  }

  private unregisterVaultEvents() {
    this.vaultEventRefs.forEach((ref) => this.app.vault.offref(ref));
    this.vaultEventRefs = [];
  }

  ReloadUiElements() {
    this.uiCleanupFns?.clearRibbonButtons();
    this.uiCleanupFns = setupUiElements(this);
  }
}
