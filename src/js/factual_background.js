/**
 * @file Factual Background
 * @name Factual
 *
 * Factual extension background code.
 *
 * @author Alexandru Badiu <andu@ctrlz.ro>
 */

require('../css/factual.scss');

class FactualBackground {
  constructor() {
    console.info('[factchecker-plugin-chrome] Background init.');

    this.setupEvents();
  }

  setupEvents() {
    chrome.browserAction.onClicked.addListener(function(tab) {
      console.info('[factchecker-plugin-chrome] Toolbar clicked.');
    });
  }
}

export default new FactualBackground();
