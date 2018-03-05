/**
 * @file Factual Client
 * @name Factual
 *
 * Factual extension client code.
 *
 * @author Alexandru Badiu <andu@ctrlz.ro>
 */
import Rx from 'rx';
import Mark from 'mark.js';
import 'webui-popover';
import MutationSummary from 'mutation-summary';
import { getURL, getUrlCode, isFacebook, getFacebookUrl } from './util';

class Factual {
  constructor() {
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
      if (request.action === 'settings-updated') {
        this.settings = request.msg;
      }

      if (request.action === 'content-loaded') {
        if (isFacebook()) {
          this.handleFacebook();
        } else {
          chrome.runtime.sendMessage({ action: 'facts-get', url: window.location.href }, (facts) => {
            this.facts = Array.isArray(facts) ? facts : [];
            this.displayFacts();

            chrome.runtime.sendMessage({ action: 'action-update', numFacts: this.facts.length });
          });
        }
      }
    });
  }

  handleFacebook() {
    this.fbStream$ = new Rx.Subject();
    this.fbArticles$ = this.fbStream$
      .filter(article => !$(article.context).hasClass('factual-processed'))
      .filter(article => article.url)
      .flatMap((article) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'facts-get',
            url: article.url,
          }, (facts) => {
            resolve(Object.assign({}, article, {
              fact: facts.length ? facts[0] : null,
            }));
          });
        });
      })
      .filter(article => article.fact);

    this.fbArticles$.subscribe((article) => {
      this.displayFacebookFact(article);
    });

    $('div[role=article]').each((i, article) => {
      this.fbStream$.onNext({
        context: article,
        url: getFacebookUrl(article),
      });
    });

    this.facebookObserver = new MutationSummary({
      callback: summaries => this.mutationFacebook(summaries),
      queries: [
        {
          element: 'div[role=article]',
        },
      ],
    });
  }

  mutationFacebook(summaries) {
    if (summaries.length && summaries[0].added && summaries[0].added.length) {
      summaries[0].added.forEach((article) => {
        this.fbStream$.onNext({
          context: article,
          url: getFacebookUrl(article),
        });
      });
    }
  }

  displayFacebookFact(article) {
    const content = this.facebookFactTemplate({
      status: article.fact.status,
      stext: article.fact.stext,
      url: article.fact.url,
      logo: getURL('assets/factual_logo.png'),
      statusClass: article.fact.sclass,
    });

    $('div', article.context).first().after($(content));
    $(article.context).addClass('factual-processed');
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
    let content = this.nfactTemplate({
      status: fact.status,
      stext: fact.stext,
      url: fact.url,
      logo: getURL('assets/factual_logo.png'),
      statusClass: fact.sclass,
    });

    content = $(content);

    $('.factchecker-fact-details__close a', content).on('click', () => {
      $('.factchecker-fact-details-container').fadeOut();
    });

    $('body').append(content);
  }

  displayFact(fact) {
    if (fact.quote) {
      const factClass = `factchecker-${getUrlCode(fact.url)}`;
      this.marker.mark(fact.quote, {
        className: `${factClass} factchecker-fact-mark factchecker-fact-mark-${fact.sclass}`,
        acrossElements: true,
        separateWordSearch: false,
        each: (factMark) => {
          const content = this.factTemplate({
            status: fact.status,
            quote: fact.quote,
            url: `${fact.url}?client=chrome_extension`,
            logo: getURL('assets/factual_logo.png'),
            statusClass: fact.sclass,
            date: fact.date,
          });

          this.matched++;

          $(factMark).webuiPopover({
            width: 320,
            arrow: false,
            placement: 'bottom',
            content,
            onShow: (element) => {
              $('.factchecker-fact-details__close a', element).on('click', () => {
                $(factMark).webuiPopover('hide');
              });
            },
          });
        },
        done: () => {
          $(`.${factClass}`).last().addClass('factchecker-fact-mark-icon');
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
