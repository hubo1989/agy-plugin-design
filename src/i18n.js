'use strict';

// Explicit literal requires for agy-daddy-host/src/core/injector.js static bundler
const LOCALES = {
  'zh-CN': require('../locales/zh-CN.json'),
  'zh-TW': require('../locales/zh-TW.json'),
  ja: require('../locales/ja.json'),
  ko: require('../locales/ko.json'),
  es: require('../locales/es.json'),
  pt: require('../locales/pt.json'),
  fr: require('../locales/fr.json'),
  ru: require('../locales/ru.json'),
  it: require('../locales/it.json'),
  en: require('../locales/en.json')
};

const SUPPORTED_LOCALES = Object.freeze([
  'zh-CN',
  'zh-TW',
  'ja',
  'ko',
  'es',
  'pt',
  'fr',
  'ru',
  'it',
  'en'
]);

const DEFAULT_LOCALE = 'zh-CN';

const ALIAS_MAP = new Map([
  ['zh', 'zh-CN'],
  ['zh-cn', 'zh-CN'],
  ['zh-hans', 'zh-CN'],
  ['cn', 'zh-CN'],
  ['zh-tw', 'zh-TW'],
  ['zh-hant', 'zh-TW'],
  ['zh-hk', 'zh-TW'],
  ['tw', 'zh-TW'],
  ['hk', 'zh-TW'],
  ['ja', 'ja'],
  ['ja-jp', 'ja'],
  ['jp', 'ja'],
  ['ko', 'ko'],
  ['ko-kr', 'ko'],
  ['kr', 'ko'],
  ['es', 'es'],
  ['es-es', 'es'],
  ['es-419', 'es'],
  ['es-mx', 'es'],
  ['pt', 'pt'],
  ['pt-br', 'pt'],
  ['pt-pt', 'pt'],
  ['fr', 'fr'],
  ['fr-fr', 'fr'],
  ['fr-ca', 'fr'],
  ['ru', 'ru'],
  ['ru-ru', 'ru'],
  ['it', 'it'],
  ['it-it', 'it'],
  ['en', 'en'],
  ['en-us', 'en'],
  ['en-gb', 'en']
]);

function normalizeLocale(raw, fallback = DEFAULT_LOCALE) {
  if (typeof raw === 'string') {
    const clean = raw.trim().toLowerCase().replace(/_/g, '-');
    if (ALIAS_MAP.has(clean)) return ALIAS_MAP.get(clean);
    const primary = clean.split('-')[0];
    if (primary && ALIAS_MAP.has(primary)) return ALIAS_MAP.get(primary);
  }
  if (typeof fallback === 'string') {
    const cleanFb = fallback.trim().toLowerCase().replace(/_/g, '-');
    if (ALIAS_MAP.has(cleanFb)) return ALIAS_MAP.get(cleanFb);
  }
  return DEFAULT_LOCALE;
}

function extractLocaleFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return '';
  if (payload.enabled === false) return 'en';
  const raw = payload.bcp47 || payload.locale || payload.lang || '';
  if (!String(raw || '').trim()) return '';
  return normalizeLocale(String(raw));
}

function t(locale, key, vars = {}) {
  const norm = normalizeLocale(locale, DEFAULT_LOCALE);
  const dict = LOCALES[norm] || LOCALES[DEFAULT_LOCALE];
  const raw = dict[key] ?? LOCALES.en[key] ?? LOCALES[DEFAULT_LOCALE][key] ?? key;
  return String(raw).replace(/\{(\w+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  ));
}

module.exports = {
  LOCALES,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  normalizeLocale,
  extractLocaleFromPayload,
  t
};
