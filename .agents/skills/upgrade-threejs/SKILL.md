---
name: upgrade-threejs
description: 按 Three.js 官方 Migration Guide 逐迁移段升级旧项目；当用户要求升级 Three.js、从某个 revision 迁移到更高 revision、或继续 Three.js 版本迁移时使用。包含官方迁移项检索、项目 API 命中检查、WebGL/Shader 运行时门禁、5173 当前版本与 4173 参考版本的截图灰度对比、自动提交和异常停机规则。
---

# Three.js 逐段升级

## 目标

把项目从当前 Three.js revision 升到目标 revision。每次只完成一个官方 Migration Guide 迁移段；官方指南缺少的相邻版本只能作为显式 bridge 步骤。

默认运行约定：

- `http://localhost:5173/`：当前开发版本，由用户运行 `pnpm run dev` 提供；只连接和检查，不替用户占用该端口。
- `http://localhost:4173/`：预期视觉基线；只读取，不启动或覆盖该端口。
- Three.js 仍通过全局 CDN 加载时，优先只修改 `index.html` 的 CDN revision。

## 门禁

每个迁移段完成后执行：

```bash
pnpm build
node .agents/skills/upgrade-threejs/scripts/runtime-check.mjs http://localhost:5173/
node .agents/skills/upgrade-threejs/scripts/screenshot.mjs http://localhost:5173/ /tmp/three-current.png
node .agents/skills/upgrade-threejs/scripts/screenshot.mjs http://localhost:4173/ /tmp/three-reference.png
.agents/skills/upgrade-threejs/scripts/gray-delta.sh /tmp/three-current.png /tmp/three-reference.png
```

自动提交条件：

- build 成功；
- runtime check 无 console error、未捕获异常、Three.js warning/deprecation、WebGL warning、shader compile/link error；
- 页面稳定运行数秒；
- 灰度相对差异在 `±3%` 内；
- 没有用户指出视觉异常。

若任一条件失败：停留在当前迁移段，不提交、不进入下一段。修复后重新执行完整门禁。用户明确人工放行时，可以提交并记录该例外。

灰度值是辅助信号，不替代人工视觉确认。动画或随机场景会导致截图均值波动；结构变化、白块、明显变暗/变亮优先于单一数值。

## 执行流程

### 1. 确认状态

```bash
git status --short
git log --oneline -5
```

确认当前 revision、当前分支和未提交修改。不要覆盖用户已有修改；`PLAN.md` 这类既有未跟踪文件不要擅自提交。

### 2. 读取官方迁移段

使用脚本提取官方条目：

```bash
python3 .agents/skills/upgrade-threejs/scripts/migration-section.py 120 121
```

脚本读取：

```text
https://raw.githubusercontent.com/mrdoob/three.js/wiki/Migration-Guide.md
```

若没有目标相邻段：

1. 记录缺口；
2. 当前版本先完成验证和提交；
3. 将跨越缺口作为单独 bridge 提交；
4. 再进入下一条官方迁移段。

### 3. 搜索项目命中点

围绕当前官方条目搜索：

```bash
rg -n "相关 API|ShaderChunk|WebGLRenderTarget|render\(|BufferGeometry|OrbitControls|SpotLight|DataTexture" src index.html
```

只处理当前迁移段暴露的命中点，不提前批量现代化。

### 4. 应用最小改动

优先顺序：

1. 官方 API 重命名或删除；
2. 当前版本实际产生的 warning/error；
3. 当前迁移段造成的 shader/WebGL 兼容问题；
4. 保持既有视觉行为所需的兼容代码。

重要已验证模式：

- r76：`unpackRGBAToDepth` 被拆到 `packing` chunk；自定义 fragment shader 需要显式引入 `packing`。
- r77：RenderTarget 作为纹理必须使用 `.texture`；旧式 `render(scene,camera,target)` 在后续版本改为 `setRenderTarget()` + `render()` + `setRenderTarget(null)`。
- r84：自定义 fog shader 需要同时补 `fog_pars_vertex` 和 `fog_vertex`；cdnjs 缺版本时检查 jsDelivr/unpkg。
- r90/r91/r95：ShaderChunk 可能拆分或重命名；先确认新旧 chunk 内容和顺序，不只机械替换名字。
- r104：设置 `renderer.debug.checkShaderErrors = true`，保持 shader 运行时门禁。
- r108/r121：shadow API 内部结构变化时，不依赖已移除的公共 `LightShadow` 类型；保存实例原始方法并包裹，或使用当前公开 API。
- r118+ WebGL2：旧的 `OES_texture_float` 检查可能误判；GLSL3 中 `texture` uniform 会与 `texture()` 函数冲突，`gl_FragData` 不可用，自定义 vertex shader 可能需要 `common` 和 `transformedNormal`。

### 5. 验证、提交、推进

通过门禁后：

```bash
git diff --check
git diff --stat
git add <本迁移段文件>
git commit -m "upgrade three rX to rY"
```

bridge 使用：

```text
bridge three rX to rY
```

提交后立即读取官方下一迁移段并继续。每个迁移段都要保持独立提交。

## 失败分类

- **加载失败**：检查 CDN URL、版本文件是否真实存在、MIME type。
- **运行时 API 错误**：按当前 Migration Guide 搜索并做最小替换。
- **shader 编译失败**：保存完整 shader error；比较当前 revision 的 ShaderChunk，检查 chunk 依赖、GLSL1/GLSL3 语法、varying/uniform/函数命名。
- **WebGL 能力误判**：区分 WebGL1 扩展能力和 WebGL2 核心能力。
- **白块/全黑/整体偏亮偏暗**：优先排查 shadow camera、shadow matrix、shadow bias、depth packing、RenderTarget 状态和 color/tone mapping；不要先改几何或动画参数。
- **视觉灰度超阈值但没有结构异常**：重复截图确认波动；必要时请求人工确认，不要为了凑数过度校准灯光。

## 完成标准

一个迁移段只有在以下条件同时满足时才算完成：

- 官方条目已阅读并记录；
- 项目命中点已搜索；
- 当前段所需代码已修改；
- `pnpm build` 通过；
- runtime check 通过；
- 当前截图与 4173 基线没有明显视觉异常；
- 灰度门禁通过，或用户明确人工放行；
- 已创建独立 Git 提交。
