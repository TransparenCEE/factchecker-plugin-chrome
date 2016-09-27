/**
 * @file Factual Background
 * @name Factual
 *
 * Factual extension background code.
 *
 * @author Alexandru Badiu <andu@ctrlz.ro>
 */
import config from './config';
import FactualBase from './factual_base';
import { getUserToken, encodeParams, getUrlCode, getShortUrl } from './util';
import { convertFact, convertFacts } from './fact';

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

    chrome.alarms.clear(this.alarmName);

    chrome.storage.sync.get('settings', (result) => {
      if (result) {
        this.settings = result.settings;
      }

      if (!this.settings.uid) {
        this.settings.uid = getUserToken();
        this.settingsUpdate();
      }

      this.setupEvents();
      // this.setupAlarms();
    });

    chrome.storage.local.get('facts', (data) => {
      this.cachedFacts = data.facts;
    });
  }

  updateCachedFacts(facts) {
    this.cachedFacts = facts;
    chrome.storage.local.set({ facts: this.cachedFacts });
    console.log('updated cached facts');
    console.log(this.cachedFacts);
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
      const cfacts = this.getFactsFromCache(request.url);
      if (cfacts.length) {
        sendResponse(cfacts);
        return false;
      }

      this.getFacts(request.url)
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
      this.getAllFacts()
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
          delayInMinutes: 0.1,
          periodInMinutes: 0.1,
        });
      }
    });
  }

  getFactsFromCache(url) {
    return _.filter(this.cachedFacts, { source: getShortUrl(url) });
  }

  getFacts(url) {
    return new Promise((resolve) => {
      const urlCode = getUrlCode(url);
      const params = {
        q: urlCode,
        u: this.settings.uid,
        client: 'chrome_extension',
        origin: 'site',
      };

      $.ajax({
        dataType: 'json',
        url: `http:\/\/${config.api}?${encodeParams(params)}`,
      }).then((response) => {
        const facts = [];
        if (response.error) {
          return resolve(facts);
        }

        if (response.data) {
          Object.keys(response.data).forEach(id => facts.push(convertFact(response.data[id])));
        }

        resolve(facts);
      });
    });
  }

  getAllFacts() {
    return new Promise((resolve) => {
      const params = {
        q: 'all',
        u: this.settings.uid,
        client: 'chrome_extension',
        origin: 'site',
      };
      $.ajax({
        dataType: 'json',
        url: `http:\/\/${config.api}?${encodeParams(params)}`,
      }).then((response) => {
        if (response.error) {
          return resolve([]);
        }

        if (response.data) {
          return resolve(convertFacts(response.data));
        }

        return resolve([]);
      });
    });
  }
}

export default new FactualBackground();
