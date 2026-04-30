import nlp from 'compromise';

// ── Constants ────────────────────────────────────────────────────────────────

const BE_FORMS = new Set(['is', 'are', 'am', 'was', 'were']);
const HAVE_FORMS = new Set(['has', 'have', 'had']);
const MODAL_FORMS = new Set(['will', 'would', 'can', 'could', 'shall', 'should', 'may', 'might', 'must']);

const IRREGULAR: Record<string, string> = {
  'was': 'be', 'were': 'be', 'is': 'be', 'are': 'be', 'am': 'be',
  'had': 'have', 'has': 'have', 'did': 'do', 'does': 'do',
  'went': 'go', 'gone': 'go', 'came': 'come', 'come': 'come',
  'took': 'take', 'taken': 'take', 'made': 'make', 'got': 'get',
  'gotten': 'get', 'gave': 'give', 'given': 'give', 'told': 'tell',
  'said': 'say', 'thought': 'think', 'bought': 'buy', 'brought': 'bring',
  'found': 'find', 'left': 'leave', 'met': 'meet', 'ran': 'run',
  'sat': 'sit', 'stood': 'stand', 'wrote': 'write', 'written': 'write',
  'ate': 'eat', 'eaten': 'eat', 'drank': 'drink', 'drunk': 'drink',
  'drove': 'drive', 'driven': 'drive', 'flew': 'fly', 'flown': 'fly',
  'grew': 'grow', 'grown': 'grow', 'kept': 'keep', 'led': 'lead',
  'lost': 'lose', 'paid': 'pay', 'put': 'put', 'rode': 'ride',
  'ridden': 'ride', 'rose': 'rise', 'risen': 'rise', 'sent': 'send',
  'set': 'set', 'spoke': 'speak', 'spoken': 'speak', 'spent': 'spend',
  'swam': 'swim', 'swum': 'swim', 'taught': 'teach', 'broke': 'break',
  'broken': 'break', 'chose': 'choose', 'chosen': 'choose', 'drew': 'draw',
  'drawn': 'draw', 'fell': 'fall', 'fallen': 'fall', 'felt': 'feel',
  'fought': 'fight', 'forgot': 'forget', 'forgotten': 'forget',
  'heard': 'hear', 'held': 'hold', 'hurt': 'hurt', 'laid': 'lay',
  'let': 'let', 'lit': 'light', 'meant': 'mean', 'sold': 'sell',
  'slept': 'sleep', 'swore': 'swear', 'sworn': 'swear',
  'threw': 'throw', 'thrown': 'throw', 'understood': 'understand',
  'wore': 'wear', 'worn': 'wear', 'won': 'win',
  'read': 'read', 'saw': 'see', 'seen': 'see', 'knew': 'know', 'known': 'know',
  'built': 'build', 'cut': 'cut', 'hit': 'hit',
  'bled': 'bleed', 'bred': 'breed', 'dealt': 'deal', 'dreamt': 'dream',
  'dreamed': 'dream', 'knelt': 'kneel', 'leant': 'lean',
  'learnt': 'learn', 'lent': 'lend', 'spelt': 'spell', 'spilt': 'spill',
  'wept': 'weep',
};

