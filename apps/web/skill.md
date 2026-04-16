一、项目规范（Project Guidelines）
1. 导入路径规范

严禁使用深度相对路径：禁止在代码中使用类似 ../../../../lib/utils 的长相对路径，这会导致重构文件目录时出现大量路径断裂。
强制使用别名 (Alias)：遵循项目 tsconfig.json 和 vite.config.ts 中的配置，跨目录引入模块时必须使用 @/ 前缀（例如：import { cn } from '@/lib/utils'）。
2. 静态资源与外部域名收敛

避免硬编码外部 Host：绝对不要在组件内部将外部服务的域名（如 render.albiononline.com）直接写死。
集中管理并封装工具函数：所有的图片拼接逻辑必须收敛到 src/lib/utils.ts 中的通用函数（如 getAlbionItemUrl）。这不仅能保证 URL 参数（质量、数量等）的一致性，也能在后期无痛切换至自建 CDN（如 img.albionbox.com）。
3. 浏览器缓存与配额安全

利用会话缓存 (SessionStorage)：对于分页的、体积较大的历史不可变数据（如 Albion 的往期战报事件），应该以特定 Key（如 battleId_offset_limit）存入 sessionStorage 中，以避免用户频繁切换页面时产生冗余的网络请求。
防御性存储：写入缓存时必须包裹在 try...catch 中。Albion 战斗日志数据庞大，极易触发浏览器的 QuotaExceededError（5MB 限制），必须捕获该异常并优雅降级（放弃缓存），防止整个页面崩溃。
二、模块规范（Module Guidelines）
1. 组件生命周期与状态驻留

慎用条件渲染销毁带状态组件：在列表页（List）与详情页（Detail）这类“主-子视图”切换时，不应使用三元运算符（{isDetail ? <Detail/> : <List/>}）彻底卸载列表组件，这会导致列表的滚动位置、分页进度、多选项等所有内部状态全部丢失。
状态保留策略：推荐使用 CSS 类名控制可见性（如 className={isDetail ? 'hidden' : 'block'}）来保持组件存活，或将核心状态提升（State Lifting）至父组件进行管理。
2. 数据聚合与去重统计（针对 Albion 数据特性）

使用集合去重：在统计参与公会、联盟或玩家的总数时，不能直接在事件循环中做累加（+1），因为同一玩家可能参与多次击杀事件导致数据虚高。必须将玩家的唯一 Id 存入 Set，最后取 Set.size 才是真实的参与人数。
按劳分配贡献值：击杀声望（Kill Fame）不应全额（100%）分配给抢到“最后一击”的玩家所在公会。必须解析所有助攻者，基于其造成的伤害或提供的治疗比例（DamageDone / SupportHealingDone），将总声望合理平摊到所有参与的公会和联盟上。
3. 细粒度组件抽离（Single Responsibility）

解耦复杂渲染逻辑：当一个弹窗（如 KillDetailModal）内部开始包含复杂的视觉判断逻辑（如：识别武器 ID 是否含有 _2H_ 从而判断为双手武器，进而为副手槽位添加透明度占位符）时，必须将这部分渲染逻辑剥离。
构建 Shared 目录：将这些通用的 UI 片段（如 ItemSlot 和 EquipmentGrid）提取到模块内部的 shared/ 目录下（如 shared/EquipmentDisplay.tsx）。这能保持主组件的整洁，也方便后续在其它模块中复用“九宫格”装备展示组件。