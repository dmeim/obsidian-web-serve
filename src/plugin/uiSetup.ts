import { Notice } from 'obsidian';
import HtmlServerPlugin from './main';

const addRibbonButtons = (plugin: HtmlServerPlugin) => {
  if (!plugin.settings.useRibbonButons) {
    return () => {};
  }

  const startButton = plugin.addRibbonIcon(
    'wifi-off',
    'Web-Serve On',
    async () => {
      const state = await plugin.startServer();
      new Notice(
        state
          ? 'Web-Serve is now running.'
          : 'There was a problem starting Web-Serve, check the logs for more information.'
      );
    }
  );

  const stopButton = plugin.addRibbonIcon(
    'wifi',
    'Web-Serve Off',
    async () => {
      const state = await plugin.stopServer();
      new Notice(
        state
          ? 'Web-Serve has been stopped.'
          : 'There was a problem stopping Web-Serve, check the logs for more information.'
      );
    }
  );

  stopButton.classList.add('http-server-ribbon-stop-button');

  const changeButtonsState = ({
    isServerRunning,
  }: {
    isServerRunning: boolean;
  }) => {
    if (isServerRunning) {
      startButton.hide();
      stopButton.show();
    } else {
      startButton.show();
      stopButton.hide();
    }
  };

  plugin.app.workspace.on('html-server-event', changeButtonsState);

  changeButtonsState({
    isServerRunning: !!plugin.serverController?.isRunning(),
  });

  const clearRibbonButtons = () => {
    startButton.remove();
    stopButton.remove();
  };

  plugin.register(clearRibbonButtons);

  return clearRibbonButtons;
};

export const setupUiElements = (plugin: HtmlServerPlugin) => {
  // const statusBarItem = plugin.addStatusBarItem();

  // plugin.removeChild()
  const clearRibbonButtons = addRibbonButtons(plugin);

  return {
    clearRibbonButtons,
  };

  // statusBarItem.createSvg('svg', '');
  // plugin.registerEvent(plugin.emitter.on('server-running', () => {}));
  // return statusBarItem;
};
