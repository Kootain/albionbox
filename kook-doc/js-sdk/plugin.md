# 插件系统（Plugin）

定位：把一组能力（事件处理、指令、初始化逻辑）封装成可复用模块，通过 `client.use(plugin)` 加载。

## 核心组件

- `PluginLoader`：load/unload/unloadAll，维护已加载插件列表
- `KookPlugin`：插件描述对象（name/description/生命周期钩子/指令提供）
- `PluginContext`：传给 onLoad 的上下文（client + logger）

## 生命周期

- `onLoad(context)`：加载时调用（async）
- `onUnload()`：卸载时调用
- `onReset()`：WS 收到 reconnect 或内部 reset 时调用

## 指令注入

- 插件可通过 `providedDirectives` 声明指令集合
- Loader 会在加载时把指令注册到 client 的 registry

