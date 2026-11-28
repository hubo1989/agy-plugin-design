// Agy Design Studio · 技能元数据与隔离路径解析
// 对齐 baoyu-design v2.12.0 及 Agy-Daddy 微内核 v2 规范
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __metaFilename = fileURLToPath(import.meta.url);
const __defaultPluginRoot = path.dirname(path.dirname(__metaFilename));
export const PLUGIN_ID = 'hubo1989.design';

function isTestMode() {
  return process.env.AGY_DADDY_TEST_MODE === '1'
    || process.env.NODE_ENV === 'test'
    || Boolean(process.env.NODE_TEST_CONTEXT)
    || (Array.isArray(process.execArgv) && process.execArgv.includes('--test'));
}

export function resolveAgyStateDir(options = {}) {
  if (options.stateDir) return path.resolve(options.stateDir);
  if (process.env.AGY_DADDY_STATE_DIR?.trim()) return path.resolve(process.env.AGY_DADDY_STATE_DIR.trim());
  if (isTestMode()) {
    return path.join(os.tmpdir(), `agy-daddy-test-state-${process.pid}`);
  }
  const home = options.homeDir || os.homedir();
  const platform = options.platform || process.platform;
  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'AgyDaddy');
  }
  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'AgyDaddy');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'agy-daddy');
}

export function resolveAgyPluginsDir(options = {}) {
  if (options.pluginsDir) return path.resolve(options.pluginsDir);
  if (process.env.AGY_DADDY_PLUGINS_DIR?.trim()) return path.resolve(process.env.AGY_DADDY_PLUGINS_DIR.trim());
  if (isTestMode()) {
    return path.join(resolveAgyStateDir(options), 'plugins');
  }
  const home = options.homeDir || os.homedir();
  const platform = options.platform || process.platform;
  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'AgyDaddy', 'plugins');
  }
  return path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'agy-daddy', 'plugins');
}

export function resolveAgyPluginDataDir(pluginId = PLUGIN_ID, options = {}) {
  return path.join(resolveAgyStateDir(options), 'plugins-data', pluginId);
}

// 严格隔离应用数据目录：仅消费 AGY_DESIGN_HOME，禁止读取 ORCA_DESIGN_HOME / DSH_HOME
export function resolveAgyDesignHome(options = {}) {
  const envSet = process.env.AGY_DESIGN_HOME?.trim();
  if (envSet) return path.resolve(envSet);
  return path.join(resolveAgyPluginDataDir(PLUGIN_ID, options), 'baoyu-design');
}

// 严格隔离焦点状态快照：仅消费 AGY_DESIGN_STATE_FILE，禁止读取 ORCA_STATE_FILE
export function resolveAgyStateFile(options = {}) {
  const envSet = process.env.AGY_DESIGN_STATE_FILE?.trim();
  if (envSet) return path.resolve(envSet);
  return path.join(resolveAgyPluginDataDir(PLUGIN_ID, options), 'runtime-state.json');
}

export function computeGalleryBuildId(pluginRoot = __defaultPluginRoot) {
  const hash = crypto.createHash('sha256');
  hash.update(String(pluginRoot));
  for (const rel of ['src/gallery-server.mjs', 'src/gallery-ui.mjs', 'src/gallery-locales.mjs', 'src/builtin-library.mjs', 'src/skills-meta.mjs']) {
    try {
      hash.update(fs.readFileSync(path.join(pluginRoot, rel)));
    } catch {}
  }
  return hash.digest('hex').slice(0, 16);
}

export const GALLERY_BUILD_ID = computeGalleryBuildId(__defaultPluginRoot);

