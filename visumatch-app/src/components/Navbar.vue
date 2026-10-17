<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import logoImage from '../assets/Logo.png' 

const route = useRoute()

const isAppMode = computed(() => {
  const path = route.path
  return path.includes('/dashboard') || path.includes('/workspace') || path.includes('/admin')
})
</script>

<template>
  <nav class="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
    <!-- max-w-7xl dan mx-auto dihapus, diganti dengan w-full dan padding sisi (px-6) -->
    <div class="w-full flex justify-between items-center px-6 py-4">
      
      <!-- ============================================== -->
      <!-- BAGIAN KIRI: Logo Mepet Pojok                  -->
      <!-- ============================================== -->
      <RouterLink to="/" class="flex items-center gap-3">
        <img :src="logoImage" alt="Logo VisuMatch" class="h-10 w-auto rounded-full object-cover" />
        <span class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 hidden sm:block tracking-wide">
          VisuMatch
        </span>
      </RouterLink>

      <!-- ============================================== -->
      <!-- BAGIAN KANAN: Menu Mepet Pojok                 -->
      <!-- ============================================== -->
      
      <!-- Tampilan Mode Aplikasi -->
      <div v-if="isAppMode" class="flex items-center gap-4 sm:gap-6">
        <RouterLink to="/dashboard" class="hidden md:block text-gray-300 hover:text-white transition text-sm font-medium mr-2">
          Dashboard
        </RouterLink>
        <div class="hidden sm:flex items-center gap-2 bg-gray-800 px-4 py-1.5 rounded-full border border-gray-700 text-sm">
          <span class="text-gray-400">Paket:</span>
          <span class="font-bold text-purple-400">Free</span>
          <div class="w-px h-4 bg-gray-600 mx-2"></div>
          <span class="text-gray-400">Kredit:</span>
          <span class="font-bold text-white">12 / 50</span>
        </div>
        <button class="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white px-4 py-2 rounded-lg font-bold transition shadow-lg shadow-orange-500/20 text-sm flex items-center gap-2">
          <span>✨</span> <span class="hidden sm:inline">Upgrade Pro</span>
        </button>
        <div class="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold border-2 border-gray-700 cursor-pointer hover:border-purple-400 transition">
          FA
        </div>
      </div>

      <!-- Tampilan Mode Publik -->
      <div v-else class="flex items-center gap-4 sm:gap-6">
        <div class="hidden md:flex items-center space-x-8 text-sm font-medium">
          <RouterLink to="/" class="text-gray-300 hover:text-white transition">Beranda</RouterLink>
          <a href="/#fitur" class="text-gray-300 hover:text-white transition">Cara Kerja</a>
          <a href="/#fitur" class="text-gray-300 hover:text-white transition">Fitur AI</a>
        </div>
        <div class="flex items-center gap-3 border-l border-gray-700 pl-4 ml-2">
          <RouterLink to="/login" class="text-gray-300 hover:text-white font-medium px-3 py-2 transition text-sm">
            Masuk
          </RouterLink>
          <RouterLink to="/register" class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg font-medium transition shadow-lg shadow-purple-500/30 text-sm">
            Daftar
          </RouterLink>
        </div>
      </div>

    </div>
  </nav>
</template>