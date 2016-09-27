import { removeDiacritics, getDate, getShortUrl } from './util';

export const getFactInfo = (fact) => {
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

  return [
    sclass,
    stext,
  ];
};

export const convertFact = (f) => {
  const fact = {};

  fact.source = getShortUrl(f.sursa);
  fact.quote = f.declaratie ? removeDiacritics(f.declaratie) : null;
  fact.status = f.status;
  fact.url = f.url;
  fact.date = getDate(f.date);

  [fact.sclass, fact.stext] = getFactInfo(fact);

  return fact;
};

export const convertFacts = (fs) => {
  const facts = [];

  Object.keys(fs).forEach((key) => {
    const f = fs[key];
    const fact = {};

    fact.date = f.date;
    fact.status = f.status;
    fact.url = f.url;
    fact.declaratie = f.context;

    if (f.links.length) {
      f.links.forEach((l) => {
        const sfact = Object.assign({}, fact);

        sfact.sursa = l[0];
        sfact.declaratie = l[1];

        facts.push(convertFact(sfact));
      });
    }

    if (f.sursa) {
      const exists = _.filter(facts, { source: getShortUrl(f.sursa) });
      if (!exists) {
        fact.sursa = f.sursa;

        facts.push(convertFact(fact));
      }
    }
  });

  return facts;
};
