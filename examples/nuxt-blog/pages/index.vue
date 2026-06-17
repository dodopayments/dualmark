<template>
  <main>
    <h2>Blog Posts</h2>
    <ContentList path="/blog" v-slot="{ list }">
      <div v-for="article in list" :key="article._path">
        <NuxtLink :to="article._path">{{ article.title }}</NuxtLink>
      </div>
    </ContentList>
  </main>
</template>
