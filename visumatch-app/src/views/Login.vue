<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuth } from '../stores/auth'
import { showToast } from '../toast'

const router = useRouter()
const auth = useAuth()

const username = ref('')
const password = ref('')
const isSubmitting = ref(false)

// State Dinamis
const dynamicImage = ref('')
const dynamicTitle = ref('')
const dynamicDesc = ref('')
const isLoading = ref(true)

const fetchAIVisual = async () => {
  isLoading.value = true
  await new Promise(resolve => setTimeout(resolve, 300))

  const apiResponses = [
    {
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920',
      title: 'Cerita berikutnya, dimulai dari sini.',
      desc: 'Kembali ke alur kreatifmu. Naskah, media, dan semua ide hebatmu sudah menunggu.'
    },
    {
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1920',
      title: 'Visualisasikan ide tanpa batas.',
      desc: 'Mesin AI kami telah mendeteksi jutaan tren baru hari ini. Ayo lanjutkan mahakaryamu.'
    }
  ]

  const selected = apiResponses[Math.floor(Math.random() * apiResponses.length)]
  dynamicImage.value = selected.image
  dynamicTitle.value = selected.title
  dynamicDesc.value = selected.desc
  isLoading.value = false
}

const handleLogin = async () => {
  if (!username.value || !password.value) return
  isSubmitting.value = true
  try {
    await auth.login(username.value, password.value)
    showToast('Berhasil masuk ke VisuMatch', 'success')
    router.push('/dashboard')
  } catch (err) {
    // Pesan error sudah ditangani apiRequest via showToast
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => fetchAIVisual())
</script>

<template>
  <div class="relative min-h-[calc(100vh-76px)] flex items-center justify-center p-6 font-sans overflow-hidden">
    
    <!-- KONTEN UTAMA (Teks di Kiri, Form di Kanan) -->
    <div class="relative z-10 w-full max-w-6xl flex flex-col md:flex-row items-center gap-12 lg:gap-20">
      
      <!-- BAGIAN KIRI: Teks & Deskripsi AI -->
      <div class="w-full md:w-1/2 transition-opacity duration-700 mt-10 md:mt-0">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-800/60 border border-gray-700/50 text-purple-300 text-xs font-bold tracking-wider backdrop-blur-md mb-8 shadow-lg">
          <span>✨</span> RUANG UNTUK IDE BESARMU
        </div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-2xl">
          Cerita berikutnya, dimulai dari sini.
        </h1>
        <p class="text-gray-300 text-lg leading-relaxed max-w-lg drop-shadow-md">
          Kembali ke alur kreatifmu. Naskah, media, dan semua ide hebatmu sudah menunggu.
        </p>
      </div>

      <!-- BAGIAN KANAN: Form Glassmorphism -->
      <div class="w-full md:w-1/2 max-w-md mx-auto">
        <!-- Kartu Kaca (Backdrop Blur) -->
        <div class="bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-8 sm:p-10 rounded-3xl shadow-2xl">
          <h2 class="text-2xl font-bold text-white mb-2">Selamat datang kembali</h2>
          <p class="text-gray-400 text-sm mb-6">Masuk dan lanjutkan cerita yang kamu mulai.</p>

          <form @submit.prevent="handleLogin" class="space-y-5">
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1.5">Username</label>
              <input v-model="username" type="text" required placeholder="Masukkan username kamu" class="w-full px-4 py-3 rounded-xl bg-gray-950/80 border border-gray-700/50 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm placeholder-gray-600 outline-none" />
            </div>
            
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1.5">Kata sandi</label>
              <div class="relative">
                <input v-model="password" type="password" required placeholder="Masukkan kata sandi" class="w-full px-4 py-3 rounded-xl bg-gray-950/80 border border-gray-700/50 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm placeholder-gray-600 outline-none" />
              </div>
            </div>

            <button type="submit" :disabled="isSubmitting" class="w-full bg-purple-600 border border-purple-400 hover:bg-purple-700 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-purple-500/20 text-sm mt-4 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
              <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Masuk ke VisuMatch</span> <span>→</span>
            </button>
          </form>

          <p class="text-center text-xs text-gray-400 mt-8">
            Belum punya akun? 
            <RouterLink to="/register" class="text-white font-bold hover:text-purple-400 transition">Daftar akun</RouterLink>
          </p>
        </div>
      </div>
      
    </div>
  </div>
</template>