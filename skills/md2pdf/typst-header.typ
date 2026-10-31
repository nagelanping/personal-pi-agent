// 正文
#set par(justify: false)
#set list(spacing: 0.4em)
#set enum(spacing: 0.4em)

// 标题层级
#show heading.where(level: 1): it => block(above: 2em, below: 0.8em, breakable: false, sticky: true)[
  #set text(size: 1.5em, weight: "bold")
  #it.body
  #v(-0.3em)
  #line(length: 100%, stroke: 0.7pt + rgb("#2b6cb0"))
]
#show heading.where(level: 2): it => block(above: 2.4em, below: 0.55em, breakable: false, sticky: true)[
  #set text(size: 1.2em, weight: "bold")
  #pad(left: 0pt)[#it.body]
]
#show heading.where(level: 3): it => block(above: 1.2em, below: 0.35em, breakable: false, sticky: true)[
  #set text(size: 1.06em, weight: "bold")
  #it.body
]

// 代码块
#show raw.where(block: true): it => block(
  fill: rgb("#f7f8fa"), stroke: 0.5pt + rgb("#e3e6ea"),
  inset: (x: 10pt, y: 8pt), radius: 3pt, width: 100%, breakable: true,
  above: 0.8em, below: 0.8em,
)[
  #set par(leading: 0.5em)
  #set text(size: 0.84em, font: ("Hack", "Sarasa Mono SC"))
  #it
]
#show raw.where(block: false): it => box(
  fill: rgb("#f1f3f5"), inset: (x: 2.5pt, y: 0.8pt), radius: 2pt,
)[#set text(size: 0.88em, fill: rgb("#b03a2e")); #it]

// 引用块
#show quote.where(block: true): it => block(
  inset: (left: 10pt, y: 2pt), stroke: (left: 2.5pt + rgb("#cbd5e1")),
  above: 0.9em, below: 0.9em, width: 100%,
)[#set text(fill: rgb("#414b57")); #it]

// 表格
#show table: it => block(above: 0.9em, below: 1.1em, width: 100%)[#it]
#show table.cell.where(y: 0): set text(weight: "bold")
#show table: set text(size: 0.94em)

// 图片
#show figure.where(kind: image): set align(center)
