<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { useAuth } from '../stores/auth'
import { showToast } from '../toast'

const router = useRouter()
const auth = useAuth()

// State Pencarian B-Roll
const searchInput = ref('')
const searchSource = ref('all') // all, external, internal
const isSearching = ref(false)
const searchResults = ref([])
const searchWarnings = ref([])
const activePreviewVideo = ref(null)

// Modal Buat Proyek Baru
const showCreateModal = ref(false)
const newProjectName = ref('')
const selectedResolution = ref('1080p') // 1080p (16:9), 720p (9:16), 1:1 (square)
const isCreating = ref(false)

// Modal Tambah Klip dari Pencarian ke Proyek
const showAddToProjectModal = ref(false)
const selectedSearchResult = ref(null)
const targetProjectId = ref('')
const targetStartPos = ref(0)
const targetEndPos = ref(5)
const isAddingToProject = ref(false)

// Data Proyek Pengguna dari Backend
const projects = ref([])
const isLoadingProjects = ref(true)

const loadProjects = async () => {
  isLoadingProjects.value = true
  try {
    const res = await api.getProjects()
    projects.value = res.projects || []
  } catch (err) {
    // Handled in apiRequest
  } finally {
    isLoadingProjects.value = false
  }
}

// Handler Cari B-Roll
const handleSearch = async () => {
  const q = searchInput.value.trim()
  if (!q || q.length < 2) {
    showToast('Masukkan minimal 2 karakter untuk mencari B-Roll', 'info')
    return
  }

  isSearching.value = true
  searchResults.value = []
  searchWarnings.value = []

  try {
    const res = await api.searchBroll({
      q,
      source: searchSource.value,
      per_page: 12,
    })
    searchResults.value = res.results || []
    searchWarnings.value = res.warnings || []
    if (searchResults.value.length === 0) {
      showToast('Tidak ada video B-Roll yang ditemukan untuk kata kunci ini.', 'info')
    }
  } catch (err) {
    // Handled in apiRequest
  } finally {
    isSearching.value = false
  }
}

// Buka Modal Buat Proyek
const openCreateModal = () => {
  newProjectName.value = ''
  selectedResolution.value = '1080p'
  showCreateModal.value = true
}

// Eksekusi Pembuatan Proyek Baru
const handleCreateProject = async () => {
  const name = newProjectName.value.trim()
  if (!name) {
    showToast('Nama proyek wajib diisi', 'info')
    return
  }

  isCreating.value = true
  try {
    const res = await api.createProject(name, selectedResolution.value)
    if (res?.project?.project_id) {
      showToast('Proyek berhasil dibuat!', 'success')
      showCreateModal.value = false
      router.push(`/workspace/${res.project.project_id}`)
    }
  } catch (err) {
    // Handled
  } finally {
    isCreating.value = false
  }
}

// Buka Modal Tambahkan ke Proyek
const openAddToProject = (item) => {
  if (projects.value.length === 0) {
    showToast('Kamu belum memiliki proyek. Buat proyek terlebih dahulu.', 'info')
    openCreateModal()
    return
  }
  selectedSearchResult.value = item
  targetProjectId.value = String(projects.value[0].project_id)
  targetStartPos.value = 0
  targetEndPos.value = item.duration ? Math.min(item.duration, 5) : 5
  showAddToProjectModal.value = true
}

// Eksekusi Tambah ke Timeline Proyek
const handleExecuteAddToProject = async () => {
  if (!targetProjectId.value || !selectedSearchResult.value) return

  isAddingToProject.value = true
  try {
    const item = selectedSearchResult.value
    const payload = {
      source: item.source || (item.asset_id ? 'internal' : 'external'),
      start_pos: parseFloat(targetStartPos.value) || 0,
      end_pos: parseFloat(targetEndPos.value) || undefined,
      track_layer: 'V2',
    }

    if (payload.source === 'external') {
      payload.provider = item.provider || 'pexels'
      payload.preview_url = item.preview_url || item.thumbnail_url
      payload.q = searchInput.value || item.title
      payload.external_id = String(item.id)
    } else {
      payload.asset_id = item.asset_id || item.id
    }

    await api.addTimelineFromSearch(targetProjectId.value, payload)
    showToast('Klip B-Roll berhasil ditambahkan ke timeline proyek!', 'success')
    showAddToProjectModal.value = false
    selectedSearchResult.value = null
  } catch (err) {
    // Handled
  } finally {
    isAddingToProject.value = false
  }
}

