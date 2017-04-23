import Rx from 'rx';
import config from './config';
import { encodeParams, getUrlCode, getShortUrl } from './util';
import { convertFact, convertFacts } from './fact';

let factsCache = [];

export const setFactsCache = (facts) => {
  factsCache = facts;
};

export const getFactsFromCache = (url) => {
  return _.filter(factsCache, { source: getShortUrl(url) });
};

export const getFacts = (url, uid, client, origin) => {
  return new Promise((resolve) => {
    const urlCode = getUrlCode(url);
    const params = {
      q: urlCode,
      u: uid,
      client,
      origin,
    };

    console.info('[factchecker-plugin-chrome] Querying for facts.', `http:\/\/${config.api}?${encodeParams(params)}`);

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
};

const getFactsForPage = (page, uid, client, origin) => {
  const params = {
    page,
    q: 'all',
    u: uid,
    client,
    origin,
  };

  return Rx.Observable.fromPromise(new Promise((resolve) => {
    console.info('[factchecker-plugin-chrome] Caching facts.', `http:\/\/${config.api}?${encodeParams(params)}`);

    $.ajax({
      dataType: 'json',
      url: `http:\/\/${config.api}?${encodeParams(params)}`,
    }).then((response) => {
      const result = {
        total_pages: 0,
        current_page: 0,
        data: [],
      };

      if (response.error) {
        return resolve(result);
      }

      result.total_pages = response.total_pages;
      result.current_page = response.current_page;

      if (response.data) {
        result.data = convertFacts(response.data);
      }

      return resolve(result);
    });
  }));
};

export const getAllFacts = (uid, client, origin) => {
  return new Promise((resolve) => {
    const facts$ = new Rx.Subject();
    let facts = [];

    facts$
      .flatMap(page => getFactsForPage(page, uid, client, origin))
      .subscribe(
        (result) => {
          facts = facts.concat(result.data);

          if (result.total_pages > result.current_page) {
            facts$.onNext(result.current_page + 1);
          } else {
            facts$.onCompleted();
          }
        },
        (error) => {
          console.log('error');
          console.log(error);
        },
        () => {
          resolve(facts);
        }
      );

    facts$.onNext(0);
  });
};
