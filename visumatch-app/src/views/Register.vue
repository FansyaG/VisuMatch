<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

const dynamicImage = ref('')
const dynamicTitle = ref('')
const dynamicDesc = ref('')
const isLoading = ref(true)

const fetchAIVisual = async () => {
  isLoading.value = true
  await new Promise(resolve => setTimeout(resolve, 300))

  const apiResponses = [
    {
      image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1920',
      title: 'Bawa imajinasimu lebih jauh.',
      desc: 'Ubah rangkaian kata menjadi video yang bermakna. Biarkan AI membantu, tetap kamu yang bercerita.'
    },
    {
      image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1920',
      title: 'Sutradara untuk setiap idemu.',
      desc: 'Pencocokan B-Roll tingkat lanjut untuk kreator modern. Semua dimulai dengan satu akun gratis.'
    }
  ]

  const selected = apiResponses[Math.floor(Math.random() * apiResponses.length)]
  dynamicImage.value = selected.image
  dynamicTitle.value = selected.title
  dynamicDesc.value = selected.desc
  isLoading.value = false
}

onMounted(() => fetchAIVisual())
</script>

<template>
  <div class="relative min-h-[calc(100vh-76px)] flex flex-col items-center justify-center p-6 font-sans">
    
    <!-- BANNER PEMBERITAHUAN JELAS DI BAGIAN ATAS -->
    <div class="w-full max-w-4xl mb-8 bg-amber-950/70 border border-amber-500/50 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-xl text-amber-200">
      <span class="text-2xl mt-0.5">⚠️</span>
      <div class="flex-1">
        <h3 class="font-bold text-sm sm:text-base text-amber-100">
          Akun dibuat oleh admin. Hubungi admin untuk mendapatkan akun.
        </h3>
        <p class="text-xs sm:text-sm text-amber-300/80 mt-1 leading-relaxed">
          Sistem VisuMatch saat ini tidak menyediakan formulir pendaftaran mandiri. Semua akun pengguna dibuat melalui sistem seed/admin.
        </p>
      </div>
      <RouterLink 
        to="/login" 
        class="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold px-4 py-2 rounded-lg text-xs transition shrink-0"
      >
        Kembali ke Login
      </RouterLink>
    </div>

    <!-- KONTEN UTAMA -->
    <div class="relative z-10 w-full max-w-6xl flex flex-col md:flex-row items-center gap-12 lg:gap-20">
      
      <!-- BAGIAN KIRI: Teks -->
      <div class="w-full md:w-1/2 mt-6 md:mt-0">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-800/60 border border-gray-700/50 text-purple-300 text-xs font-bold tracking-wider backdrop-blur-md mb-8 shadow-lg">
          <span>✨</span> IDE KECIL. KEMUNGKINAN BESAR.
        </div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-2xl">
          Bawa imajinasimu lebih jauh.
        </h1>
        <p class="text-gray-300 text-lg leading-relaxed max-w-lg drop-shadow-md">
          Ubah rangkaian kata menjadi video yang bermakna. Biarkan AI membantu, tetap kamu yang bercerita.
        </p>

        <!-- Benefit AI -->
        <div class="flex flex-col sm:flex-row gap-4 mt-8 text-emerald-400 text-xs font-bold">
          <div class="flex items-center gap-2 bg-gray-900/60 px-3.5 py-2 rounded-lg border border-gray-800">
            <span>✓</span> Terhubung ke Database B-Roll AI
          </div>
          <div class="flex items-center gap-2 bg-gray-900/60 px-3.5 py-2 rounded-lg border border-gray-800">
            <span>✓</span> Ekspor Final Cut Pro XML & EDL
          </div>
        </div>
      </div>

      <!-- BAGIAN KANAN: Form Register Nonaktif -->
      <div class="w-full md:w-1/2 max-w-md mx-auto">
        <div class="bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-8 sm:p-10 rounded-3xl shadow-2xl">
          <h2 class="text-2xl font-bold text-white mb-2">Mulai cerita pertamamu</h2>
          <p class="text-gray-400 text-sm mb-6">Pendaftaran Akun Baru</p>

          <form @submit.prevent class="space-y-4 opacity-50 select-none">
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">Nama lengkap</label>
              <input disabled type="text" placeholder="Nama lengkap" class="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-gray-500 text-sm cursor-not-allowed" />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">Email / Username</label>
              <input disabled type="text" placeholder="email@contoh.com" class="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-gray-500 text-sm cursor-not-allowed" />
            </div>
            
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">Kata sandi</label>
              <input disabled type="password" placeholder="••••••••" class="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-gray-500 text-sm cursor-not-allowed" />
            </div>

            <button disabled class="w-full bg-gray-800 border border-gray-700 text-gray-500 font-bold py-3.5 px-4 rounded-xl text-sm mt-4 cursor-not-allowed">
              Pendaftaran Dinonaktifkan
            </button>
          </form>

          <div class="mt-8 text-center">
            <RouterLink to="/login" class="text-sm font-semibold text-purple-400 hover:text-purple-300 transition">
              ← Kembali ke Halaman Login
            </RouterLink>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>