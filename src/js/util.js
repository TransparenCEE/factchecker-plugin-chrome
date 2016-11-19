import qs from 'qs';
import md5 from 'crypto-js/md5';
import diacriticsMap from './diacritics';

export const removeDiacritics = (str) => {
  return str.replace(/[^\u0000-\u007E]/g, (a) => {
    return diacriticsMap[a] || a;
  });
};

export const cleanupQuote = (quote) => {
  let cleanedQuote = removeDiacritics(quote);

  if (cleanedQuote[0] === '"' || cleanedQuote[0] === '„') {
    cleanedQuote = cleanedQuote.substr(1);
  }

  if (cleanedQuote[cleanedQuote.length - 1] === '"' || cleanedQuote[cleanedQuote.length - 1] === '„') {
    cleanedQuote = cleanedQuote.slice(0, -1);
  }

  if (cleanedQuote[cleanedQuote.length - 1] === '\\') {
    cleanedQuote = cleanedQuote.slice(0, -1);
  }

  return cleanedQuote;
};

export const getURL = (file) => {
  return chrome.extension.getURL(file);
};

export const getDate = (timestamp) => {
  const date = new Date(timestamp * 1000);

  return `${date.getDate() < 10 ? '0' : ''}${date.getDate()}.${date.getMonth() < 9 ? '0' : ''}${date.getMonth() + 1}.${date.getFullYear()}`;
};

export const getUserToken = () => {
  const pool = new Uint8Array(32);
  crypto.getRandomValues(pool);

  let uid = '';
  for (let i = 0; i < pool.length; ++i) {
    uid += pool[i].toString(16);
  }

  return uid;
};

export const isFacebook = () => {
  return window.location.href.indexOf('https://www.facebook.com/') === 0;
};

export const extractLink = (url) => {
  const fbUrls = [
    'www.facebook.com/l.php?u=',
    'l.facebook.com/l.php?u=',
  ];

  let found = false;
  fbUrls.forEach((u) => {
    if (url.indexOf(`http://${u}`) === 0 || url.indexOf(`https://${u}`) === 0) {
      found = true;
    }
  });

  if (!found) {
    return url;
  }

  const parsed = qs.parse(url.split('?')[1]);

  return parsed.u;
};

export const encodeParams = (params) => {
  return qs.stringify(params);
};

export const getShortUrl = (url) => {
  const parser = document.createElement('a');
  parser.href = url;

  let purl = `${parser.host}${parser.pathname}`;
  purl = purl.replace(/^(www\.)/, '');

  if (purl[purl.length - 1] === '/') {
    purl = purl.substr(0, purl.length - 1);
  }

  return purl;
};

export const getUrlCode = (url) => {
  return md5(getShortUrl(url)).toString();
};

export const getFacebookUrl = (article) => {
  const url = $('a[rel=nofollow]', article).prop('href');
  if (!url) {
    return null;
  }

  const aurl = extractLink(url);
  return aurl;
};
