# Three.js / GLSL 独立包在 Monorepo 中的构建实践调研

> 调研对象：`@constraint/effect` 将 GLSL shader 封装在独立包中，同时由 Vite Demo 消费。
>
> 调研日期：2026-08-18

## 结论摘要

社区和官方工具链通常采用以下原则：

1. **源码开发模式和发布消费模式分开处理**：Demo 可以直接消费 workspace 源码以获得 HMR，但这意味着 Demo 的构建链必须认识包源码使用的非标准资源；或者 Demo 消费包的 `dist`，由包自己预先完成 shader 编译。
2. **shader 编译属于包的构建职责**：GLSL 应在库自己的 Vite/Rollup 插件中转换成 JS 字符串并进入发布产物；发布包不应把 `.frag`、`.vert` 的解析责任交给消费者。
3. **`exports` 应暴露明确的发布入口**：Node 官方推荐使用 `exports` 定义公共接口，并指出它会封装未导出的内部路径。不要默认把 `src` 作为消费者入口。
4. **workspace 链接不等于构建**：pnpm 的 `workspace:` 协议只保证依赖解析到本地 workspace 包，不会自动把包源码编译成可消费的产物；需要显式的 build、watch 或发布流程。
5. **`three` 应保持 external + peer dependency**：Vite Library Mode 官方示例建议将不希望被库打包的依赖 externalize；对于 Three.js 库，通常应避免产生第二份 Three.js。

## 方案比较

### 方案 A：Demo 直接消费 workspace 源码

```text
Demo → @constraint/effect/src → .frag/.vert
                                  ↓
                         Demo 的 Vite GLSL plugin
```

**优点**

- 修改包源码可以直接由 Demo HMR；
- 不需要每次先执行包构建；
- 适合单仓库内部快速开发。

**缺点**

- Demo 必须知道 effect 包使用了 GLSL；
- 消费者必须复制或共享 shader 插件配置；
- 包的源码入口实际上成为隐含公共接口；
- 容易出现“生产构建正常、dev 解析失败”的不一致。

这个方案并不违反 Vite 的设计。Vite Library Mode 文档明确提到，浏览器库通常会用 `index.html` 作为测试/演示页面，并导入实际库。但这只说明 Demo 可以导入库，并不意味着库源码使用的自定义资源会自动由库的 Vite 配置处理；Vite dev server 最终使用的是宿主项目的插件流水线。

**适用场景**：内部 monorepo、源码共享优先、所有消费者都统一使用同一套 Vite 配置。

### 方案 B：Demo 消费 effect 的构建产物

```text
.effect/src + package Vite plugin
              ↓ build/watch
.effect/dist/index.js
              ↓
Demo → @constraint/effect
```

**优点**

- GLSL 处理完全封装在 effect 包；
- Demo 不需要 `glslify`、`glsl-noise`、`glsl-random`；
- 发布环境和 Demo 消费路径一致；
- 外部消费者只需要安装包，不需要配置 shader loader。

**缺点**

- 首次开发需要先构建包；
- 需要 `build --watch` 或并行任务才能获得接近 HMR 的体验；
- 包源码修改后，可能是完整 bundle 更新，而不是宿主源码级 HMR。

**适用场景**：真正可发布的独立包，尤其是包含 shader、WASM、代码生成文件等自定义资源的包。

### 方案 C：发布包提供 dist，monorepo 内另提供显式 source 入口

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./source": "./src/index.ts"
  }
}
```

Demo 明确选择：

```ts
// 发布路径验收
import { ConstraintEffect } from '@constraint/effect';

