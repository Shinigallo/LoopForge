import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { loadApp, WEB_ROOT } from '../lib/load-app.mjs';

const HAN = /[\u3400-\u9fff]/;
const ATTRS = ['placeholder', 'title', 'aria-label', 'data-tip', 'data-tooltip'];

// A page in a target language: i18n.js rewrites the Chinese copy with i18n-<lang>.js.
async function translatedPage(html, lang = 'en') {
  const dom = new JSDOM(html.replace('<html', `<html data-lang="${lang}"`), { runScripts: 'outside-only', url: 'http://127.0.0.1/' });
  for (const file of [`i18n-${lang}.js`, 'i18n.js']) {
    new vm.Script(await readFile(path.join(WEB_ROOT, file), 'utf8'), { filename: file }).runInContext(dom.getInternalVMContext());
  }
  return dom.window;
}
const englishPage = (html) => translatedPage(html, 'en');
const italianPage = (html) => translatedPage(html, 'it');

function leftoverChinese(roots) {
  const left = [];
  for (const root of roots) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (el.closest('[data-i18n-skip]')) continue;
      for (const node of el.childNodes) if (node.nodeType === 3 && HAN.test(node.nodeValue)) left.push(node.nodeValue.trim());
      for (const name of ATTRS) {
        const value = el.getAttribute(name);
        if (value && HAN.test(value)) left.push(`${name}="${value}"`);
      }
    }
  }
  return left;
}

test('English mode leaves no Chinese in the navigation, the top bar or the 个人配置 heading', async () => {
  const window = await englishPage(await readFile(path.join(WEB_ROOT, 'index.html'), 'utf8'));
  const { document } = window;
  const roots = [...document.querySelectorAll('#platformRail, #settingsSidebar, .topbar, #settingsView .page-heading')];
  assert.equal(roots.length, 4);
  assert.deepEqual(leftoverChinese(roots), []);
  assert.equal(document.querySelector('#settingsSidebar [data-view="settings"] .nav-label').textContent, 'Personal settings');
  assert.equal(document.querySelector('#platformRail [data-view="observability"]').dataset.tooltip, 'Usage');
  window.close();
});

test('English mode translates every page title and the copy the app renders into the navigation', async (t) => {
  const app = await loadApp({ dispatchReady: false });
  t.after(app.close);
  const window = await englishPage('<html><body></body></html>');
  const titles = app.evaluate('viewTitles()');
  const untranslated = Object.entries(titles).filter(([, zh]) => HAN.test(window.lfTranslate(zh)));
  assert.deepEqual(untranslated, []);
  for (const text of ['收起设置导航', '展开设置导航', '收起导航', '展开导航', '返回首页', '拖动调整侧栏宽度，双击恢复默认', '调整侧栏宽度',
    'alice (alice) · 点击查看个人信息', '当前为访客身份 · 点击查看个人信息', '认证换票未通过 · 点击查看个人信息']) {
    assert.doesNotMatch(window.lfTranslate(text), HAN, text);
  }
  window.close();
});

test('English mode translates the 个人配置 credential panel and the hints that point to it', async (t) => {
  const app = await loadApp({ dispatchReady: false });
  t.after(app.close);
  const window = await englishPage('<html><body></body></html>');
  const panel = window.document.createElement('div');
  panel.innerHTML = app.evaluate('credentialPanelHTML({})');
  window.document.body.append(panel);
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  assert.deepEqual(leftoverChinese([panel]), []);
  for (const text of ['需由责任人本人在个人配置中配置', '个人配置 · 一次配齐', '打开个人配置 →', 'CodeBuddy 使用个人配置中保存的 API Key',
    '到个人配置补充 Codex API Key', '将使用个人配置中的 API 凭证', '已切换；请先到个人配置补充该 CLI 的 API Key', '去个人配置配置',
    '请先在个人配置中配置自己的 CodeBuddy API Key', '请先配置个人 CodeBuddy API Key',
    '使用仓库进行需求分析、访问私有代码或提交 PR 前，请先配置 Git 访问令牌。SOP 使用需求责任人的 Token，未指定时使用项目 Owner 的 Token。',
    // The shared-key refusal lists the allowed models, so only its two sentences are in the dictionary.
    '未配置个人 CodeBuddy API Key 时只能使用平台管理员允许的模型（glm-5.1、kimi-k2.6）。要使用其他模型，请先在个人配置中配置自己的 CodeBuddy API Key']) {
    assert.doesNotMatch(window.lfTranslate(text), HAN, text);
  }
  assert.equal(window.lfTranslate('未配置个人 CodeBuddy API Key 时只能使用平台管理员允许的模型（glm-5.1、kimi-k2.6）。要使用其他模型，请先在个人配置中配置自己的 CodeBuddy API Key'),
    'Without a personal CodeBuddy API key you can only use the models a platform admin allowed (glm-5.1, kimi-k2.6). To use other models, set your own CodeBuddy API key in Personal settings first');
  window.close();
});

