/**
 * @file Factual Background
 * @name Factual
 *
 * Factual extension background code.
 *
 * @author Alexandru Badiu <andu@ctrlz.ro>
 */
import md5 from 'crypto-js/md5';
import config from './config';
import FactualBase from './factual_base';
require('../css/factual.scss');

class FactualBackground extends FactualBase {
  constructor() {
    super();
    console.info('[factchecker-plugin-chrome] Background init.');

    this.settings = {
      enabled: true,
    };

    chrome.storage.sync.get('settings', (result) => {
      if (result) {
        this.settings = result.settings;
      }

      this.setupEvents();
    });
  }

  toolbarClicked() {
    console.info('[factchecker-plugin-chrome] Toolbar clicked.');

    this.settings.enabled = !this.settings.enabled;

    this.settingsUpdate();
  }

  settingsChanged(changes, namespace) {
    console.info('[factchecker-plugin-chrome] Settings changed.');

    if (!_.isEqual(changes.settings.newValue, this.settings)) {
      this.settings = changes.settings.newValue;
      this.settingsPropagate();
    }
  }

  settingsUpdate() {
    chrome.storage.sync.set({
      settings: this.settings,
    }, () => {
      console.info('[factchecker-plugin-chrome] Settings saved.');
    });

    this.settingsPropagate();
  }

  settingsPropagate() {
    chrome.tabs.query({}, (tabs) => {
      const message = {
        sender: 'factual',
        action: 'settings_updated',
        msg: this.settings,
      };

      for (let i = 0; i < tabs.length; ++i) {
        chrome.tabs.sendMessage(tabs[i].id, message);
      }
    });
  }

  onMessage(request, sender, sendResponse) {
    console.info('[factchecker-plugin-chrome] Got message.');

    if (request.sender !== 'factual-client') {
      return;
    }

    if (request.action === 'settings_get') {
      sendResponse({ msg: this.settings });
    }

    if (request.action === 'facts_get') {
      this.getFacts(request.msg)
        .catch((error) => {
          // We don't do anything in case of an error.
        })
        .then((facts) => {
          chrome.tabs.sendMessage(sender.tab.id, {
            sender: 'factual',
            action: 'facts_loaded',
            facts: facts,
          });
        });
    }
  }

  onUpdated(tabId, info) {
    if (info.status === 'complete') {
      chrome.tabs.sendMessage(tabId, {
        sender: 'factual',
        action: 'content_loaded',
      });
    }
  }

  setupEvents() {
    chrome.storage.onChanged.addListener((changes, namespace) => this.settingsChanged(changes, namespace));
    chrome.browserAction.onClicked.addListener(() => this.toolbarClicked());
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => this.onMessage(request, sender, sendResponse));
    chrome.tabs.onUpdated.addListener((tabId, info) => this.onUpdated(tabId, info));
  }

  getFacts(url) {
    return new Promise((resolve, reject) => {
      const urlCode = this.getUrlCode(url);

      $.ajax({
        dataType: 'json',
        url: `http:\/\/${config.api}?q=${urlCode}`,
      }).then((response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          const facts = [];

          Object.keys(response.data).forEach((id) => {
            const fact = response.data[id];
            fact.id = id;
            facts.push(fact);
          })

          resolve(facts);
        }
      });
    });
  }

  getUrlCode(url) {
    const parser = document.createElement('a');
    parser.href = url;

    let purl = `${parser.host}${parser.pathname}`;
    purl = purl.replace(/^(www\.)/, '');

    if (purl[purl.length - 1] === '/') {
      purl = purl.substr(0, purl.length - 1);
    }

    return md5(purl);
  }
}

export default new FactualBackground();