export const SKILLS = [
  {
    id: 'claude-slides',
    name: '幻灯片',
    nameEn: 'Slides',
    plugin: 'dsh-claude-slides',
    icon: '🖼️',
    port: 4710,
    tint: '#e8703a',
    titlePath: ['project/deck.json', 'title'],
    marker: 'project/deck.json',
    folder: ['project'],
    prompt: '帮我做一份幻灯片：\n风格：\n受众：\n时长：\n核心信息：\n数据或素材：\n页数偏好：\n语言：\n（风格槽为空必须先问用户再动手；无大纲时用叙事弧（钩子→定调→主体→转折→收束）先出一页式大纲再生成）（每个 section 需带 data-layout="S01封面|S02章节|S03要点|S04引文|S05数据" 标注，版式约束见插件 references/layouts.json；未登记版式视为不合格）',
    about: '做可以编辑的幻灯片，能直接演示，也能导出 PDF、HTML 或 PowerPoint。',
  },
  {
    id: 'claude-design',
    name: '设计',
    nameEn: 'Canvas',
    plugin: 'dsh-claude-design',
    icon: '🎨',
    port: 4720,
    tint: '#7a5cf0',
    titlePath: ['project/canvas.json', 'title'],
    marker: 'project/canvas.json',
    folder: ['project'],
    prompt: '帮我设计：',
    about: '在一张画布上并排做几版设计稿，每一版都能直接改。',
  },
  {
    id: 'claude-design-system',
    name: '设计系统',
    nameEn: 'Design System',
    plugin: 'dsh-claude-design-system',
    icon: '🧩',
    port: 4730,
    tint: '#c79a1b',
    titlePath: ['project/design-system.json', 'title'],
    marker: 'project/design-system.json',
    folder: ['project'],
    prompt: '帮我做一套设计系统，品牌是：',
    about: '做一套设计系统：颜色、字体、组件、素材，加一本品牌手册。',
  },
  {
    id: 'claude-dashboard',
    name: '看板',
    nameEn: 'Dashboard',
    plugin: 'dsh-claude-dashboard',
    icon: '📊',
    port: 4740,
    tint: '#e5484d',
    titlePath: ['db/dash/meta.json', 'title'],
    marker: 'db/dash/meta.json',
    folder: ['db', '_blobs', 'src'],
    prompt: '帮我做一个数据看板，数据是：',
    about: '用你的数据文件做看板：图表、数字和表格，数据变了就跟着更新。',
  },
  {
    id: 'claude-motion',
    name: '动画',
    nameEn: 'Motion',
    plugin: 'dsh-claude-motion',
    icon: '🎬',
    port: 4760,
    tint: '#1fa971',
    titlePath: ['db/film/meta.json', 'title'],
    marker: 'db/film/meta.json',
    folder: ['db', '_blobs', 'src'],
    prompt: '帮我做一段动画，内容是：',
    about: '做短动画，导出 MP4 或 GIF。',
  },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export const TITLES = Object.fromEntries(SKILLS.map((s) => [s.id, s.titlePath]));

export const TINTS = Object.fromEntries(SKILLS.map((s) => [s.id, s.tint]));

export const FOLDER = Object.fromEntries(SKILLS.map((s) => [s.id, s.folder]));

export const ROOT_MARKERS = Object.fromEntries(SKILLS.map((s) => [s.id, [s.marker]]));

export const DEFAULT_PORTS = Object.fromEntries(SKILLS.map((s) => [s.id, s.port]));

export const RECIPES = [
  {
    id: 'ds-to-all',
    title: '设计系统 → 全家统一',
    desc: '先做一套设计系统，再用它的 token 做幻灯片',
    template: '帮我先在当前工作区建立一套设计系统（品牌、色板、字体、间距），完成后基于这套设计系统的 token 直接做一份幻灯片，两步连续完成，风格保持统一。品牌是：',
  },
  {
    id: 'canvas-to-motion',
    title: '画布多稿 → 动效演示',
    desc: '画布上探索几版设计，选优后做成动效',
    template: '帮我在画布上并排做 3 版设计方案探索，比较后选出最优一版，然后把选中的方案做成一段动效演示。主题是：',
  },
  {
    id: 'data-to-report',
    title: '数据 → 看板 → 汇报',
    desc: '先做数据看板，再产出汇报幻灯片',
    template: '帮我先做一个数据看板（指标、图表、布局），看板完成后基于看板内容做一份汇报幻灯片，要点直接取自看板数据。数据是：',
  },
  {
    id: 'explore-to-ds',
    title: '画布探索 → 沉淀设计系统',
    desc: '画布上试风格，定稿后沉淀成设计系统',
    template: '帮我在画布上探索一个产品的视觉方向（多稿），定稿后把确定的风格沉淀成一套可复用的设计系统。产品是：',
  },
];

export const PROMPTS = Object.fromEntries(SKILLS.map((s) => [s.id, s.prompt]));

export const EDITOR_FILES = [
  '.artifact-server.json',
  '.artifact-server.log',
  '.sharing.json',
  '.gitignore',
  '.DS_Store',
  'comments.json',
  'history',
  'exports',
];

export const NOT_CONTENT = new Set([
  ...EDITOR_FILES,
  '.sessions.json',
  '.git',
  'node_modules',
  '.orca',
  '.agy-daddy',
  '.agents',
  'dist',
]);

export {
  BUILTIN_EXAMPLES,
  BUILTIN_BY_ID,
  BUILTIN_TEMPLATES as EXAMPLE_TEMPLATES,
  BUILTIN_INDEX as EXAMPLE_INDEX,
} from './builtin-library.mjs';
