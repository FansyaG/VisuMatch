<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Data Proyek
const projects = ref([
  { id: 1, name: 'Otomatisasi B-Roll Cinematic', resolution: '4K', date: '18 Okt 2026' },
  { id: 2, name: 'Vlog Liburan Bali', resolution: '1080p', date: '17 Okt 2026' }
])

const showModal = ref(false)
const newProjectName = ref('')
const newProjectRes = ref('1080p')

// Fitur Pencarian B-Roll Manual (Dashboard)
const searchQuery = ref('')
const handleSearch = () => {
  if (searchQuery.value) {
    alert(`Mensimulasikan pencarian API untuk: "${searchQuery.value}"... (Fitur MVP)`)
    searchQuery.value = ''
  }
}

const handleCreateProject = () => {
  if (newProjectName.value) {
    projects.value.unshift({ id: Date.now(), name: newProjectName.value, resolution: newProjectRes.value, date: 'Hari ini' })
    showModal.value = false
    newProjectName.value = ''
    newProjectRes.value = '1080p'
  }
}

const handleDelete = (id) => {
  if(confirm('Hapus proyek ini secara permanen?')) projects.value = projects.value.filter(p => p.id !== id)
}

const openWorkspace = () => router.push('/workspace')
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-8 min-h-[80vh] w-full">
    
    <!-- Header & Pencarian B-Roll Manual -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
      <div>
        <h1 class="text-3xl font-bold text-white">Proyek Saya</h1>
        <p class="text-gray-400 mt-1">Kelola dan lanjutkan proses editing Anda</p>
      </div>
      
      <div class="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
        <!-- Input Pencarian Manual -->
        <div class="relative w-full sm:w-64">
          <input 
            v-model="searchQuery" 
            @keyup.enter="handleSearch"
            type="text" 
            placeholder="Cari stok B-Roll..." 
            class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition text-sm"
          />
          <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        
        <button @click="showModal = true" class="bg-purple-600 hover:bg-purple-700 text-white font-medium px-5 py-2.5 rounded-lg transition shadow-lg shadow-purple-500/30 whitespace-nowrap text-sm">
          + Buat Proyek Baru
        </button>
      </div>
    </div>

    <!-- Grid Daftar Proyek -->
    <div v-if="projects.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="project in projects" :key="project.id" class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-purple-500 transition group flex flex-col">
        <div class="h-40 bg-gray-900 relative group-hover:bg-gray-850 transition cursor-pointer" @click="openWorkspace">
          <div class="absolute inset-0 flex items-center justify-center"><span class="text-gray-600 font-medium">B-Roll Preview</span></div>
          <span class="absolute bottom-2 right-2 bg-black/70 text-xs px-2 py-1 rounded text-gray-300">{{ project.resolution }}</span>
        </div>
        <div class="p-5 flex-grow flex flex-col justify-between">
          <div>
            <h3 class="text-lg font-bold text-white mb-1 truncate">{{ project.name }}</h3>
            <p class="text-sm text-gray-400">Terakhir diubah: {{ project.date }}</p>
          </div>
          <div class="mt-5 flex justify-between items-center">
            <button @click="openWorkspace" class="text-purple-400 hover:text-purple-300 text-sm font-medium transition">Buka Editor &rarr;</button>
            <button @click="handleDelete(project.id)" class="text-red-400 hover:text-red-300 text-sm font-medium transition">Hapus</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- State Kosong -->
    <div v-else class="text-center py-20 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
      <p class="text-gray-400 mb-4">Belum ada proyek video yang dibuat.</p>
      <button @click="showModal = true" class="text-purple-400 hover:text-purple-300 font-medium">Mulai Proyek Pertama Anda</button>
    </div>

    <!-- Modal Buat Proyek -->
    <div v-if="showModal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
        <div class="p-6 border-b border-gray-700"><h2 class="text-xl font-bold text-white">Buat Proyek Baru</h2></div>
        <form @submit.prevent="handleCreateProject" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Nama Proyek</label>
            <input v-model="newProjectName" type="text" required placeholder="Contoh: Video Promosi Kampus" class="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-600 text-white focus:border-purple-500 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Resolusi Target</label>
            <select v-model="newProjectRes" class="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-600 text-white focus:border-purple-500 text-sm">
              <option value="1080p">1080p (Full HD)</option>
              <option value="4K">4K (Ultra HD)</option>
              <option value="Vertical">9:16 (TikTok/Reels)</option>
            </select>
          </div>
          <div class="flex gap-3 pt-4">
            <button type="button" @click="showModal = false" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm">Batal</button>
            <button type="submit" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg shadow-lg shadow-purple-500/30 text-sm">Buat Proyek</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>