# @dualmark/nuxt 集成指南

## 概述

`@dualmark/nuxt` 是一个为 Nuxt 3 应用提供双标记（dual-mark）渲染能力的模块。它允许你在同一个应用中同时使用 Markdown 和 HTML 两种标记语言，并根据上下文自动选择合适的渲染引擎。这对于需要混合内容创作（例如文档站点、博客、CMS 驱动的应用）的场景特别有用。

本集成模块的核心优势在于：
- **零配置启动**：安装后即可在 Nuxt 3 项目中使用 `.dual.md` 和 `.dual.html` 文件
- **智能渲染切换**：根据文件扩展名自动选择解析器（Markdown 或 HTML）
- **组件化支持**：在双标记文件中无缝使用 Vue 组件
- **性能优化**：基于文件系统的预编译缓存，减少重复解析开销

## 安装与配置

### 基本安装

```bash
# 使用 npm
npm install @dualmark/nuxt

# 使用 yarn
yarn add @dualmark/nuxt

# 使用 pnpm
pnpm add @dualmark/nuxt
```

### Nuxt 配置

在 `nuxt.config.ts` 中添加模块：

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@dualmark/nuxt'],
  
  // 可选配置
  dualmark: {
    // 自定义文件扩展名映射（默认值）
    extensions: {
      markdown: ['.dual.md', '.md'],
      html: ['.dual.html', '.html']
    },
    
    // 渲染引擎选项
    markdown: {
      // 是否启用 GFM（GitHub Flavored Markdown）
      gfm: true,
      // 自定义 Markdown 渲染器选项
      breaks: false,
      pedantic: false
    },
    
    // 缓存策略
    cache: {
      // 缓存过期时间（毫秒），默认 1 小时
      ttl: 3600000,
      // 是否在开发模式下禁用缓存
      disableInDev: true
    },
    
    // 组件解析路径
    components: {
      // 自动扫描的目录
      dirs: ['~/components/dualmark']
    }
  }
})
```

## 详细说明

### 文件结构约定

`@dualmark/nuxt` 遵循以下文件命名规则：

```
pages/
  index.dual.md          # 首页使用 Markdown
  about.dual.html        # 关于页使用 HTML
  blog/
    [slug].dual.md       # 博客文章使用 Markdown
    archive.dual.html    # 归档页使用 HTML
components/
  dualmark/
    CustomHeader.vue     # 可在双标记文件中使用的组件
    CodeBlock.vue
```

### 在 Markdown 中使用组件

在 `.dual.md` 文件中，你可以直接使用 Vue 组件：

```markdown
---
title: 我的第一篇双标记文章
date: 2024-01-15
author: 张三
---

# 欢迎使用双标记渲染

这是一个普通的 Markdown 段落。

<CustomHeader level="2" icon="rocket">
  动态组件示例
</CustomHeader>

你可以像使用普通组件一样传递 props 和 slots：

<CodeBlock language="javascript" :show-line-numbers="true">
  console.log('Hello from dual-mark!');
</CodeBlock>

## 内联组件与 Markdown 混合

<Alert type="info">
  **注意**：组件内部的 Markdown 语法会被正确解析。
  这意味着你可以在组件 slot 中使用 **加粗**、*斜体* 等格式。
</Alert>
```

### 在 HTML 中使用组件

在 `.dual.html` 文件中，你可以使用标准的 HTML 语法，同时嵌入 Vue 组件：

```html
<!-- pages/about.dual.html -->
<template>
  <div class="about-page">
    <h1>关于我们</h1>
    
    <div class="content">
      <p>这是一个使用 HTML 模板的页面。</p>
      
      <CustomHeader level="3" icon="info">
        团队信息
      </CustomHeader>
      
      <div class="team-grid">
        <TeamCard 
          v-for="member in teamMembers" 
          :key="member.id"
          :name="member.name"
          :role="member.role"
          :avatar="member.avatar"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
const teamMembers = [
  { id: 1, name: '李四', role: '前端工程师', avatar: '/avatars/lisi.jpg' },
  { id: 2, name: '王五', role: '后端工程师', avatar: '/avatars/wangwu.jpg' }
]
</script>

<style scoped>
.about-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}
</style>
```

### 高级用法：动态内容注入

你可以通过 `useDualMark` composable 在运行时动态渲染双标记内容：

```vue
<!-- pages/dynamic-render.vue -->
<template>
  <div>
    <h2>动态渲染示例</h2>
    <div v-html="renderedContent"></div>
  </div>
