import { App, PluginSettingTab, Setting } from 'typings';
import HtmlServerPlugin from '../main';
import * as obsidian from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, TitleAlignment } from './settings';
import { FileSuggest } from './suggester/FileSuggester';

export class HtmlServerPluginSettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: HtmlServerPlugin) {
    super(app, plugin);
  }

  async saveAndReload() {
    await this.plugin.saveSettings();
    const serverIsRunning = !!this.plugin.serverController?.isRunning();
    if (serverIsRunning) {
      await this.plugin.stopServer();
      await this.plugin.startServer();
    }
  }

  display() {
    const { containerEl } = this;

    containerEl.empty();

    // ──────────────────────────────────────
    // Web Serve (version)
    // ──────────────────────────────────────
    containerEl.createEl('h2', {
      text: `${this.plugin.manifest.name} ${this.plugin.manifest.version}`,
    });

    // Start / Stop Server
    const serverToggle = new Setting(containerEl)
      .setName('Start / Stop Server')
      .setDesc(
        this.plugin.serverController?.isRunning()
          ? 'Server is running.'
          : 'Server is stopped.'
      );

    serverToggle.addToggle((cb) => {
      cb.setValue(!!this.plugin.serverController?.isRunning());
      cb.onChange(async (value) => {
        if (value) {
          await this.plugin.startServer();
        } else {
          await this.plugin.stopServer();
        }
        serverToggle.setDesc(
          this.plugin.serverController?.isRunning()
            ? 'Server is running.'
            : 'Server is stopped.'
        );
      });
    });

    // Start Automatically
    new Setting(containerEl)
      .setName('Start automatically')
      .setTooltip('Default: Off')
      .setDesc(
        'Start the server immediately when the plugin loads.'
      )
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.startOnLoad);
        cb.onChange(async (value) => {
          this.plugin.settings.startOnLoad = value;
          await this.plugin.saveSettings();
        });
      });

    // Ribbon Button
    new Setting(containerEl)
      .setName('Ribbon button')
      .setTooltip('Default: On')
      .setDesc(
        'Show a ribbon button in Obsidian to start/stop the server.'
      )
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.useRibbonButons);
        cb.onChange(async (value) => {
          this.plugin.settings.useRibbonButons = value;
          this.plugin.ReloadUiElements();
          await this.saveAndReload();
        });
      });

    // Port
    const portSetting = new Setting(containerEl)
      .setName('Port')
      .setTooltip('Default: 8080')
      .setDesc('Port to listen for HTTP requests.');

    const invalidPortElement = portSetting.infoEl.createDiv();
    invalidPortElement.hide();
    invalidPortElement
      .createSpan('settings-error-element')
      .setText('Must be a valid port number (1 - 65535)');

    portSetting.addText((cb) => {
      cb.setValue(String(this.plugin.settings.port));
      cb.onChange(async (value) => {
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < 1 || numValue > 65535) {
          invalidPortElement.show();
          return;
        }
        invalidPortElement.hide();
        this.plugin.settings.port = numValue;
        await this.saveAndReload();
      });
    });

    // Authentication
    new Setting(containerEl)
      .setName('Authentication')
      .setDesc('Require username and password to access the server.')
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.useSimpleAuth);
        cb.onChange(async (value) => {
          value
            ? simpleAuthSettingsContainer.show()
            : simpleAuthSettingsContainer.hide();
          this.plugin.settings.useSimpleAuth = value;
          await this.saveAndReload();
        });
      });

    const simpleAuthSettingsContainer = containerEl.createDiv();
    this.plugin.settings.useSimpleAuth
      ? simpleAuthSettingsContainer.show()
      : simpleAuthSettingsContainer.hide();

    simpleAuthSettingsContainer.createDiv().classList.add('setting-item');

    const usernameSetting = new Setting(simpleAuthSettingsContainer)
      .setName('Username')
      .setTooltip('Username used to login.')
      .setDesc("Default: 'obsidian'");

    const invalidUserName = usernameSetting.infoEl.createDiv();
    invalidUserName.hide();
    invalidUserName
      .createSpan('settings-error-element')
      .setText('Must be a non empty string');

    usernameSetting.addText((cb) => {
      cb.setValue(this.plugin.settings.simpleAuthUsername);
      cb.onChange(async (value) => {
        if (!value) {
          invalidUserName.show();
          return;
        }
        invalidUserName.hide();
        this.plugin.settings.simpleAuthUsername = value;
        await this.saveAndReload();
      });
    });

    const passwordSetting = new Setting(simpleAuthSettingsContainer)
      .setName('Password')
      .setTooltip('Password used to login.')
      .setDesc('Must be at least 6 characters long');

    const invalidPassword = passwordSetting.infoEl.createDiv();
    invalidPassword.hide();
    invalidPassword
      .createSpan('settings-error-element')
      .setText("The password doesn't meet the minimum required length");

    passwordSetting.addText((cb) => {
      cb.inputEl.type = 'password';
      cb.setValue(this.plugin.settings.simpleAuthPassword);
      cb.onChange(async (value) => {
        if (!value || value.length < 6) {
          invalidPassword.show();
          return;
        }
        invalidPassword.hide();
        this.plugin.settings.simpleAuthPassword = value;
        await this.saveAndReload();
      });
    });

    // ──────────────────────────────────────
    // Viewing
    // ──────────────────────────────────────
    containerEl.createEl('h3', { text: 'Viewing' });

    new Setting(containerEl)
      .setName('Show file navigation bar')
      .setDesc('Show the file navigation sidebar in the web view.')
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.showSidebar);
        cb.onChange(async (value) => {
          this.plugin.settings.showSidebar = value;
          await this.saveAndReload();
        });
      });

    new Setting(containerEl)
      .setName('Show note title')
      .setDesc('Show the note title at the top of the web view.')
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.showTitle);
        cb.onChange(async (value) => {
          this.plugin.settings.showTitle = value;
          await this.saveAndReload();
        });
      });

    new Setting(containerEl)
      .setName('Note title alignment')
      .setDesc('Align the note title in the web view.')
      .addDropdown((dd) => {
        dd.addOption('left', 'Left');
        dd.addOption('center', 'Center');
        dd.addOption('right', 'Right');
        dd.setValue(this.plugin.settings.titleAlignment || 'left');
        dd.onChange(async (value) => {
          this.plugin.settings.titleAlignment = value as TitleAlignment;
          await this.saveAndReload();
        });
      });

    // ──────────────────────────────────────
    // Assets
    // ──────────────────────────────────────
    containerEl.createEl('h3', { text: 'Assets' });

    new Setting(containerEl)
      .setName('Asset directories')
      .setDesc(
        'Directories listed here are always accessible regardless of the filter mode. Use this for folders that hold images, recordings, or other assets linked from your notes.'
      );

    const assetDirsContainer = containerEl.createDiv();

    const renderAssetDirs = () => {
      assetDirsContainer.empty();
      this.plugin.settings.assetDirectories.forEach((dir, index) => {
        new Setting(assetDirsContainer)
          .setName(dir || '(empty)')
          .addText((cb) => {
            cb.setValue(dir);
            cb.setPlaceholder('Folder path (e.g. -references/)');
            cb.onChange(async (value) => {
              this.plugin.settings.assetDirectories[index] = value;
              await this.saveAndReload();
            });
          })
          .addExtraButton((cb) => {
            cb.setIcon('x');
            cb.setTooltip('Remove');
            cb.onClick(async () => {
              this.plugin.settings.assetDirectories.splice(index, 1);
              await this.saveAndReload();
              renderAssetDirs();
            });
          });
      });

      new Setting(assetDirsContainer).addButton((cb) => {
        cb.setIcon('plus');
        cb.setCta();
        cb.setButtonText('Add Directory');
        cb.onClick(async () => {
          this.plugin.settings.assetDirectories.push('');
          await this.saveAndReload();
          renderAssetDirs();
        });
      });
    };
    renderAssetDirs();

    // ──────────────────────────────────────
    // Filtering
    // ──────────────────────────────────────
    containerEl.createEl('h3', { text: 'Filtering' });

    // Auto-load first allowed note
    new Setting(containerEl)
      .setName('Auto-load first allowed note')
      .setDesc(
        'When visiting the root URL, automatically load the first allowed note from the filter list instead of showing an error.'
      )
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.autoDefaultFromFilter);
        cb.onChange(async (value) => {
          this.plugin.settings.autoDefaultFromFilter = value;
          await this.saveAndReload();
        });
      });

    // Filter Mode
    new Setting(containerEl)
      .setName('Filter mode')
      .setDesc(
        'Choose how to filter which directories are accessible. Whitelist: only listed directories are visible. Blacklist: listed directories are hidden.'
      )
      .addDropdown((cb) => {
        cb.addOption('none', 'None (show all)');
        cb.addOption('whitelist', 'Whitelist');
        cb.addOption('blacklist', 'Blacklist');
        cb.setValue(this.plugin.settings.filterMode);
        cb.onChange(async (value) => {
          this.plugin.settings.filterMode = value as 'none' | 'whitelist' | 'blacklist';
          value === 'none'
            ? filterDirsContainer.hide()
            : filterDirsContainer.show();
          await this.saveAndReload();
        });
      });

    const filterDirsContainer = containerEl.createDiv();
    this.plugin.settings.filterMode === 'none'
      ? filterDirsContainer.hide()
      : filterDirsContainer.show();

    const renderFilterDirs = () => {
      filterDirsContainer.empty();
      this.plugin.settings.filterDirectories.forEach((dir, index) => {
        new Setting(filterDirsContainer)
          .setName(dir || '(empty)')
          .addText((cb) => {
            cb.setValue(dir);
            cb.setPlaceholder('Folder path (e.g. Private/)');
            cb.onChange(async (value) => {
              this.plugin.settings.filterDirectories[index] = value;
              await this.saveAndReload();
            });
          })
          .addExtraButton((cb) => {
            cb.setIcon('x');
            cb.setTooltip('Remove');
            cb.onClick(async () => {
              this.plugin.settings.filterDirectories.splice(index, 1);
              await this.saveAndReload();
              renderFilterDirs();
            });
          });
      });

      new Setting(filterDirsContainer).addButton((cb) => {
        cb.setIcon('plus');
        cb.setCta();
        cb.setButtonText('Add Directory');
        cb.onClick(async () => {
          this.plugin.settings.filterDirectories.push('');
          await this.saveAndReload();
          renderFilterDirs();
        });
      });
    };
    renderFilterDirs();

    // ──────────────────────────────────────
    // Advanced
    // ──────────────────────────────────────
    containerEl.createEl('h3', { text: 'Advanced' });

    new Setting(containerEl)
      .setName('Show advanced settings')
      .addToggle((cb) => {
        cb.setValue(this.plugin.settings.showAdvancedOptions);
        cb.onChange(async (value) => {
          value ? advancedSettings.show() : advancedSettings.hide();
          this.plugin.settings.showAdvancedOptions = value;
          await this.saveAndReload();
        });
      });

    const advancedSettings = containerEl.createDiv();
    this.plugin.settings.showAdvancedOptions
      ? advancedSettings.show()
      : advancedSettings.hide();

    advancedSettings.createDiv().classList.add('setting-item');

    const hostNameDescription = new DocumentFragment();
    hostNameDescription
      .createDiv()
      .setText('Hostname/IP address to listen for HTTP requests.');
    hostNameDescription.createDiv().setText('Commonly used:');
    hostNameDescription
      .createDiv()
      .setText('- localhost (Only locally accessible)');
    hostNameDescription
      .createDiv()
      .setText(
        '- {LAN IP Address} or Hostname (Accessible in the local network)'
      );
    hostNameDescription
      .createDiv()
      .setText('- 0.0.0.0 (Listen on all interfaces)');

    const hostSetting = new Setting(advancedSettings)
      .setName('Listening hostname / IP address')
      .setTooltip('Default: localhost (Only locally accessible)')
      .setDesc(hostNameDescription);

    const invalidHostElement = hostSetting.infoEl.createDiv();
    invalidHostElement.hide();
    invalidHostElement
      .createSpan('settings-error-element')
      .setText('Must be a valid non-empty hostname/IP address');

    hostSetting.addText((cb) => {
      cb.setValue(String(this.plugin.settings.hostname));
      cb.onChange(async (value) => {
        if (!value) {
          return invalidHostElement.show();
        }
        invalidHostElement.hide();
        this.plugin.settings.hostname = value;
        await this.saveAndReload();
      });
    });

    /* const _htmlSettingItem =  */ new Setting(advancedSettings)
      .setName('Custom index.html file')
      .addExtraButton((cb) => {
        cb.setIcon('refresh-ccw');
        cb.setTooltip('Restore Default Value');
        cb.onClick(() => {
          const modal = new obsidian.Modal(app);
          modal.titleEl.setText(
            'Are you sure you want to restore this setting to the default value?'
          );
          new Setting(modal.contentEl)
            .addButton((cb) => {
              cb.setButtonText('Restore');
              cb.setClass('mod-warning');
              cb.onClick(async () => {
                this.plugin.settings.indexHtml = DEFAULT_SETTINGS.indexHtml;
                textAreaComponent.setValue(this.plugin.settings.indexHtml);
                await this.saveAndReload();
                modal.close();
              });
            })
            .addButton((cb) => {
              cb.setButtonText('Cancel');
              cb.onClick(() => {
                modal.close();
              });
            });
          modal.open();
        });
      });

    const indexHtmlSetting = new Setting(advancedSettings);

    const invalidHtmlSettingElement = indexHtmlSetting.infoEl.createDiv();
    invalidHtmlSettingElement.hide();
    invalidHtmlSettingElement
      .createSpan('settings-error-element')
      .setText('Must be a valid a non empty string');

    indexHtmlSetting.settingEl.removeClass('setting-item');
    let textAreaComponent: obsidian.TextAreaComponent;
    indexHtmlSetting.addTextArea((cb) => {
      textAreaComponent = cb;
      cb.setValue(this.plugin.settings.indexHtml);
      cb.onChange(async (value) => {
        if (!value) {
          return invalidHtmlSettingElement.show();
        }
        invalidHtmlSettingElement.hide();
        this.plugin.settings.indexHtml = value;
        await this.saveAndReload();
      });
    });

    /* const _htmlReplacableVariablesSettings =  */ new Setting(
      advancedSettings
    )
      .setName('Replaceable Variables')
      .addButton((cb) => {
        cb.setIcon('refresh-ccw');
        cb.setTooltip('Restore Default Values');
        cb.onClick(() => {
          const modal = new obsidian.Modal(app);
          modal.titleEl.append(
            'Are you sure you want to restore the default values?',
            document.createElement('br'),
            'Will restore only the default vars, i.e. not deleting any custom variables.'
          );
          new Setting(modal.contentEl)
            .addButton((cb) => {
              cb.setButtonText('Restore');
              cb.setClass('mod-warning');
              cb.onClick(async () => {
                const defaultSettingsNames =
                  DEFAULT_SETTINGS.htmlReplaceableVariables.map(
                    (a) => a.varName
                  );
                this.plugin.settings.htmlReplaceableVariables = [
                  ...DEFAULT_SETTINGS.htmlReplaceableVariables,
                  ...this.plugin.settings.htmlReplaceableVariables.filter(
                    (htmlVariable) => {
                      return !defaultSettingsNames.includes(
                        htmlVariable.varName
                      );
                    }
                  ),
                ];
                setVars(htmlVarsContainer, this.plugin, onChangeVar);
                await this.saveAndReload();
                modal.close();
              });
            })
            .addButton((cb) => {
              cb.setButtonText('Cancel');
              cb.onClick(() => {
                modal.close();
              });
            });
          modal.open();
        });
      });

    indexHtmlSetting.controlEl.addClass('w100');
    const textareaElement = indexHtmlSetting.controlEl
      .firstChild as HTMLTextAreaElement;

    textareaElement.addClass('w100p');
    textareaElement.addClass('h350');

    const htmlVarsContainer = advancedSettings.createDiv('settings-table');

    const onChangeVar: OnChangeVariable = async (
      newValue,
      type,
      _currentVariableValue,
      index
    ) => {
      if (!newValue) {
        return { status: 'Error' };
      }

      if (index >= this.plugin.settings.htmlReplaceableVariables.length) {
        this.plugin.settings.htmlReplaceableVariables[index] = {
          varName: '',
          varValue: '',
        };
      }
      switch (type) {
        case 'name':
          this.plugin.settings.htmlReplaceableVariables[index].varName =
            newValue;
          break;
        case 'value':
          this.plugin.settings.htmlReplaceableVariables[index].varValue =
            newValue;
          break;
      }

      await this.saveAndReload();
      return { status: 'OK' };
    };

    setVars(htmlVarsContainer, this.plugin, onChangeVar);

    // ──────────────────────────────────────
    // Footer
    // ──────────────────────────────────────
    containerEl.createEl('hr');
    const div1 = containerEl.createEl('div', {
      text: 'Developed by ',
    });
    div1.createEl('a', {
      text: `Dimitri Meimairidis`,
      href: `https://github.com/dmeim`,
    });
    containerEl.createEl('br');
    const div2 = containerEl.createEl('div', {
      text: 'Based on obsidian-html-server by ',
    });
    div2.createEl('a', {
      text: 'Pr0dt0s',
      href: 'https://github.com/Pr0dt0s/obsidian-html-server',
    });
    div2.appendText('.');
  }
}

