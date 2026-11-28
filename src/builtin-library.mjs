const canvasDocument = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Hello Canvas</title>
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>*{box-sizing:border-box}body{margin:0}.dc-artboard{width:880px;height:560px;background:#0ea5e9;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.dc-artboard h1{margin:0;font-size:52px;letter-spacing:-1.5px}.dc-artboard p{margin:0;font-size:16px;opacity:.88}</style>
</helmet>
<div class="dc-artboard">
  <h1>Hello Canvas</h1>
  <p>Agy Design Studio · Editable Infinite Canvas</p>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":880,"height":560}}'>
class Component extends DCLogic {}
</script>
</body>
</html>
`;

const canvasPreviewHtml = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;min-height:750px;background:#0ea5e9;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}h1{margin:0;font-size:68px;letter-spacing:-2px}p{margin:0;font-size:20px;opacity:.88}</style></head><body><h1>Hello Canvas</h1><p>Agy Design Studio · Editable Infinite Canvas</p></body></html>`;

const slideCoverHtml = `<section style="background:#1e293b;color:#fff;display:flex;align-items:center;justify-content:center"><h1 style="font-size:96px;font-family:-apple-system,sans-serif">示例演示</h1></section>`;

const slidePreviewHtml = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;min-height:750px;background:#1e293b;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}h1{margin:0;font-size:68px;letter-spacing:-1.5px}p{margin:0;font-size:18px;color:#cbd5e1}</style></head><body><h1>示例演示</h1><p>PRESENTATION · 1920 × 1080</p></body></html>`;

const designSystemPreviewHtml = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;min-height:750px;background:#f8fafc;color:#0f172a;padding:64px;display:flex;flex-direction:column;justify-content:space-between;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.eyebrow{font-size:14px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#2563eb}h1{margin:20px 0 16px;font-size:64px;letter-spacing:-2px}p{margin:0;font-size:20px;color:#475569;line-height:1.6}.swatches{display:flex;gap:14px}.swatch{width:64px;height:28px;border-radius:8px;border:1px solid rgba(15,23,42,.1)}</style></head><body><div class="eyebrow">DESIGN SYSTEM SKELETON</div><div><h1>Example Design System</h1><p>Shared color, typography, spacing tokens, and component docs for your workspace.</p></div><div class="swatches"><span class="swatch" style="background:#2563eb"></span><span class="swatch" style="background:#0f172a"></span><span class="swatch" style="background:#64748b"></span><span class="swatch" style="background:#e2e8f0"></span><span class="swatch" style="background:#f8fafc"></span></div></body></html>`;

const canvasIndex = (title, width = 880, height = 560) => ({
  v: 3,
  launch: { view: 'canvas' },
  pages: [],
  boards: { 'Main.dc.html': { x: 0, y: 0, w: width, h: height, title } },
  order: ['Main.dc.html'],
  notes: {},
  designSystems: [],
});

export const BUILTIN_EXAMPLES = [
  {
    id: 'claude-design',
    skill: 'claude-design',
    dirName: 'design-demo',
    title: '单页画布示例',
    titleEn: 'Single-board Canvas Demo',
    desc: '包含一个 880 × 560 可编辑画板的极简通用画布骨架，可直接打开编辑或交由 Agent 延展。',
    descEn: 'Minimal editable 880 × 560 canvas board starter ready for direct editing or agent expansion.',
    points: '880 × 560 可编辑 DC 画板与基础结构索引。',
    pointsEn: '880 × 560 editable DC artboard and canvas index scaffold.',
    label: 'CANVAS STARTER',
    html: canvasPreviewHtml,
    files: {
      'project/canvas.json': '__INDEX__',
      'project/Main.dc.html': canvasDocument,
    },
    index: canvasIndex('欢迎', 880, 560),
  },
  {
    id: 'claude-slides',
    skill: 'claude-slides',
    dirName: 'slides-demo',
    title: '通用演示封面示例',
    titleEn: 'Presentation Cover Demo',
    desc: '1920 × 1080 标准演示文稿封面骨架，支持新增幻灯片、实时预览与导出 PDF / HTML / PPTX。',
    descEn: '1920 × 1080 presentation cover scaffold supporting live editing and PDF / HTML / PPTX export.',
    points: '1920 × 1080 标准封面幻灯片与 deck.json 索引。',
    pointsEn: '1920 × 1080 cover slide and deck.json manifest.',
    label: 'SLIDES STARTER',
    html: slidePreviewHtml,
    files: {
      'project/deck.json': '__INDEX__',
      'project/slides/cover.html': slideCoverHtml,
    },
    index: {
      v: 4,
      lists: 'css',
      order: ['cover'],
      cover: 'cover',
      sections: {},
      faces: {},
      designSystems: [],
    },
  },
  {
    id: 'claude-design-system',
    skill: 'claude-design-system',
    dirName: 'design-system-demo',
    title: '通用设计系统骨架',
    titleEn: 'Design System Skeleton',
    desc: '中性的设计系统项目骨架，包含 design-system.json、tokens.json 与说明文档，供工作区 Agent 持续完善。',
    descEn: 'Neutral design system scaffold with design-system.json, tokens.json, and README for agent customization.',
    points: 'design-system.json、空 tokens.json 与可拓展文档入口。',
    pointsEn: 'design-system.json, tokens.json, and README documentation entry.',
    label: 'DESIGN SYSTEM',
    featured: true,
    html: designSystemPreviewHtml,
    files: {
      'project/design-system.json': '__INDEX__',
      'project/README.md': '# 示例设计系统\n\n由 Agy Design Studio 创建的示例骨架。让工作区 agent 参考本目录继续完善。\n',
      'project/tokens.json': '{}',
    },
    index: {
      v: 3,
      layout: 'files',
      namespace: 'ExampleDesignSystem',
      libraries: [],
      sections: {},
      groups: [],
      assetGroups: {},
      blobs: {},
      docs: { readme: 'project/README.md', sections: [] },
      lastChange: {},
    },
  },
];

export const BUILTIN_BY_ID = Object.fromEntries(BUILTIN_EXAMPLES.map((example) => [example.id, example]));
export const BUILTIN_TEMPLATES = Object.fromEntries(
  BUILTIN_EXAMPLES.map(({ id, skill, dirName, files, index, title }) => [
    id,
    { skill, dirName, files, index, title },
  ]),
);
export const BUILTIN_INDEX = Object.fromEntries(BUILTIN_EXAMPLES.map(({ id, index }) => [id, index]));