// Hapus Proyek
const handleDeleteProject = async (id, event) => {
  event.stopPropagation()
  if (!confirm('Apakah kamu yakin ingin menghapus proyek ini? Tindakan ini tidak dapat dibatalkan.')) {
    return
  }
  try {
    await api.deleteProject(id)
    showToast('Proyek berhasil dihapus', 'success')
    projects.value = projects.value.filter(p => p.project_id !== id)
  } catch (err) {
    // Handled
  }
}

const openWorkspace = (id) => {
  router.push(`/workspace/${id}`)
}

const formatDuration = (secs) => {
  if (!secs) return '00:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const formatDate = (dateString) => {
  if (!dateString) return 'Baru dibuat'
  const d = new Date(dateString)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(() => {
  loadProjects()
})
</script>

<template>
  <div class="relative min-h-[calc(100vh-76px)] w-full flex flex-col font-sans">
    
    <!-- ============================================== -->
    <!-- BAGIAN ATAS: Hero & Pencarian B-Roll           -->
    <!-- ============================================== -->
    <div class="relative z-10 w-full max-w-7xl mx-auto px-6 pt-12 md:pt-16 flex flex-col items-center text-center">
      
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-900/80 border border-purple-500/30 text-purple-300 text-xs font-bold tracking-wider mb-4 shadow-lg">
        <span>✨</span> PENCARIAN B-ROLL CERDAS
      </div>

      <h1 class="text-3xl md:text-5xl font-bold text-white mb-3">
        Halo, {{ auth.username.value || 'Kreator' }}. Cari Visual Apa Hari Ini?
      </h1>
      
      <p class="text-gray-400 text-sm md:text-base mb-8 max-w-2xl">
        Ketik kata kunci untuk mencari stok video sinematik dari Pexels, Pixabay, atau aset internal studio.
      </p>

      <!-- Tombol Buat Proyek Menonjol di Atas -->
      <div class="mb-8">
        <button 
          @click="openCreateModal"
          class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl transition shadow-xl shadow-purple-600/30 text-sm flex items-center gap-2 cursor-pointer border border-purple-400"
        >
          <span>➕</span>
          <span>Buat Proyek Sekarang</span>
        </button>
      </div>

      <!-- Kotak Pencarian B-Roll -->
      <div class="w-full max-w-4xl bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-4 shadow-2xl">
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="relative flex-1">
            <span class="absolute left-4 top-3.5 text-gray-500 text-base">🔍</span>
            <input 
              v-model="searchInput"
              @keyup.enter="handleSearch"
              type="text" 
              placeholder="Cari B-Roll, contoh: pantai saat matahari terbenam..." 
              class="w-full pl-11 pr-4 py-3 bg-gray-950 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm outline-none focus:border-purple-500 transition"
            />
          </div>

          <div class="flex items-center gap-2">
            <select 
              v-model="searchSource" 
              class="bg-gray-950 border border-gray-700/80 rounded-xl px-3 py-3 text-xs text-gray-300 outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">Semua Sumber</option>
              <option value="external">Eksternal</option>
              <option value="internal">Aset Internal</option>
            </select>

            <button 
              @click="handleSearch" 
              :disabled="isSearching"
              class="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <span v-if="isSearching" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span v-else>Cari Video</span>
            </button>
          </div>
        </div>

        <!-- Warning dari API Search jika ada -->
        <div v-if="searchWarnings.length > 0" class="mt-3 text-left bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-lg text-xs text-amber-300">
          <p v-for="w in searchWarnings" :key="w">⚠️ {{ w }}</p>
        </div>
      </div>

      <!-- Grid Hasil Pencarian B-Roll -->
      <div v-if="isSearching" class="w-full max-w-7xl mt-8 py-12 text-center text-gray-400">
        <div class="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Mencari video B-Roll di seluruh provider...
      </div>

      <div v-else-if="searchResults.length > 0" class="w-full max-w-7xl mt-8 text-left">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <span>🎬</span> Hasil Pencarian: <span class="text-purple-400">"{{ searchInput }}"</span>
          </h3>
          <span class="text-xs text-gray-400">{{ searchResults.length }} video ditemukan</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          <div 
            v-for="item in searchResults" 
            :key="item.id" 
            class="bg-gray-900/90 border border-gray-800 rounded-xl overflow-hidden group hover:border-purple-500/50 transition flex flex-col shadow-lg"
          >
            <!-- Thumbnail & Preview Video -->
            <div 
              class="relative aspect-video bg-black overflow-hidden cursor-pointer"
              @mouseenter="activePreviewVideo = item.id"
              @mouseleave="activePreviewVideo = null"
            >
              <video 
                v-if="activePreviewVideo === item.id && item.preview_url"
                :src="item.preview_url"
                autoplay
                muted
                loop
                class="w-full h-full object-cover"
              ></video>
              <img 
                v-else 
                :src="item.thumbnail_url" 
                :alt="item.title" 
                class="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
              />

              <span class="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-[10px] uppercase font-bold text-purple-300 px-2 py-0.5 rounded">
                {{ item.provider || item.source }}
              </span>
              <span v-if="item.duration" class="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-white font-mono">
                {{ item.duration }}s
              </span>
            </div>

            <!-- Detail & Tombol Tambah ke Proyek -->
            <div class="p-3.5 flex flex-col justify-between flex-1 gap-3">
              <p class="text-xs font-semibold text-white line-clamp-1" :title="item.title">{{ item.title || 'Video B-Roll' }}</p>
              
              <button 
                @click="openAddToProject(item)"
                class="w-full bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <span>➕</span> Tambahkan ke Proyek
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ============================================== -->
    <!-- BAGIAN BAWAH: Daftar Proyek Terbarumu          -->
    <!-- ============================================== -->
    <div class="relative z-10 w-full max-w-7xl mx-auto px-6 py-12 flex-grow flex flex-col mt-6">
      
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 pb-4 border-b border-gray-800">
        <div class="flex items-baseline gap-3">
          <h2 class="text-xl font-bold text-white">Proyek Terbarumu</h2>
          <span class="text-gray-500 text-xs">{{ projects.length }} proyek aktif</span>
        </div>
        
        <div class="flex items-center gap-3">
          <button 
            @click="openCreateModal"
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/20"
          >
            <span>+</span> Buat Proyek Sekarang
          </button>
          <button @click="loadProjects" class="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-xs transition cursor-pointer">
            🔄 Segarkan
          </button>
        </div>
      </div>

      <!-- State Loading Proyek -->
      <div v-if="isLoadingProjects" class="py-16 text-center">
        <div class="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-sm text-gray-400">Memuat daftar proyek...</p>
      </div>

      <!-- State Proyek Kosong -->
      <div v-else-if="projects.length === 0" class="py-16 text-center bg-gray-900/40 border border-dashed border-gray-800 rounded-2xl">
        <p class="text-gray-400 text-sm mb-4">Belum ada proyek yang dibuat.</p>
        <button @click="openCreateModal" class="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer">
          Mulai Buat Proyek Pertamamu
        </button>
      </div>

      <!-- Grid Proyek -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        
        <div 
          v-for="project in projects" 
          :key="project.project_id" 
          class="group cursor-pointer bg-gray-900/60 border border-gray-800 rounded-xl p-3.5 hover:border-purple-500/50 transition duration-300 shadow-lg"
          @click="openWorkspace(project.project_id)"
        >
          <!-- Thumbnail Video -->
          <div class="relative aspect-video rounded-lg overflow-hidden bg-gray-950 border border-gray-800 mb-3 shadow-lg flex items-center justify-center">
            <div class="w-full h-full bg-gradient-to-tr from-purple-950/40 via-gray-900 to-indigo-950/40 flex items-center justify-center">
              <span class="text-3xl opacity-40 group-hover:scale-110 transition duration-300">🎬</span>
            </div>
            
            <div class="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
              {{ formatDuration(project.media_aroll?.[0]?.duration) }}
            </div>

            <div class="absolute top-2 left-2 bg-purple-950/80 border border-purple-500/30 text-purple-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
              {{ project.resolution || '1080p' }}
            </div>
            
            <div class="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
              <div class="w-10 h-10 bg-purple-600/90 rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur">▶</div>
            </div>
          </div>
          
          <!-- Teks Proyek -->
          <div class="flex justify-between items-start">
            <div class="pr-2 min-w-0">
              <h3 class="text-white font-bold text-sm truncate group-hover:text-purple-400 transition">{{ project.project_name }}</h3>
              <p class="text-gray-500 text-[11px] mt-1">{{ formatDate(project.updated_at || project.created_at) }}</p>
            </div>
            <div class="flex flex-col items-end gap-1 shrink-0">
              <button 
                @click="handleDeleteProject(project.project_id, $event)" 
                class="text-gray-500 hover:text-red-400 text-sm leading-none p-1 transition cursor-pointer"
                title="Hapus proyek"
              >
                🗑️
              </button>
              <span 
                class="text-[9px] font-medium uppercase px-1.5 py-0.5 rounded" 
                :class="project.pipeline_status?.status === 'completed' ? 'bg-emerald-950 text-emerald-400' : 'bg-gray-800 text-gray-400'"
              >
                {{ project.pipeline_status?.status || 'draf' }}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODAL BUAT PROYEK SEKARANG                     -->
    <!-- ============================================== -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
        <h3 class="text-xl font-bold text-white mb-2">Buat Proyek Baru</h3>
        <p class="text-xs text-gray-400 mb-6">Tentukan nama proyek dan orientasi resolusi video kamu.</p>

        <form @submit.prevent="handleCreateProject" class="space-y-5 text-xs">
          <div>
            <label class="block text-gray-300 font-medium mb-1.5">Nama Proyek *</label>
            <input 
              v-model="newProjectName"
              type="text" 
              required 
              placeholder="Contoh: Video Eksplorasi Alam"
              class="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-purple-500" 
            />
          </div>

          <div>
            <label class="block text-gray-300 font-medium mb-1.5">Pilihan Resolusi & Orientasi</label>
            <div class="grid grid-cols-3 gap-2.5">
              <label 
                class="p-3 border rounded-xl cursor-pointer flex flex-col items-center text-center transition"
                :class="selectedResolution === '1080p' ? 'border-purple-500 bg-purple-950/40 text-purple-200' : 'border-gray-800 bg-gray-950 text-gray-400'"
              >
                <input type="radio" v-model="selectedResolution" value="1080p" class="hidden" />
                <span class="text-base mb-1">🖥️</span>
                <span class="font-bold text-xs">16:9</span>
                <span class="text-[10px] opacity-70">1920×1080</span>
                <span class="text-[9px] mt-1 text-purple-400">Landscape</span>
              </label>

              <label 
                class="p-3 border rounded-xl cursor-pointer flex flex-col items-center text-center transition"
                :class="selectedResolution === '720p' ? 'border-purple-500 bg-purple-950/40 text-purple-200' : 'border-gray-800 bg-gray-950 text-gray-400'"
              >
                <input type="radio" v-model="selectedResolution" value="720p" class="hidden" />
                <span class="text-base mb-1">📱</span>
                <span class="font-bold text-xs">9:16</span>
                <span class="text-[10px] opacity-70">1080×1920</span>
                <span class="text-[9px] mt-1 text-purple-400">Portrait</span>
              </label>

              <label 
                class="p-3 border rounded-xl cursor-pointer flex flex-col items-center text-center transition"
                :class="selectedResolution === '1:1' ? 'border-purple-500 bg-purple-950/40 text-purple-200' : 'border-gray-800 bg-gray-950 text-gray-400'"
              >
                <input type="radio" v-model="selectedResolution" value="1:1" class="hidden" />
                <span class="text-base mb-1">⏹️</span>
                <span class="font-bold text-xs">1:1</span>
                <span class="text-[10px] opacity-70">1080×1080</span>
                <span class="text-[9px] mt-1 text-purple-400">Square</span>
              </label>
            </div>
          </div>

          <div class="flex gap-3 pt-3">
            <button 
              type="button" 
              @click="showCreateModal = false"
              class="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl transition font-medium cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit" 
              :disabled="isCreating"
              class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl transition font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-600/30"
            >
              <span v-if="isCreating" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Buat Proyek</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODAL TAMBAHKAN KE PROYEK                      -->
    <!-- ============================================== -->
    <div v-if="showAddToProjectModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
        <h3 class="text-lg font-bold text-white mb-2">Tambahkan ke Proyek</h3>
        <p class="text-xs text-gray-400 mb-4 truncate">{{ selectedSearchResult?.title }}</p>

        <form @submit.prevent="handleExecuteAddToProject" class="space-y-4 text-xs">
          <div>
            <label class="block text-gray-300 font-medium mb-1">Pilih Proyek Target *</label>
            <select 
              v-model="targetProjectId"
              required 
              class="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500 cursor-pointer"
            >
              <option v-for="p in projects" :key="p.project_id" :value="String(p.project_id)">
                {{ p.project_name }} ({{ p.resolution || '1080p' }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-gray-300 font-medium mb-1">Posisi Mulai (detik)</label>
              <input 
                v-model.number="targetStartPos"
                type="number" 
                step="0.5" 
                min="0"
                required
                class="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500" 
              />
            </div>
            <div>
              <label class="block text-gray-300 font-medium mb-1">Posisi Selesai (detik)</label>
              <input 
                v-model.number="targetEndPos"
                type="number" 
                step="0.5" 
                min="0.1"
                required
                class="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500" 
              />
            </div>
          </div>

          <div class="flex gap-3 pt-3">
            <button 
              type="button" 
              @click="showAddToProjectModal = false"
              class="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl transition font-medium cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit" 
              :disabled="isAddingToProject"
              class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl transition font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-600/30"
            >
              <span v-if="isAddingToProject" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Tambahkan</span>
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>