function setVars(
  element: HTMLElement,
  pluggin: HtmlServerPlugin,
  onChange: OnChangeVariable
) {
  element.empty();
  const header = element.createDiv('setting-item');

  const info = header.createDiv('setting-item-info');
  info.innerText = 'Name';
  info.addClass('text-align-center');
  const control = header.createDiv('setting-item-control');
  control.innerText = 'Value';
  control.addClass('justify-content-center');

  const createEdditable = (
    text: string,
    type: 'name' | 'value',
    eventListener: (
      target: HTMLInputElement,
      type: 'name' | 'value'
    ) => Promise<OnChangeStatus>
  ) => {
    const inputEl = document.createElement('input');
    inputEl.value = text;
    inputEl.type = 'text';
    inputEl.addClass('w100p');
    let updateTimeout: NodeJS.Timeout;
    let to: NodeJS.Timeout;
    inputEl.onchange = ({ target }) => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(async () => {
        const { status } = await eventListener(
          target as HTMLInputElement,
          type
        );
        if (status == 'Error') {
          inputEl.addClass('with-error');
          inputEl.removeClass('with-success');
        } else {
          inputEl.removeClass('with-error');
          inputEl.addClass('with-success');
          clearTimeout(to);
          to = setTimeout(() => {
            inputEl.removeClass('with-success');
            inputEl.removeClass('with-error');
          }, 500);
        }
      }, 100);
    };
    return inputEl;
  };

  pluggin.settings.htmlReplaceableVariables.forEach((variable, index) => {
    const line = new Setting(element);
    const eventListener = async (
      target: HTMLInputElement,
      type: 'name' | 'value'
    ) => {
      const value = target.value;
      return await onChange(
        value,
        type,
        pluggin.settings.htmlReplaceableVariables,
        index
      );
    };

    line.infoEl.append(
      createEdditable(variable.varName, 'name', eventListener)
    );
    line.controlEl.append(
      createEdditable(variable.varValue, 'value', eventListener)
    );
    line.addExtraButton((cb) => {
      cb.setIcon('x');
      cb.setTooltip('Delete Variable');
      cb.onClick(async () => {
        pluggin.settings.htmlReplaceableVariables =
          pluggin.settings.htmlReplaceableVariables.filter(
            (_, i) => i !== index
          );
        await pluggin.saveSettings();
        setVars(element, pluggin, onChange);
      });
    });
  });

  new Setting(element).addButton((cb) => {
    cb.setIcon('plus');
    cb.setCta();
    cb.setButtonText('Add a new Variable');
    cb.setTooltip('Add a new Variable');
    cb.onClick(async () => {
      pluggin.settings.htmlReplaceableVariables.push({
        varName: '',
        varValue: '',
      });
      await pluggin.saveSettings();
      setVars(element, pluggin, onChange);
    });
  });
}

type OnChangeVariable = (
  newValue: string,
  type: 'name' | 'value',
  currentVariableValue: PluginSettings['htmlReplaceableVariables'],
  index: number
) => Promise<OnChangeStatus>;

type OnChangeStatus = { status: 'OK' | 'Error' };