// 内部源码开发路径（需要 Demo 的 GLSL plugin）
import { ConstraintEffect } from '@constraint/effect/source';
```

**优点**

- 默认入口始终模拟真实消费者；
- 源码开发是显式选择，不会被条件解析悄悄切换；
- 可以同时支持发布验收和源码 HMR。

**缺点**

- 需要维护两个入口；
- source 入口仍然要求宿主处理 GLSL；
- 必须明确 source 入口不属于稳定公共接口，或只在 workspace 内使用。

这是大型 monorepo 常见的折中方式，但对当前 Constraint 项目而言可能过度设计。

## 官方资料中的关键事实

### Vite Library Mode

Vite 官方文档的 Library Mode 章节说明：

- 浏览器库通常使用 `index.html` 作为测试/演示页面，并让页面导入实际库；
- 发布时使用 `build.lib`；
- 不希望被库打包的依赖应通过 `rollupOptions.external` externalize。

来源：

- https://vite.dev/guide/build.html#library-mode

### Vite 的开发服务器模型

Vite 官方说明，ESM dev server 会在浏览器请求模块时按需提供模块。也就是说，当 Demo 解析到 workspace 包的 `src/velocity.frag` 时，处理它的是当前 Demo 的 Vite server，而不是 effect 包曾经执行过的构建配置。

来源：

- https://vite.dev/guide/why.html

### Node.js `exports`

Node.js 官方文档指出：

- 新包推荐使用 `exports`；
- `exports` 会定义并封装包的公共接口；
- 未列出的内部路径将不能被消费者导入；
- conditional exports 可以根据条件映射到不同入口，但每个条件都应是有意设计的公共行为。

来源：

- https://nodejs.org/api/packages.html#exports
- https://nodejs.org/api/packages.html#conditional-exports

### pnpm workspace protocol

pnpm 官方文档指出：

- workspace 必须由根目录的 `pnpm-workspace.yaml` 定义；
- `workspace:` 协议保证依赖只能解析到本地 workspace 包；
- 该协议解决的是依赖解析，不负责执行包构建。

来源：

- https://pnpm.io/workspaces#workspace-protocol-workspace

### Rollup external

Rollup 官方文档说明，`external` 用于告诉 bundler 某些依赖不应进入 bundle；库需要把由宿主提供的依赖标记为 external。Vite Library Mode 使用同一套 Rollup 配置语义。

来源：

- https://rollupjs.org/configuration-options/#external

## 对当前 Constraint 的推荐

### 推荐最终结构

采用 **方案 B：包构建产物优先，包内封装 GLSL**：

```text
packages/effect/
├── src/                  # 内部实现和 GLSL 源码
├── dist/                 # 包构建结果，不提交 Git
├── vite.config.mjs       # 唯一的 GLSL 处理位置
└── package.json
```

`packages/effect/package.json` 建议：

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

不建议继续使用：

```json
"development": "./src/index.ts"
```

因为它让 Demo 在 dev 时绕过包构建，导致 GLSL 处理职责泄漏到宿主。

### 开发命令

最低可行方案：

```json
{
  "scripts": {
    "predev": "pnpm --filter @constraint/effect build",
    "dev": "vite"
  }
}
```

更好的包开发体验：

```json
// packages/effect/package.json
{
  "scripts": {
    "build": "vite build && tsc --emitDeclarationOnly ...",
    "watch": "vite build --watch"
  }
}
```

再通过并行任务同时运行 effect watch 和 Demo dev。这样 Demo 仍然只消费 `dist`，shader 始终由 effect 包的构建链处理。

### 何时保留根 Demo 的 GLSL plugin

只有在明确选择方案 A 或方案 C 的 source 入口时，才保留根 Demo 的 GLSL plugin。此时应在文档中明确：

- Demo 正在消费源码入口；
- Demo 必须承担 effect 源码的资源转换；
- 这不是发布包消费者的要求。

当前修复中恢复根 plugin 能解决 `pnpm dev`，但它属于方案 A 的临时/开发模式，不是“GLSL 完全封装在包中”的最终状态。

## 最终建议

对本项目下一步应采用：

1. 删除 `development` export；
2. Demo 仅消费 `@constraint/effect/dist`；
3. 将 `predev` 改成先构建 effect 包；
4. 需要开发包源码时增加 effect 的 `build --watch`；
5. 删除根项目的 GLSL 插件及三个 GLSL 依赖；
6. 保留 `three` 为 effect 的 peer dependency，并在库构建中 externalize；
7. 用一个最小 smoke check 验证 Demo 使用的是 `dist`，避免未来再次发生 dev/build 两条链路不一致。

这个方案牺牲了一点源码级 HMR，但获得了更清晰的 seam、更深的 effect 包接口，以及真正独立可导入的包。
