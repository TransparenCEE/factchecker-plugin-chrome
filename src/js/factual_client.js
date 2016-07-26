/**
 * @file Factual Client
 * @name Factual
 *
 * Factual extension client code.
 *
 * @author Alexandru Badiu <andu@ctrlz.ro>
 */
import FactualBase from './factual_base';

class Factual extends FactualBase {
  constructor() {
    super();
    console.info('[factchecker-plugin-chrome] Client init.');

    this.settings = {
      enabled: true,
    };

    chrome.runtime.sendMessage({
      sender: 'factual-client',
      action: 'settings_get',
    }, (response) => {
      this.settings = response.msg;
    });

    this.setupEvents();
  }

  setupEvents() {
    chrome.runtime.onMessage.addListener((request) => {
      console.info('[factchecker-plugin-chrome] Got message.');

      if (request.sender !== 'factual') {
        return;
      }

      if (request.action === 'settings_updated') {
        this.settings = request.msg;
      }
    });
  }
}

export default new Factual();
