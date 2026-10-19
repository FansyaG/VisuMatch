<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
import { toastState, removeToast } from './toast'

const route = useRoute()

// Sembunyikan Footer di halaman Workspace dan Admin
const hideFooter = computed(() => {
  return ['workspace', 'workspace-detail', 'admin'].includes(route.name)
})
</script>

<template>
  <div class="min-h-screen bg-transparent flex flex-col font-sans text-gray-300 selection:bg-purple-500/30">
    <Navbar />
    
    <!-- Global Toast Container -->
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
      <div
        v-for="toast in toastState.items"
        :key="toast.id"
        class="pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm flex items-start justify-between gap-3 border transition-all duration-300"
        :class="{
          'bg-red-950/90 border-red-500 text-red-200': toast.type === 'error',
          'bg-emerald-950/90 border-emerald-500 text-emerald-200': toast.type === 'success',
          'bg-blue-950/90 border-blue-500 text-blue-200': toast.type === 'info',
        }"
      >
        <span class="break-words">{{ toast.message }}</span>
        <button
          @click="removeToast(toast.id)"
          class="text-xs opacity-70 hover:opacity-100 font-bold ml-2 cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>

    <main class="flex-grow flex flex-col relative">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>

    <Footer v-if="!hideFooter" />
  </div>
</template>

<style>
/* Animasi Transisi Halus antar Halaman */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>