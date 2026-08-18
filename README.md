## 縳 Constraint

![](https://raw.githubusercontent.com/edankwan/Constraint/master/app/images/screenshot.jpg)

[Live demo](http://www.edankwan.com/experiments/constraint/) | [Video](https://www.youtube.com/watch?v=LCDBNS7FkrA)

## Development and deployment
- install: `pnpm install`
- dev: `pnpm dev`（启动前会自动构建 `@constraint/effect`）
- effect watch: `pnpm dev:effect`（监听 effect 源码并持续构建 `dist`，需与 `pnpm dev` 并行运行）
- build: `pnpm build`
- preview production build: `pnpm preview`

开发 effect 包时，请分别运行：

```bash
pnpm dev:effect
pnpm dev
```

Demo 始终消费 `@constraint/effect` 的构建产物；修改 effect 源码后，watch 任务会更新 `packages/effect/dist`。

## License
This experiment is under MIT License.