// negative contractions for tag questions
const NEG_CONTRACTION: Record<string, string> = {
  'do': "don't", 'does': "doesn't", 'did': "didn't",
  'is': "isn't", 'are': "aren't", 'was': "wasn't", 'were': "weren't",
  'am': "aren't",   // "aren't I?"
  'has': "hasn't", 'have': "haven't", 'had': "hadn't",
  'will': "won't", 'would': "wouldn't",
  'can': "can't", 'could': "couldn't",
  'shall': "shan't", 'should': "shouldn't",
  'may': "mayn't", 'might': "mightn't", 'must': "mustn't",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface Term {
  text: string;
  normal: string;
  tags: Set<string>;
}

export interface Question {
  text: string;
  label: string;
}

export interface GeneratedQuestions {
  closed: Question[];
  tag: Question[];
  open: Question[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function cap(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function join(tokens: Term[]): string {
  return tokens.map(t => t.text).join(' ');
}

// Join subject tokens, lowercasing the first word if it was only sentence-initial capitalised
function joinSubject(tokens: Term[]): string {
  if (!tokens.length) return '';
  const first = tokens[0];
  const firstText =
    (!first.tags.has('ProperNoun') && !first.tags.has('Abbreviation') && !first.tags.has('Acronym'))
      ? first.text.charAt(0).toLowerCase() + first.text.slice(1)
      : first.text;
  return [firstText, ...tokens.slice(1).map(t => t.text)].join(' ');
}

function isVerbLike(t: Term): boolean {
  return (
    t.tags.has('Verb') || t.tags.has('Modal') || t.tags.has('Auxiliary') ||
    BE_FORMS.has(t.normal) || HAVE_FORMS.has(t.normal) || MODAL_FORMS.has(t.normal)
  );
}

function isNegation(t: Term): boolean {
  return t.normal === 'not' || t.text.toLowerCase() === "n't";
}

function isPreposition(t: Term): boolean {
  return t.tags.has('Preposition') || t.tags.has('Conjunction');
}

function getBaseForm(verbText: string): string {
  const lower = verbText.toLowerCase();
  if (IRREGULAR[lower]) return IRREGULAR[lower];

  // Try compromise lemmatizer
  const compResult = nlp(lower).verbs().toInfinitive().out('normal') as string;
  if (compResult && compResult !== lower && compResult.length > 0) return compResult;

  // Regular verb fallback rules
  if (lower.endsWith('ied')) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('ed')) {
    const stem = lower.slice(0, -2);
    // doubled consonant: stopped → stop
    if (
      stem.length >= 3 &&
      stem[stem.length - 1] === stem[stem.length - 2] &&
      !'aeiou'.includes(stem[stem.length - 1])
    ) {
      return stem.slice(0, -1);
    }
    // silent e: loved → love
    if (stem.endsWith('e')) return stem;
    return stem.length >= 2 ? stem : lower;
  }
  if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('es') && lower.length > 3) {
    const stem = lower.slice(0, -2);
    if (/[sxz]$/.test(stem) || /[cs]h$/.test(stem)) return stem;
    return lower.slice(0, -1);
  }
  if (lower.endsWith('s') && lower.length > 3) return lower.slice(0, -1);
  return lower;
}

function getSubjectPronoun(subject: Term[]): string {
  if (!subject.length) return 'they';
  const first = subject[0];
  const lower = first.normal;

  // Already a subject pronoun
  if (first.tags.has('Pronoun') || first.tags.has('PronounSubject')) {
    if (lower === 'i') return 'I';
    if (['he', 'she', 'it', 'we', 'you', 'they'].includes(lower)) return lower;
  }

  // Compound (contains "and") → they
  if (subject.some(t => t.normal === 'and')) return 'they';

  // Explicit plural at head noun → they
  const last = subject[subject.length - 1];
  if (last.tags.has('Plural') || last.tags.has('PluralNoun')) return 'they';

  // Demonstratives for things
  if (['this', 'that'].includes(lower)) return 'it';

  // If nothing looks like a person, use "it"
  const hasPerson =
    subject.some(t =>
      t.tags.has('Person') || t.tags.has('FirstName') || t.tags.has('LastName') ||
      ['he', 'she', 'him', 'her'].includes(t.normal)
    );
  if (!hasPerson && !subject.some(t => t.tags.has('ProperNoun'))) return 'it';

  // Default gender-neutral for person
  return 'they';
}

function getWhWordForNP(tokens: Term[]): 'Who' | 'What' {
  const hasPerson = tokens.some(t =>
    t.tags.has('Person') || t.tags.has('FirstName') || t.tags.has('LastName') ||
    t.tags.has('MaleName') || t.tags.has('FemaleName') ||
    ['i', 'me', 'we', 'us', 'you', 'he', 'she', 'him', 'her', 'they', 'them', 'who'].includes(t.normal) ||
    // ProperNoun not tagged as a place → likely a person name
    (t.tags.has('ProperNoun') && !t.tags.has('Place') && !t.tags.has('Country') && !t.tags.has('City'))
  );
  return hasPerson ? 'Who' : 'What';
}

function getWhWordForPP(pp: Term[]): string {
  if (!pp.length) return 'What';
  const prep = pp[0].normal;
  const rest = pp.slice(1);

  const TIME_NOUNS = new Set([
    'year', 'years', 'month', 'months', 'day', 'days', 'hour', 'hours',
    'minute', 'minutes', 'second', 'seconds', 'week', 'weeks', 'decade',
    'decades', 'century', 'centuries', 'time', 'while', 'long',
  ]);
  const TIME_WORDS = new Set([
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'january', 'february', 'march', 'april', 'june', 'july', 'august',
    'september', 'october', 'november', 'december',
    'morning', 'afternoon', 'evening', 'night', 'noon', 'midnight',
    'spring', 'summer', 'autumn', 'fall', 'winter', 'yesterday', 'today', 'tomorrow',
  ]);

  const hasTimeNoun = rest.some(t => TIME_NOUNS.has(t.normal));
  const hasTimeWord = rest.some(t => TIME_WORDS.has(t.normal));
  const hasNumber = rest.some(t =>
    t.tags.has('Value') || t.tags.has('Cardinal') || /^\d+$/.test(t.text)
  );

  if (prep === 'for' && (hasTimeNoun || hasNumber)) return 'How long';
  if (prep === 'since') return 'Since when';
  if (prep === 'during') return 'When';
  if (['after', 'before', 'until', 'till'].includes(prep)) return 'When';

  if (['in', 'at', 'on'].includes(prep)) {
    if (hasTimeWord || hasTimeNoun) return 'When';
    const hasPlace = rest.some(t =>
      t.tags.has('Place') || t.tags.has('City') || t.tags.has('Country') ||
      t.tags.has('Region')
    );
    if (hasPlace) return 'Where';
    // "in 2020" → When, "in Tokyo" → Where — default to Where for in/at/on
    return hasNumber ? 'When' : 'Where';
  }

  if (['from', 'near', 'beside', 'behind', 'above', 'below', 'through', 'across', 'along'].includes(prep)) return 'Where';
  if (prep === 'to') {
    if (rest[0] && (rest[0].tags.has('Verb') || rest[0].tags.has('Infinitive'))) return 'Why';
    return 'Where';
  }
  if (prep === 'with') return 'Who';
  if (prep === 'by') {
    if (rest.some(t => t.tags.has('Person') || t.tags.has('FirstName'))) return 'Who';
    if (hasNumber && hasTimeNoun) return 'When';
    return 'How';
  }
  if (prep === 'about') return 'What';
  if (['because', 'because of', 'due to'].includes(prep)) return 'Why';
  if (prep === 'without') return 'What';

  // Fallback: check for person in rest
  if (rest.some(t => t.tags.has('Person') || t.tags.has('FirstName'))) return 'Who';
  return 'What';
}

interface Modifier {
  tokens: Term[];
  whWord: string;
}

function extractConstituents(
  tokens: Term[]
): { object: Term[] | null; modifiers: Modifier[] } {
  const modifiers: Modifier[] = [];

  // Find first preposition
  const firstPrepIdx = tokens.findIndex(t => isPreposition(t));

  let objectTokens: Term[] | null = null;
  let ppStart: number;

  if (firstPrepIdx === -1) {
    // No preposition — everything is the direct object only if it contains noun-like tokens
    const hasNoun = tokens.some(t =>
      t.tags.has('Noun') || t.tags.has('ProperNoun') || t.tags.has('Pronoun') ||
      t.tags.has('Determiner') || t.tags.has('Possessive')
    );
    objectTokens = (tokens.length > 0 && hasNoun) ? tokens : null;
    ppStart = tokens.length;
  } else if (firstPrepIdx === 0) {
    // Starts immediately with a preposition — no direct object
    objectTokens = null;
    ppStart = 0;
  } else {
    objectTokens = tokens.slice(0, firstPrepIdx);
    ppStart = firstPrepIdx;
  }

  // Extract PP modifiers
  let i = ppStart;
  while (i < tokens.length) {
    if (isPreposition(tokens[i])) {
      const start = i;
      i++;
      while (i < tokens.length && !isPreposition(tokens[i])) i++;
      const pp = tokens.slice(start, i);
      modifiers.push({ tokens: pp, whWord: getWhWordForPP(pp) });
    } else {
      i++;
    }
  }

  return { object: objectTokens, modifiers };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateQuestions(inputSentence: string): GeneratedQuestions {
  const result: GeneratedQuestions = { closed: [], tag: [], open: [] };
  if (!inputSentence.trim()) return result;

  // Strip trailing punctuation
  const sentence = inputSentence.trim().replace(/[.!?]+$/, '').trim();
  if (!sentence) return result;

  // Parse with compromise
  const doc = nlp(sentence);
  const jsonData = doc.json() as Array<{ terms: Array<{ text: string; normal?: string; tags: Record<string, boolean> | string[] }> }>;
  if (!jsonData.length || !jsonData[0].terms?.length) return result;

  const terms: Term[] = jsonData[0].terms.map(t => ({
    text: t.text,
    normal: (t.normal ?? t.text).toLowerCase(),
    tags: new Set<string>(
      Array.isArray(t.tags) ? t.tags : Object.keys(t.tags ?? {})
    ),
  }));

  // Find first verb-like token (subject must come before it)
  let verbIdx = -1;
  for (let i = 1; i < terms.length; i++) {
    if (isVerbLike(terms[i])) { verbIdx = i; break; }
  }
  if (verbIdx === -1) return result;

  const subject = terms.slice(0, verbIdx);
  const verbToken = terms[verbIdx];
  const verbNormal = verbToken.normal;

  // Decide whether to front this verb or use do-support
  const canFront =
    BE_FORMS.has(verbNormal) || HAVE_FORMS.has(verbNormal) || MODAL_FORMS.has(verbNormal);

  // Locate negation immediately after the verb (positions verbIdx+1 or verbIdx+2)
  let negIdx = -1;
  for (let i = verbIdx + 1; i <= Math.min(verbIdx + 2, terms.length - 1); i++) {
    if (isNegation(terms[i])) { negIdx = i; break; }
  }
  const isNegative = negIdx !== -1;

  // Build afterAuxTokens: everything after the fronted verb, excluding negation
  const afterAuxTokens: Term[] = terms.slice(verbIdx + 1).filter((_, idx) => {
    return verbIdx + 1 + idx !== negIdx;
  });

  let frontedAux: string;
  let mainVerbBase: string;
  let doSupport: string;

  if (canFront) {
    frontedAux = verbToken.text;
    doSupport = verbNormal;
    mainVerbBase = '';
  } else {
    const isPast =
      verbToken.tags.has('PastTense') ||
      verbToken.tags.has('PastSimple') ||
      verbToken.tags.has('PastSimpleTense');
    if (isPast) {
      doSupport = 'did';
    } else {
      const subjStr = join(subject).toLowerCase();
      const is3sg =
        ['he', 'she', 'it'].includes(subjStr) ||
        (!subject.some(t => t.normal === 'and') &&
          subject[subject.length - 1]?.tags.has('Singular'));
      doSupport = is3sg ? 'does' : 'do';
    }
    frontedAux = doSupport;
    mainVerbBase = getBaseForm(verbToken.text);
  }

  const subjStr = join(subject);          // original capitalisation (used in tag Q)
  const subjNorm = joinSubject(subject);  // lowercased if sentence-initial
  const pronoun = getSubjectPronoun(subject);

  // Tokens after the lexical verb (for constituent extraction)
  // Skip through any aux-chain after the fronted aux to reach content
  let afterMainVerbTokens: Term[];
  if (canFront) {
    let i = 0;
    // skip BE/HAVE auxiliaries in the chain (e.g. "been" in "has been eating")
    while (
      i < afterAuxTokens.length &&
      (BE_FORMS.has(afterAuxTokens[i].normal) || HAVE_FORMS.has(afterAuxTokens[i].normal))
    ) i++;
    // skip the lexical verb itself
    if (i < afterAuxTokens.length && afterAuxTokens[i].tags.has('Verb')) i++;
    afterMainVerbTokens = afterAuxTokens.slice(i);
  } else {
    afterMainVerbTokens = afterAuxTokens;
  }

  const { object, modifiers } = extractConstituents(afterMainVerbTokens);

  // Strings for building questions
  const afterAuxStr = join(afterAuxTokens);
  const closedBody = canFront
    ? afterAuxStr
    : mainVerbBase + (afterAuxStr ? ' ' + afterAuxStr : '');

  // ── CLOSED QUESTION ───────────────────────────────────────────────────────
  result.closed.push({
    text: (cap(frontedAux) + ' ' + subjNorm + ' ' + closedBody + '?').replace(/\s+/g, ' ').trim(),
    label: 'yes/no question',
  });

  // ── TAG QUESTION ──────────────────────────────────────────────────────────
  const tagContraction = isNegative
    ? doSupport                                          // negative sentence → positive tag
    : (NEG_CONTRACTION[doSupport] ?? doSupport + "n't"); // positive → negative tag
  result.tag.push({
    text: (sentence + ', ' + tagContraction + ' ' + pronoun + '?').replace(/\s+/g, ' ').trim(),
    label: 'tag question',
  });

  // ── OPEN QUESTIONS ────────────────────────────────────────────────────────

  // 1. Subject question — NO subject-aux inversion
  const dummySubj = subjNorm.toLowerCase();
  if (!['it', 'there'].includes(dummySubj)) {
    const subjWh = getWhWordForNP(subject);
    const subjQ = cap(subjWh) + ' ' + verbToken.text + (afterAuxStr ? ' ' + afterAuxStr : '') + '?';
    result.open.push({
      text: subjQ.replace(/\s+/g, ' ').trim(),
      label: `asking about the subject (${subjStr})`,
    });
  }

  // Helper: build inverted body excluding a set of tokens
  const buildInverted = (excludeTokens: Set<Term>): string => {
    if (canFront) {
      const remaining = afterAuxTokens.filter(t => !excludeTokens.has(t));
      return (frontedAux + ' ' + subjNorm + ' ' + join(remaining)).replace(/\s+/g, ' ').trim();
    } else {
      const remainingAfterVerb = afterAuxTokens.filter(t => !excludeTokens.has(t));
      return (doSupport + ' ' + subjNorm + ' ' + mainVerbBase + ' ' + join(remainingAfterVerb))
        .replace(/\s+/g, ' ').trim();
    }
  };

  // 2. Object question
  if (object && object.length > 0) {
    const objText = join(object).toLowerCase();
    if (!['it', 'this', 'that', 'there'].includes(objText)) {
      const objWh = getWhWordForNP(object);
      const inverted = buildInverted(new Set(object));
      result.open.push({
        text: (cap(objWh) + ' ' + inverted + '?').replace(/\s+/g, ' ').trim(),
        label: `asking about the object (${join(object)})`,
      });
    }
  }

  // 3. PP modifier questions
  for (const mod of modifiers) {
    const inverted = buildInverted(new Set(mod.tokens));
    result.open.push({
      text: (cap(mod.whWord) + ' ' + inverted + '?').replace(/\s+/g, ' ').trim(),
      label: `asking about "${join(mod.tokens)}"`,
    });
  }

  return result;
}
