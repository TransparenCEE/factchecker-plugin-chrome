/**
 * @file Factual Client
 * @name Factual
 *
 * Factual extension client code.
 *
 * @author Alexandru Badiu <andu@ctrlz.ro>
 */
import mark from 'mark.js';
import popover from 'webui-popover';
import MutationSummary from 'mutation-summary';
import FactualBase from './factual_base';
import { removeDiacritics, getDate, getURL, isFacebook, extractLink, getFactInfo } from './util';

class Factual extends FactualBase {
  constructor() {
    super();
    console.info('[factchecker-plugin-chrome] Client init.');

    this.factTemplate = _.template(require('../views/fact.html'));
    this.nfactTemplate = _.template(require('../views/unmatched-fact.html'));
    this.facebookFactTemplate = _.template(require('../views/facebook.html'));

    this.facebookObserver = null;
    this.facebookFacts = [];
    this.facts = [];
    this.matched = 0;
    this.unmatchedFact = null;
    this.settings = {
      enabled: true,
    };

    chrome.runtime.sendMessage({ action: 'settings-get' }, (settings) => {
      this.settings = settings;
    });

    this.setupEvents();
  }

  setupEvents() {
    chrome.runtime.onMessage.addListener((request) => {
      console.info('[factchecker-plugin-chrome] Got message.');

      if (request.action === 'settings-updated') {
        this.settings = request.msg;
      }

      if (request.action === 'content-loaded') {
        if (isFacebook()) {
          this.handleFacebook();
        } else {
          chrome.runtime.sendMessage({ action: 'facts-get', url: window.location.href }, (facts) => {
            this.facts = facts;
            this.displayFacts();
          });
        }
      }
    });
  }

  handleFacebook() {
    console.info('[factchecker-plugin-chrome] On facebook.');
    $('div[aria-label=Story]').each((i, article) => {
      const url = this.getFacebookUrl(article);

      if (url) {
        this.facebookFacts.push({
          context: article,
          url,
          fact: null,
          processed: false,
        });
      }
    });

    this.loadFacebookFacts()
      .then((facts) => {
        this.facebookFacts = _.filter(facts, fact => fact.fact !== null);
      })
      .then(() => this.displayFacebookFacts());

    this.facebookObserver = new MutationSummary({
      callback: summaries => this.mutationFacebook(summaries),
      queries: [
        {
          element: 'div[aria-label=Story]',
        },
      ],
    });
  }

  getFacebookUrl(article) {
    const url = $('a[rel=nofollow]', article).prop('href');
    if (!url) {
      return null;
    }

    const aurl = extractLink(url);
    return aurl;
  }

  mutationFacebook(summaries) {
    if (summaries.length && summaries[0].added && summaries[0].added.length) {
      summaries[0].added.forEach((article) => {
        const url = this.getFacebookUrl(article);

        if (url) {
          this.facebookFacts.push({
            context: article,
            url,
            fact: null,
            processed: false,
          });
        }
      });
    }

    this.loadFacebookFacts()
      .then((facts) => {
        this.facebookFacts = _.filter(facts, fact => fact.fact !== null);
      })
      .then(() => console.log(`After mutation: ${this.facebookFacts.length}.`))
      .then(() => this.displayFacebookFacts());
  }

  loadFacebookFacts() {
    return Promise.mapSeries(this.facebookFacts, (fact) => {
      return new Promise((resolve) => {
        if (fact.processed) {
          resolve(fact);
        }

        chrome.runtime.sendMessage({
          action: 'facts-get',
          url: fact.url,
        }, (facts) => {

          if (facts.length) {
            fact.fact = facts[0];
          }

          resolve(fact);
        });
      });
    });
  }

  displayFacebookFacts() {
    this.facebookFacts.forEach((fact) => {
      if (fact.processed) {
        return;
      }

      let sclass;
      let stext;
      [sclass, stext] = getFactInfo(fact.fact);

      const content = this.facebookFactTemplate({
        status: fact.fact.status,
        stext,
        url: fact.fact.url,
        logo: getURL('assets/factual_logo.png'),
        statusClass: sclass,
      });

      $('div', fact.context).first().after($(content));

      fact.processed = true;
    });
  }

  displayFacts() {
    this.marker = new Mark(document.querySelector('body'));
    this.facts.forEach((fact) => {
      this.displayFact(fact);
    });

    if (this.unmatchedFact) {
      this.displayUnmatchedFact(this.unmatchedFact);
    }
  }

  displayUnmatchedFact(fact) {
    let sclass;
    let stext;
    [sclass, stext] = getFactInfo(fact);

    let content = this.nfactTemplate({
      status: fact.status,
      stext,
      url: fact.url,
      logo: getURL('assets/factual_logo.png'),
      statusClass: sclass,
    });

    content = $(content);

    $('.factchecker-fact-details__close a', content).on('click', () => {
      $('.factchecker-fact-details-container').fadeOut();
    });

    $('body').append(content);
  }

  displayFact(fact) {
    if (fact.declaratie) {
      const declaratie = removeDiacritics(fact.declaratie);
      let sclass;
      [sclass] = getFactInfo(fact);

      this.marker.mark(fact.declaratie, {
        debug: true,
        className: `factchecker-fact-mark-${sclass}`,
        acrossElements: true,
        iframes: true,
        separateWordSearch: false,
        each: (factMark) => {
          const content = this.factTemplate({
            status: fact.status,
            quote: declaratie,
            url: `${fact.url}?client=chrome_extension`,
            logo: getURL('assets/factual_logo.png'),
            statusClass: sclass,
            date: getDate(fact.date),
          });

          this.matched++;

          $(factMark).append(require('../views/factual-mark.html'));

          $(factMark).webuiPopover({
            width: 320,
            arrow: false,
            placement: 'bottom',
            content,
          });
        },
        noMatch: () => {
          this.unmatchedFact = fact;
        },
      });
    } else {
      this.unmatchedFact = fact;
    }
  }
}

export default new Factual();
