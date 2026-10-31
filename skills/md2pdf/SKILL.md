---
name: md2pdf
description: "Convert Markdown to PDF with math, images, tables and syntax highlighting. Use when the user wants a .md turned into a PDF, asks to export Markdown as PDF, needs LaTeX formulas in a printable document, or says '转 PDF、导出 PDF、渲染 md、打印成 pdf'. Two engine: pandoc + chromium (default, styles are controlled by CSS) and pandoc + typst (small footprint, built-in pagination)."
allowed-tools: Bash(md2pdf *), Bash(pandoc *), Bash(chromium *), Bash(uv *), Bash(pdftoppm *), Bash(pdfinfo *)
---

# md2pdf

Markdown 转 PDF。脚本位于 `~/.pi/agent/skills/md2pdf/bin/md2pdf`，已软链到 `~/.local/bin/md2pdf`。

## 用法

```bash
md2pdf <DOC>.md                             # 默认 chromium 引擎，输出 <DOC>.pdf 到文件相同路径
md2pdf --page-numbers <DOC>.md              # chromium 结果叠加居中页号
md2pdf --outdir <DIR> <PATH>/*.md           # 批量输出到 <DIR>/，目录不存在时创建
md2pdf -e typst <DOC>.md                    # typst 引擎，自带页码
md2pdf -o <PATH>/<DOC>.pdf <DOC>.md         # 指定输出，仅限单文件；父目录不存在时创建
md2pdf --katex-dir ~/katex/dist <DOC>.md    # 指定 KaTeX 目录，仅对 chromium 生效
```

## 两个引擎

| 差异     | chromium（默认）                                                      | typst                                                     |
| -------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| 链路     | pandoc → HTML（KaTeX 渲染公式）→ `chromium --headless --print-to-pdf` | `pandoc --pdf-engine=typst`                               |
| 样式     | 全部在 `style.css`：标题色条、表头底色、代码块底纹、图片圆角          | 全部在 `typst-header.typ`：标题层级、代码块底纹、中文图注 |
| 排版观感 | 符合人类阅读与打印习惯                                                | 朴素，但结构完整                                          |
| 页码     | 需 `--page-numbers`，由 pypdf 叠加居中页号                            | 原生，居中                                                |
| 公式     | 系统 KaTeX，找不到时依次退到 MathJax、MathML                          | typst 原生数学                                            |
| 体积     | 大：整套 CJK 字体嵌入                                                 | 小：字体子集化                                            |
| 表格     | 宽 100%，单元格自动换行                                               | 列宽由 pandoc 生成的 `auto` 决定，长标识会折成多行        |
| 适用     | 交付物、表格多，或需要改样式                                          | 长文档、在意体积，或只需要页码                            |

## 资源与定制

- `style.css`：chromium 引擎的版式
- `typst-header.typ`：typst 引擎的版式，经 pandoc `-H` 注入
- `bin/add_page_numbers.py`：页号叠加器，pypdf + reportlab，由 `uv run` 在隔离环境执行
- 封面标题、作者、日期读 md 的 YAML front matter（`title` / `author` / `date`）；无 `title` 时不生成标题块
- 图片相对路径按 md 所在目录解析，与调用时的 cwd 无关
- 字体：正文 `Noto Serif SC`，标题 `Noto Sans SC`，代码 `Hack` / `Sarasa Mono SC`
- 改 CSS 或 `typst-header.typ` 后直接重跑，无需重装

## 依赖

```bash
paru -S --needed pandoc-bin typst chromium katex
```

公式后端默认按此顺序查找：`/usr/lib/node_modules/katex/dist` -> `/usr/share/mathjax/tex-chtml.js` -> MathML。`--katex-dir` 可替换第一项，目录内缺 `katex.min.js` 时报错退出，不静默回退。

`--page-numbers` 需要 `uv`，首次运行会把 pypdf、reportlab 下载到 uv 缓存。该参数只作用于 chromium 引擎；typst 自带页码，传入值被忽略。

## 检查结果

```bash
pdfinfo out.pdf | grep -E 'Pages|Page size'
pdftoppm -r 80 -png out.pdf /tmp/pg && ls /tmp/pg-*.png   # 逐页转图核对
```

## 已知限制

- AUR 的 `katex` 包会把 `commander` 装进 `/usr/lib/node_modules/katex/node_modules`，不受 pacman 管理，卸载 `katex` 后可能残留
- Chromium 不支持 CSS `@page` 边距框，无法自行输出页码；页号只能由 pypdf 后处理，因此叠加页码会重写一遍 PDF
- typst 引擎不读 `style.css`；pandoc 缺 zh-CN 翻译表会警告，脚本统一加 `--quiet` 静默，同时也会静默缺图片等提示
- 公式块超过页宽时不缩放，需要手动拆行
- chromium 输出体积由嵌入字体决定，`gs` 压缩收益很小；必须小体积时换 typst
- 两个引擎都传入 `-f markdown-smart`，关闭 pandoc 的智能标点：默认开启时中文语境里的 `"引号"` 会被判成右引号（渲染为 `”引号”`）。关闭后 ASCII 引号、`--`、`...` 原样保留；需要弯引号或长破折号时直接写 `“”`、`—`
- 批量输出时若不同目录存在同名 md，`--outdir` 会让后者覆盖前者
