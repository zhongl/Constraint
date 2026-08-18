# Three.js 与 @types/three 版本兼容性核实

## 结论

`@types/three@0.185.4` 的版本号表明它针对 Three.js 的 `r185` API 线，但官方来源没有声明“与所有 `three@0.185.x` 完全兼容”。因此可以认为它是面向 r185 的类型定义补丁版本，但不能仅凭版本号证明完全兼容。

## 来源

- npm registry：`@types/three@0.185.4` 已发布，描述为 “TypeScript definitions for three”，仓库指向 DefinitelyTyped：
  https://registry.npmjs.org/@types/three/0.185.4
- DefinitelyTyped 官方仓库：
  https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/three
- Three.js 官方仓库的 r185 包元数据：
  https://raw.githubusercontent.com/mrdoob/three.js/r185/package.json
- Three.js npm 包元数据：
  https://registry.npmjs.org/three

## 版本事实

截至核实时间，npm registry 中不存在 `three@0.185.4`，`three` 的 r185 发布版本为 `0.185.1`；因此无法将运行时包精确锁定到 `0.185.4`。

`@types/three` 的 `0.185.4` 是 DefinitelyTyped 独立发布的类型包版本，不能视为 Three.js 官方运行时包的同一发布版本。
