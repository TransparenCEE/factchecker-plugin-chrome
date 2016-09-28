/**
 * @file Factual Background
 * @name Factual
 *
 * Factual extension background code.
 *
 * @author Alexandru Badiu <andu@ctrlz.ro>
 */
import FactualBase from './factual_base';
import { getFacts, getAllFacts, getFactsFromCache, setFactsCache } from './api';
import { getUserToken } from './util';

require('../css/factual.scss');

class FactualBackground extends FactualBase {
  constructor() {
    super();
    console.info('[factchecker-plugin-chrome] Background init.');

    this.cachedFacts = [];
    this.alarmName = 'factual-update-facts';
    this.settings = {
      enabled: true,
      uid: '',
    };

    // chrome.alarms.clear(this.alarmName);

    chrome.storage.sync.get('settings', (result) => {
      if (result) {
        this.settings = result.settings;
      }

      if (!this.settings.uid) {
        this.settings.uid = getUserToken();
        this.settingsUpdate();
      }

      this.setupEvents();
      this.setupAlarms();
    });

    chrome.storage.local.get('facts', (data) => {
      setFactsCache(data.facts);
    });
  }

  updateCachedFacts(facts) {
    setFactsCache(facts);
    chrome.storage.local.set({ facts: this.cachedFacts });
  }

  toolbarClicked() {
    console.info('[factchecker-plugin-chrome] Toolbar clicked.');

    this.settings.enabled = !this.settings.enabled;

    this.settingsUpdate();
  }

  settingsChanged(changes) {
    console.info('[factchecker-plugin-chrome] Settings changed.');
    if (!changes.settings) {
      return;
    }

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

    if (request.action === 'settings-get') {
      sendResponse(this.settings);
      return false;
    }

    if (request.action === 'facts-get') {
      const cfacts = getFactsFromCache(request.url);
      if (cfacts.length) {
        sendResponse(cfacts);
        return false;
      }

      getFacts(request.url, this.settings.uid, 'chrome_extension', 'site')
        .then((facts) => {
          sendResponse(facts);
        });

      return true;
    }

    return false;
  }

  onUpdated(tabId, info) {
    if (info.status === 'complete') {
      chrome.tabs.sendMessage(tabId, {
        action: 'content-loaded',
      });
    }
  }

  onAlarm(alarm) {
    if (alarm.name === this.alarmName) {
      getAllFacts(this.settings.uid, 'chrome_extension', 'site')
        .then((facts) => {
          this.updateCachedFacts(facts);
        });
    }
  }

  setupEvents() {
    chrome.storage.onChanged.addListener((changes, namespace) => this.settingsChanged(changes, namespace));
    chrome.browserAction.onClicked.addListener(() => this.toolbarClicked());
    chrome.tabs.onUpdated.addListener((tabId, info) => this.onUpdated(tabId, info));
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => this.onMessage(request, sender, sendResponse));
    chrome.alarms.onAlarm.addListener(alarm => this.onAlarm(alarm));
  }

  setupAlarms() {
    chrome.alarms.getAll((alarms) => {
      const hasAlarm = alarms.some(a => a.name === this.alarmName);
      if (!hasAlarm) {
        chrome.alarms.create(this.alarmName, {
          delayInMinutes: 1,
          periodInMinutes: 60 * 24,
        });
      }
    });
  }
}

export default new FactualBackground();