test('Italian mode leaves no Chinese in the navigation, the top bar or the 个人配置 heading', async () => {
  const window = await italianPage(await readFile(path.join(WEB_ROOT, 'index.html'), 'utf8'));
  const { document } = window;
  const roots = [...document.querySelectorAll('#platformRail, #settingsSidebar, .topbar, #settingsView .page-heading')];
  assert.equal(roots.length, 4);
  assert.deepEqual(leftoverChinese(roots), []);
  assert.equal(document.querySelector('#settingsSidebar [data-view="settings"] .nav-label').textContent, 'Impostazioni personali');
  assert.equal(document.querySelector('#platformRail [data-view="observability"]').dataset.tooltip, 'Statistiche');
  window.close();
});

test('Italian mode translates every page title, navigation copy and the 个人配置 credential panel', async (t) => {
  const app = await loadApp({ dispatchReady: false });
  t.after(app.close);
  const window = await italianPage('<html><body></body></html>');
  const titles = app.evaluate('viewTitles()');
  const untranslated = Object.entries(titles).filter(([, zh]) => HAN.test(window.lfTranslate(zh)));
  assert.deepEqual(untranslated, []);
  for (const text of ['收起设置导航', '展开设置导航', '收起导航', '展开导航', '返回首页', '拖动调整侧栏宽度，双击恢复默认', '调整侧栏宽度',
    'alice (alice) · 点击查看个人信息', '当前为访客身份 · 点击查看个人信息', '认证换票未通过 · 点击查看个人信息',
    '未配置个人 CodeBuddy API Key 时只能使用平台管理员允许的模型（glm-5.1、kimi-k2.6）。要使用其他模型，请先在个人配置中配置自己的 CodeBuddy API Key']) {
    assert.doesNotMatch(window.lfTranslate(text), HAN, text);
  }
  const panel = window.document.createElement('div');
  panel.innerHTML = app.evaluate('credentialPanelHTML({})');
  window.document.body.append(panel);
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  assert.deepEqual(leftoverChinese([panel]), []);
  assert.equal(window.lfTranslate('第 2 阶段'), 'Fase 2');
  assert.equal(window.lfTranslate('第 3 轮'), 'Turno 3');
  assert.equal(window.lfTranslate('a · 高 · b'), 'a · Alta · b');
  assert.equal(window.lfTranslate('2026年5月'), 'Mag 2026');
  assert.equal(window.lfTranslate('2次'), '2 volte');
  assert.equal(window.lfTranslate('1步'), '1 passaggio');
  assert.equal(window.lfT('登录', 'Sign in', 'Accedi'), 'Accedi');
  assert.equal(window.lfT('登录', 'Sign in'), 'Accedi');
  assert.equal(window.lfNextLang(), 'zh');
  window.close();
});

test('Italian dictionary matches all English dictionary keys with no leftover Chinese or em dashes', async () => {
  const ctx = { window: {} };
  for (const file of ['i18n-en.js', 'i18n-it.js']) {
    vm.runInNewContext(await readFile(path.join(WEB_ROOT, file), 'utf8'), ctx, { filename: file });
  }
  const enKeys = Object.keys(ctx.window.LF_I18N_EN);
  const itDict = ctx.window.LF_I18N_IT;
  const itKeys = Object.keys(itDict);
  assert.equal(itKeys.length, enKeys.length);
  const missing = enKeys.filter((k) => !Object.prototype.hasOwnProperty.call(itDict, k));
  assert.deepEqual(missing, []);
  const emDashes = Object.entries(itDict).filter(([, v]) => v.includes('—'));
  assert.deepEqual(emDashes, []);
  const hanValues = Object.entries(itDict).filter(([k, v]) => k !== '中 / EN' && HAN.test(v));
  assert.deepEqual(hanValues, []);
});
