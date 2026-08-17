---
name: upgrade-threejs
description: Three.js 版本迁移：用户要求升级 Three.js、迁移到指定或最新 revision，或继续未完成的版本迁移时调用；按官方 Migration Guide 逐个相邻 revision 执行并通过验证后独立提交。
---

# Three.js 单段迁移

## 核心契约

使用四个 leading words 执行本 Skill：**单段、取证、门禁、提交点**。

- **单段**：一次执行只能完成 `current → current + 1`，不能把目标 revision 当成本次 revision。
- **取证**：关键判断必须有命令输出证明，不能仅凭端口可访问或 URL 文本推断。
- **门禁**：preflight 或迁移后任一检查失败，停留在当前段，不编辑、不提交、不推进。
- **提交点**：一个官方迁移段对应一个独立 Git commit。

例如当前运行时是 r122、目标是 r185，本次只能做 r122 → r123；提交成功后下一次才做 r123 → r124。

## 运行约定

- `http://localhost:5173/` 是当前迁移版本，由用户提前运行 `pnpm run dev` 提供。只连接和检查，不替用户启动、停止或占用 5173。
- `http://localhost:4173/` 是参考基线，必须由独立 worktree 的 `refactor/referece` 分支提前运行 `pnpm run preview` 提供。只读取，不启动、覆盖或重新构建该端口。
- 参考 worktree 必须与当前迁移 worktree 分离，避免当前分支的 `pnpm build` 覆盖参考分支的 `dist`。
- 当前迁移版本以源代码中的 Three.js 依赖为准；5173 仅检查服务可用，4173 仅作为参考基线进行视觉对比，两个端口都不做版本门禁。
- 若 4173 来源无法证明，停在准备阶段。可要求用户修复环境，但不得产生迁移改动。

## 准备阶段：先取证，再编辑

代码修改前必须执行：

```bash
python3 - <<'PY'
import subprocess
print(subprocess.check_output([
  'git', 'status', '--short'
], text=True), end='')
print(subprocess.check_output([
  'git', 'log', '--oneline', '-5'
], text=True), end='')
PY
node .agents/skills/upgrade-threejs/scripts/preflight.mjs
```

`preflight.mjs` 是硬门禁，必须确认并输出：

- 当前是 Git worktree；
- 当前 5173 正在监听；
- 目标严格等于 `<current> + 1`；
- 官方迁移段存在；
- `refactor/referece` 独立 worktree 存在；
- 4173 正在监听；
- 4173 监听进程的 cwd 属于该参考 worktree；
- 该 worktree 当前分支和 commit 可读取；

脚本返回非零时，立即停止。preflight 通过前不得编辑任何业务文件。已有修改属于用户时，保留它们；提交时只能暂存本迁移段文件。

完成条件：终端出现 `PREFLIGHT PASSED`，并且输出中的当前运行时 revision、参考 worktree、参考 PID、分支和 commit 均符合预期。

## 一个迁移段的步骤

### 1. 读取官方段

```bash
python3 .agents/skills/upgrade-threejs/scripts/migration-section.py <current> <current+1>
```

完整阅读并记录该段条目。若脚本找不到相邻段：

1. 记录官方指南缺口；
2. 先对当前版本完成验证并独立提交；
3. 使用 `bridge three rX to rY` 作为显式 bridge 提交；
4. 再执行下一段。

完成条件：已获得官方 `current → current+1` 标题和完整条目，且没有把更远版本的条目混入本段。

### 2. 搜索项目命中点

根据官方条目搜索整个项目，只处理本段命中：

```bash
rg -n "相关 API|ShaderChunk|WebGLRenderTarget|render\\(|BufferGeometry|OrbitControls|SpotLight|DataTexture|THREE\\.REVISION" src index.html
```

记录每个命中点的结论：需要修改、确认无需修改，或由当前运行时暴露。不要提前批量现代化，也不要因为目标是高版本而跳过中间段。

完成条件：每条官方迁移项都有项目命中结论。

### 3. 应用最小改动

按以下优先级处理：

1. 官方 API 重命名或删除；
2. 本段实际产生的 warning/error；
3. 本段造成的 shader/WebGL 兼容问题；
4. 保持既有视觉行为所需的最小兼容代码。

若 Three.js 仍通过 CDN 加载，先确认目标文件真实存在：

```bash
curl -L --fail -I https://cdn.jsdelivr.net/npm/three@0.<target>.0/build/three.module.min.js
```

