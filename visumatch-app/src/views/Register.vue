<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { api } from '../api'
import { showToast } from '../toast'

const router = useRouter()

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const showPassword = ref(false)
const showConfirmPassword = ref(false)

const isSubmitting = ref(false)
const errorMessage = ref('')

// Client-side validations
const validate = () => {
  if (!username.value || username.value.trim().length < 3) {
    return 'Username minimal 3 karakter.'
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username.value.trim())) {
    return 'Username hanya boleh berupa huruf, angka, atau underscore.'
  }
  if (!email.value || !email.value.includes('@') || !email.value.includes('.')) {
    return 'Format alamat email tidak valid.'
  }
  if (!password.value || password.value.length < 8) {
    return 'Kata sandi minimal 8 karakter.'
  }
  if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(password.value)) {
    return 'Kata sandi harus mengandung kombinasi huruf dan angka.'
  }
  if (password.value !== confirmPassword.value) {
    return 'Konfirmasi kata sandi tidak cocok.'
  }
  return null
}

const handleRegister = async () => {
  errorMessage.value = ''
  const valError = validate()
  if (valError) {
    errorMessage.value = valError
    showToast(valError, 'error')
    return
  }

  isSubmitting.value = true
  try {
    const res = await api.register(username.value.trim(), email.value.trim(), password.value)
    showToast(res.message || 'Pendaftaran berhasil! Kode verifikasi telah dikirim.', 'success')
    router.push({
      path: '/verify-email',
      query: { email: email.value.trim() },
    })
  } catch (err) {
    const errCode = err?.data?.error?.code
    const errMsg = err?.data?.error?.message

    if (errCode === 'USERNAME_TAKEN') {
      errorMessage.value = 'Username sudah dipakai oleh pengguna lain.'
    } else if (errCode === 'EMAIL_TAKEN') {
      errorMessage.value = 'Email sudah terdaftar. Silakan login atau gunakan email lain.'
    } else if (errCode === 'RESEND_TOO_SOON') {
      errorMessage.value = errMsg || 'Harap tunggu 60 detik sebelum meminta kode baru.'
    } else {
      errorMessage.value = errMsg || 'Terjadi kesalahan saat pendaftaran. Silakan coba lagi.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="relative min-h-[calc(100vh-76px)] flex flex-col items-center justify-center p-6 font-sans">
    
    <!-- KONTEN UTAMA -->
    <div class="relative z-10 w-full max-w-6xl flex flex-col md:flex-row items-center gap-12 lg:gap-20">
      
      <!-- BAGIAN KIRI: Teks & Penjelasan Visual -->
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

      <!-- BAGIAN KANAN: Form Register Aktif -->
      <div class="w-full md:w-1/2 max-w-md mx-auto">
        <div class="bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-8 sm:p-10 rounded-3xl shadow-2xl">
          <h2 class="text-2xl font-bold text-white mb-2">Mulai cerita pertamamu</h2>
          <p class="text-gray-400 text-sm mb-6">Pendaftaran Akun Kreator Baru</p>

          <!-- Error Alert Banner -->
          <div v-if="errorMessage" class="mb-5 bg-red-950/60 border border-red-500/40 text-red-200 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
            <span class="text-sm mt-[-2px]">⚠️</span>
            <span class="flex-1 leading-relaxed">{{ errorMessage }}</span>
          </div>

          <form @submit.prevent="handleRegister" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1.5">Username</label>
              <input 
                v-model="username" 
                type="text" 
                required 
                placeholder="Pilih username unik (min. 3 karakter)" 
                class="w-full px-4 py-3 rounded-xl bg-gray-950/80 border border-gray-700/50 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm placeholder-gray-600 outline-none" 
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1.5">Email</label>
              <input 
                v-model="email" 
                type="email" 
                required 
                placeholder="nama@email.com" 
                class="w-full px-4 py-3 rounded-xl bg-gray-950/80 border border-gray-700/50 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm placeholder-gray-600 outline-none" 
              />
            </div>
            
            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1.5">Kata Sandi</label>
              <div class="relative">
                <input 
                  v-model="password" 
                  :type="showPassword ? 'text' : 'password'" 
                  required 
                  placeholder="Min. 8 karakter (huruf & angka)" 
                  class="w-full px-4 py-3 pr-11 rounded-xl bg-gray-950/80 border border-gray-700/50 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm placeholder-gray-600 outline-none" 
                />
                <button 
                  type="button" 
                  @click="showPassword = !showPassword" 
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition p-1 text-sm cursor-pointer select-none"
                  :title="showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'"
                >
                  <span v-if="showPassword">👁️</span>
                  <span v-else>👁️‍🗨️</span>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-300 mb-1.5">Konfirmasi Kata Sandi</label>
              <div class="relative">
                <input 
                  v-model="confirmPassword" 
                  :type="showConfirmPassword ? 'text' : 'password'" 
                  required 
                  placeholder="Ulangi kata sandi" 
                  class="w-full px-4 py-3 pr-11 rounded-xl bg-gray-950/80 border border-gray-700/50 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm placeholder-gray-600 outline-none" 
                />
                <button 
                  type="button" 
                  @click="showConfirmPassword = !showConfirmPassword" 
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition p-1 text-sm cursor-pointer select-none"
                  :title="showConfirmPassword ? 'Sembunyikan konfirmasi sandi' : 'Tampilkan konfirmasi sandi'"
                >
                  <span v-if="showConfirmPassword">👁️</span>
                  <span v-else>👁️‍🗨️</span>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              :disabled="isSubmitting" 
              class="w-full bg-purple-600 border border-purple-400 hover:bg-purple-700 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-purple-500/20 text-sm mt-4 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Daftar Akun Kreator</span> <span>→</span>
            </button>
          </form>

          <div class="mt-8 text-center text-xs text-gray-400">
            Sudah memiliki akun? 
            <RouterLink to="/login" class="text-purple-400 font-bold hover:text-purple-300 transition">
              Masuk di sini
            </RouterLink>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>
