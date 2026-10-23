<script setup>
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import logoImage from '../assets/Logo.png' 
import { useAuth } from '../stores/auth'

const router = useRouter()
const auth = useAuth()

const isAppMode = computed(() => {
  return auth.isAuthenticated.value
})

const showUpgradeModal = ref(false)

const userInitials = computed(() => {
  const name = auth.username.value || 'User'
  return name.slice(0, 2).toUpperCase()
})

// Logo destination dynamic per role
const logoDestination = computed(() => {
  if (!auth.isAuthenticated.value) return '/'
  return auth.isAdmin.value ? '/admin' : '/dashboard'
})

const handleLogout = () => {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
    <div class="w-full flex justify-between items-center px-6 py-4">
      
      <!-- ============================================== -->
      <!-- BAGIAN KIRI: Logo (Sesuai Role)                 -->
      <!-- ============================================== -->
      <RouterLink :to="logoDestination" class="flex items-center gap-3">
        <img :src="logoImage" alt="Logo VisuMatch" class="h-10 w-auto rounded-full object-cover" />
      </RouterLink>

      <!-- ============================================== -->
      <!-- BAGIAN KANAN: Menu                             -->
      <!-- ============================================== -->
      
      <!-- Tampilan Mode Aplikasi (Sudah Login) -->
      <div v-if="isAppMode" class="flex items-center gap-3 sm:gap-4">
        
        <!-- ======================= -->
        <!-- MENU KHUSUS CREATOR     -->
        <!-- ======================= -->
        <template v-if="!auth.isAdmin.value">
          <RouterLink to="/dashboard" class="text-gray-300 hover:text-white transition text-sm font-medium">
            Dashboard
          </RouterLink>

          <!-- Badge Paket Free -->
          <span class="bg-purple-950/70 border border-purple-500/40 text-purple-300 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Paket Free
          </span>

          <!-- Tombol Upgrade ke Pro -->
          <button 
            @click="showUpgradeModal = true"
            class="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-lg shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <span>✨</span>
            <span class="hidden sm:inline">Upgrade ke Pro</span>
          </button>
        </template>

        <!-- ======================= -->
        <!-- MENU KHUSUS ADMIN       -->
        <!-- ======================= -->
        <template v-else>
          <RouterLink to="/admin" class="text-purple-400 hover:text-purple-300 transition text-sm font-semibold">
            Panel Admin
          </RouterLink>
          <span class="bg-purple-900/60 border border-purple-500/50 text-purple-200 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
            Admin
          </span>
        </template>
        
        <!-- Info Nama Pengguna (Untuk Semua Role) -->
        <div class="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700 text-xs sm:text-sm">
          <span class="text-gray-300 font-medium">{{ auth.username.value }}</span>
        </div>

        <!-- Tombol Keluar (Hapus token, role, dan data store -> /login) -->
        <button 
          @click="handleLogout" 
          class="bg-gray-800 hover:bg-red-900/60 hover:text-red-300 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 transition cursor-pointer"
        >
          Keluar
        </button>

        <!-- Avatar Inisial -->
        <div class="w-9 h-9 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-gray-700">
          {{ userInitials }}
        </div>
      </div>

      <!-- Tampilan Mode Publik (Belum Login) -->
      <div v-else class="flex items-center gap-4 sm:gap-6">
        <div class="hidden md:flex items-center space-x-8 text-sm font-medium">
          <RouterLink to="/" class="text-gray-300 hover:text-white transition">Beranda</RouterLink>
          <a href="/#cara-kerja" class="text-gray-300 hover:text-white transition">Cara Kerja</a>
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

  <!-- Modal Upgrade Free vs Pro (Hanya untuk Creator) -->
  <div v-if="showUpgradeModal && !auth.isAdmin.value" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl p-6 sm:p-8 relative shadow-2xl">
      <button 
        @click="showUpgradeModal = false" 
        class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl cursor-pointer"
      >
        ✕
      </button>

      <div class="text-center mb-6">
        <span class="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-3 py-1 rounded-full font-bold mb-2">
          Paket Berlangganan
        </span>
        <h2 class="text-2xl font-bold text-white">Pilih Paket Kreativitasmu</h2>
        <p class="text-gray-400 text-sm mt-1">Perbandingan fitur antara paket Free dan Pro di VisuMatch.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <!-- Paket Free -->
        <div class="bg-gray-950/80 border border-gray-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-bold text-white text-lg">Free</h3>
              <span class="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">Paket Aktif</span>
            </div>
            <p class="text-2xl font-extrabold text-white mb-4">Rp 0 <span class="text-xs font-normal text-gray-500">/ selamanya</span></p>
            <ul class="space-y-2 text-xs text-gray-300 mb-4">
              <li class="flex items-center gap-2">✓ Ekspor Timeline XML / EDL</li>
              <li class="flex items-center gap-2">✓ Pencarian B-Roll Pexels & Pixabay</li>
              <li class="flex items-center gap-2">✓ AI B-Roll Auto Matching</li>
              <li class="flex items-center gap-2 text-gray-500">✕ Render Video Full MP4</li>
              <li class="flex items-center gap-2 text-gray-500">✕ Resolusi 4K & Priority Queue</li>
            </ul>
          </div>
          <button disabled class="w-full bg-gray-800 text-gray-400 py-2 rounded-lg text-xs font-semibold cursor-not-allowed">
            Paket Saat Ini
          </button>
        </div>

        <!-- Paket Pro -->
        <div class="bg-gradient-to-b from-purple-950/40 to-gray-950 border border-purple-500/50 rounded-xl p-5 flex flex-col justify-between relative shadow-lg shadow-purple-900/20">
          <div class="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            TERBAIK
          </div>
          <div>
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-bold text-white text-lg flex items-center gap-1.5">
                <span>✨</span> Pro
              </h3>
            </div>
            <p class="text-2xl font-extrabold text-purple-300 mb-4">Rp -- <span class="text-xs font-normal text-gray-500">/ bulan</span></p>
            <ul class="space-y-2 text-xs text-gray-200 mb-4">
              <li class="flex items-center gap-2">✓ Semua fitur paket Free</li>
              <li class="flex items-center gap-2">✓ Render Otomatis MP4 di Server</li>
              <li class="flex items-center gap-2">✓ Resolusi hingga 4K UHD</li>
              <li class="flex items-center gap-2">✓ Kuota AI Matching Tanpa Batas</li>
              <li class="flex items-center gap-2">✓ Prioritas Proses Pipeline AI</li>
            </ul>
          </div>
          
          <div class="text-center">
            <span class="inline-block w-full py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold mb-2">
              Segera hadir
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