r160 起 `build/three.min.js` 已移除；需要切换 ESM CDN 加载方式时，必须把该切换放在实际对应迁移段，并验证 `window.THREE.REVISION`，不能把它当作跨多段的无关升级。

完成条件：diff 只包含本段必要文件，且 `git diff --check` 通过。

### 4. 迁移后门禁

严格按顺序执行：

```bash
pnpm build
node .agents/skills/upgrade-threejs/scripts/runtime-check.mjs http://localhost:5173/
node .agents/skills/upgrade-threejs/scripts/screenshot.mjs http://localhost:5173/ /tmp/three-current.png
node .agents/skills/upgrade-threejs/scripts/screenshot.mjs http://localhost:4173/ /tmp/three-reference.png
.agents/skills/upgrade-threejs/scripts/gray-delta.sh /tmp/three-current.png /tmp/three-reference.png
git diff --check
```

门禁要求：

- build 退出码为 0；
- runtime check 无 console error、未捕获异常、Three.js warning/deprecation、WebGL warning、shader compile/link error；
- 页面稳定运行数秒；
- 当前截图和参考截图无结构性视觉异常；
- 灰度相对差异在 `±3%` 内；
- diff check 通过。

动画或随机场景导致的灰度波动不能替代人工视觉检查。白块、全黑、明显变暗/变亮、阴影结构变化优先处理。门禁失败时修复本段并重新执行完整门禁，不能提交或进入下一段。人工放行必须由用户明确说明，并在提交信息或记录中写明例外。

### 5. 提交点

只有完整门禁通过后才能提交：

```bash
git diff --stat
git status --short
git add <本迁移段实际修改的文件>
git commit -m "upgrade three r<current> to r<current+1>"
```

不得使用 `git add -A`，不得提交用户已有修改、`PLAN.md` 或无关生成物。

完成条件：commit 成功，且 `git status --short` 中没有本段未提交修改。提交后才可以读取下一官方段；一次执行不得跨越下一个提交点。

## 已验证的高风险模式

- r76：`unpackRGBAToDepth` 被拆到 `packing` chunk；自定义 fragment shader 要显式引入 `packing`。
- r77：RenderTarget 作为纹理使用 `.texture`；旧式 `render(scene,camera,target)` 改为 `setRenderTarget()`、`render()`、`setRenderTarget(null)`。
- r84：自定义 fog shader 同时补 `fog_pars_vertex` 和 `fog_vertex`；cdnjs 缺版本时检查 jsDelivr/unpkg。
- r90/r91/r95：ShaderChunk 可能拆分或重命名；比较新旧 chunk 内容和顺序，不机械替换名称。
- r104：设置 `renderer.debug.checkShaderErrors = true`，保持 shader 运行时门禁。
- r108/r121：shadow API 内部结构变化时不依赖已移除的公共 `LightShadow` 类型；保存实例原始方法并包裹，或使用当前公开 API。
- r118+ WebGL2：旧 `OES_texture_float` 检查可能误判；GLSL3 中 `texture` uniform 会与 `texture()` 函数冲突，`gl_FragData` 不可用，自定义 vertex shader 可能需要 `common` 和 `transformedNormal`。

## 失败分类

- **preflight 失败**：检查端口 PID、进程 cwd、worktree 分支和运行时 revision；不修改代码。
- **加载失败**：检查 CDN URL、目标文件是否存在、MIME type 和 ESM 加载方式。
- **运行时 API 错误**：只按当前官方迁移段做最小替换。
- **shader 编译失败**：保存完整 shader error，比较当前 revision 的 ShaderChunk，检查 chunk 依赖、GLSL1/GLSL3 语法和 varying/uniform/函数命名。
- **WebGL 能力误判**：区分 WebGL1 扩展能力和 WebGL2 核心能力。
- **白块/全黑/整体亮度异常**：优先检查 shadow camera、shadow matrix、shadow bias、depth packing、RenderTarget 状态和 color/tone mapping。
- **灰度超阈值但无结构异常**：重复截图确认动画波动，必要时请求用户人工确认；不为了凑数修改灯光或动画参数。

## 结束标准

单个迁移段仅在以下条件全部满足时完成：

- 官方相邻段已完整读取；
- 每条官方迁移项都有项目命中结论；
- 本段最小改动已完成；
- build、runtime、截图和灰度门禁全部通过，或有用户明确人工放行；
- 独立 Git commit 已创建；
- 当前工作区没有本段遗留修改。

目标 revision 达成的标准是：从当前 revision 到目标 revision 的每个相邻段都重复上述流程并拥有独立 commit，而不是一次修改版本字符串。