</template>

<script setup>
const { renderDualMark } = useDualMark()

// 假设从 API 获取内容
const content = ref('')

// 动态渲染
const renderedContent = computed(() => {
  if (!content.value) return ''
  
  // 自动检测内容类型
  return renderDualMark(content.value, {
    type: 'markdown', // 或 'html'
    components: {
      Alert: defineAsyncComponent(() => import('~/components/Alert.vue'))
    }
  })
})

// 模拟 API 请求
onMounted(async () => {
  const response = await fetch('/api/content')
  content.value = await response.text()
})
</script>
```

## 示例：完整的博客文章

以下是一个完整的博客文章示例，展示了 `@dualmark/nuxt` 的全部功能：

```markdown
---
title: 使用双标记构建现代文档站点
description: 探索如何利用 @dualmark/nuxt 创建灵活的内容系统
date: 2024-03-20
tags: [nuxt, markdown, documentation]
layout: blog-post
---

# 使用双标记构建现代文档站点

在构建文档站点时，我们经常需要在 **Markdown 的简洁性** 和 **HTML 的灵活性** 之间做出选择。`@dualmark/nuxt` 打破了这一限制。

## 为什么选择双标记？

1. **内容创作者友好**：Markdown 适合快速写作
2. **开发者友好**：HTML 适合复杂布局
3. **组件复用**：两种格式都能使用 Vue 组件

## 实际应用场景

### 场景一：API 文档

<CodeBlock language="typescript" :show-line-numbers="true">
// 使用双标记渲染的 API 文档示例
interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
</CodeBlock>

### 场景二：交互式教程

<InteractiveDemo 
  title="Vue 响应式示例"
  :initial-code="`const count = ref(0)\nconst double = computed(() => count.value * 2)`"
>
  <template #description>
    点击按钮查看 **响应式数据** 如何工作。
  </template>
</InteractiveDemo>

## 性能优化建议

| 优化项 | 说明 | 推荐值 |
|--------|------|--------|
| 缓存 TTL | 内容缓存时间 | 3600000ms |
| 组件预编译 | 提前编译组件 | 开启 |
| 懒加载 | 非首屏组件懒加载 | 开启 |

<Alert type="warning">
  **注意**：在生产环境中，建议启用缓存并关闭开发模式下的缓存禁用选项。
</Alert>
```

## 注意事项

### 1. 文件扩展名冲突

避免同时使用 `.dual.md` 和 `.md` 文件，除非你明确需要两种不同的解析行为。如果两者都存在，模块会优先处理 `.dual.md`。

### 2. 组件命名规范

在双标记文件中使用的组件必须遵循以下规则：
- 组件名必须使用 PascalCase（如 `MyComponent`）
- 组件必须位于 `components/dualmark/` 目录下（或自定义的组件目录）
- 避免使用与 HTML 原生标签同名的组件

### 3. 渲染性能

当在 Markdown 中大量使用组件时，建议：
- 使用 `defineAsyncComponent` 进行懒加载
- 避免在循环渲染中使用复杂组件
- 合理设置缓存 TTL

### 4. 与 Nuxt 其他模块的兼容性

- **Content module**：如果同时使用 `@nuxt/content`，建议将双标记文件放在不同的目录中
- **i18n**：支持国际化，但需要在组件中正确处理翻译
- **SEO**：双标记文件生成的页面会自动包含 SEO 元数据

### 5. 错误处理

如果渲染失败，模块会回退到原始内容显示，并在开发模式下输出详细错误信息：

```typescript
// 自定义错误处理
export default defineNuxtPlugin(() => {
  return {
    provide: {
      dualmarkErrorHandler: (error: Error, context: { file: string, type: string }) => {
        console.error(`渲染错误 [${context.file}]:`, error.message)
        // 可以发送错误报告到监控服务
      }
    }
  }
})
```

## 总结

`@dualmark/nuxt` 为 Nuxt 3 应用带来了灵活的内容渲染能力，特别适合需要混合内容类型的项目。通过合理的配置和使用，你可以构建出既对内容创作者友好，又具有强大交互能力的文档站点、博客或 CMS 应用。

建议在开始使用前，先在开发环境中测试所有功能，并根据实际需求调整缓存和组件配置。对于大型项目，考虑将双标记文件与普通 Vue 页面分开管理，以获得更好的可维护性。