/**
 * @file Factual Background
 * @name Factual
 *
 * Factual extension background code.
 *
 * @author Alexandru Badiu <andu@ctrlz.ro>
 */
import { getFacts, getAllFacts, getFactsFromCache, setFactsCache } from './api';
import { getUserToken } from './util';

require('../css/factual.scss');

class FactualBackground {
  constructor() {
    console.info('[factchecker-plugin-chrome] Background init.');

    this.cachedFacts = [];
    this.alarmName = 'factual-update-facts';
    this.settings = {
      enabled: true,
      uid: '',
    };
    this.tabIndicators = {};

    // chrome.alarms.clear(this.alarmName);

    chrome.storage.sync.get('settings', (result) => {
      if (result && result.settings) {
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
    this.settings.enabled = !this.settings.enabled;

    this.settingsUpdate();
  }

  settingsChanged(changes) {
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
    if (request.action === 'action-update') {
      this.updateBrowserAction(sender.tab.id, request.numFacts);

      return false;
    }

    if (request.action === 'settings-get') {
      sendResponse(this.settings);
      return false;
    }

    if (request.action === 'facts-get') {
      const cfacts = getFactsFromCache(request.url);
      if (cfacts.length) {
        sendResponse(cfacts);

        // We ping the API even if we had a cache hit for statistics purposes.
        getFacts(request.url, this.settings.uid, 'chrome_extension', 'site');

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

  onActivated(activeInfo) {
    if (this.tabIndicators[activeInfo.tabId]) {
      this.updateBrowserAction(activeInfo.tabId, this.tabIndicators[activeInfo.tabId]);

      return;
    }

    this.updateBrowserAction(activeInfo.tabId, 0);
  }

  onRemoved(tabId) {
    delete this.tabIndicators[tabId];
  }

  onAlarm(alarm) {
    if (alarm.name === this.alarmName) {
      getAllFacts(this.settings.uid, 'chrome_extension', 'site')
        .then((facts) => {
          this.updateCachedFacts(facts);
        });
    }
  }

  updateBrowserAction(tabId, numFacts) {
    if (numFacts) {
      chrome.browserAction.setIcon({
        path: {
          19: 'assets/factual_icon_19x19.png',
          38: 'assets/factual_icon_38x38.png',
        },
      });

      chrome.browserAction.setBadgeText({ text: `${numFacts}` });
      this.tabIndicators[tabId] = numFacts;
      return;
    }

    chrome.browserAction.setIcon({
      path: {
        19: 'assets/factual_icon_gray_19x19.png',
        38: 'assets/factual_icon_gray_38x38.png',
      },
    });

    chrome.browserAction.setBadgeText({ text: '' });
    delete this.tabIndicators[tabId];
  }

  setupEvents() {
    chrome.storage.onChanged.addListener((changes, namespace) => this.settingsChanged(changes, namespace));
    chrome.browserAction.onClicked.addListener(() => this.toolbarClicked());
    chrome.tabs.onActivated.addListener((activeInfo) => this.onActivated(activeInfo));
    chrome.tabs.onUpdated.addListener((tabId, info) => this.onUpdated(tabId, info));
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => this.onRemoved(tabId, removeInfo));
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
