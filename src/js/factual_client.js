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
import FactualBase from './factual_base';
import { removeDiacritics, getDate, getURL } from './util';

class Factual extends FactualBase {
  constructor() {
    super();
    console.info('[factchecker-plugin-chrome] Client init.');

    this.factTemplate = _.template(require('../views/fact.html'));
    this.nfactTemplate = _.template(require('../views/unmatched-fact.html'));

    this.facts = [];
    this.matched = 0;
    this.unmatchedFact = null;
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

      if (request.action === 'content_loaded') {
        chrome.runtime.sendMessage({
          sender: 'factual-client',
          action: 'facts_get',
          msg: window.location.href,
        });
      }

      if (request.action === 'facts_loaded') {
        this.facts = request.facts;
        this.displayFacts();
      }
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
    let sclass = 'true';
    let stext = 'adevărată';

    if (fact.status === 'Fals') {
      sclass = 'false';
      stext = 'falsă';
    } else if (fact.status === 'Parțial fals') {
      sclass = 'pfalse';
      stext = 'parțial falsă';
    } else if (fact.status === 'Parțial adevărat') {
      sclass = 'ptrue';
      stext = 'parțial adevărată';
    } else if (fact.status === 'Neutru') {
      sclass = 'neutral';
      stext = 'neutră';
    }

    let content = this.nfactTemplate({
      status: fact.status,
      stext: stext,
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
      fact.declaratie = removeDiacritics(fact.declaratie);
      let sclass = 'true';

      if (fact.status === 'Fals') {
        sclass = 'false';
      } else if (fact.status === 'Parțial fals') {
        sclass = 'pfalse';
      } else if (fact.status === 'Parțial adevărat') {
        sclass = 'ptrue';
      } else if (fact.status === 'Neutru') {
        sclass = 'neutral';
      }

      this.marker.mark(fact.declaratie, {
        debug: true,
        className: `factchecker-fact-mark-${sclass}`,
        acrossElements: true,
        iframes: true,
        separateWordSearch: false,
        each: (mark) => {
          const content = this.factTemplate({
            status: fact.status,
            quote: fact.declaratie,
            url: fact.url,
            logo: getURL('assets/factual_logo.png'),
            statusClass: sclass,
            date: getDate(fact.date),
          });

          this.matched++;

          $(mark).append(require('../views/factual-mark.html'));

          $(mark).webuiPopover({
            width: 320,
            arrow: false,
            placement: 'bottom',
            content: content,
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
