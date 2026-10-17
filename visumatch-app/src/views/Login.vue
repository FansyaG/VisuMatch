<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')

const handleLogin = () => {
  // Karena ini prototipe, kita abaikan validasi database MySQL sementara.
  // Selama form diisi, langsung arahkan pengguna ke halaman Dashboard.
  if (email.value && password.value) {
    router.push('/dashboard')
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[80vh] px-4">
    <!-- Kartu Login -->
    <div class="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700 w-full max-w-md">
      
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Selamat Datang</h1>
        <p class="text-gray-400">Masuk ke ruang kerja VisuMatch Anda</p>
      </div>

      <!-- Form Interaktif -->
      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input 
            v-model="email" 
            type="email" 
            required 
            placeholder="nama@email.com" 
            class="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" 
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
          <input 
            v-model="password" 
            type="password" 
            required 
            placeholder="••••••••" 
            class="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-600 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition" 
          />
        </div>

        <button 
          type="submit" 
          class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-lg transition shadow-lg shadow-purple-500/30"
        >
          Masuk
        </button>
      </form>
      
      <p class="text-center text-sm text-gray-400 mt-6">
        Belum punya akun? <RouterLink to="/register" class="text-purple-400 hover:text-purple-300 transition">Daftar sekarang</RouterLink>
      </p>

    </div>
  </div>
</template>