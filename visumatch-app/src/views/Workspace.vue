<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { showToast } from '../toast'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => route.params.id)
const project = ref(null)
const timeline = ref([])
const activeTab = ref('broll') // broll, media
const isPlaying = ref(false)

// Pipeline Status
const pipelineStatus = ref({
  stage: 'idle',
  status: 'idle',
  error_message: null
})
let pollInterval = null

// Selected Clip for Inspector
const selectedClip = ref(null)
const clipStart = ref(0)
const clipEnd = ref(5)
const isPatchingClip = ref(false)
const isRegenerating = ref(false)
const regenKeyword = ref('')

// A-Roll Media Player & Playhead
const arollMedia = computed(() => project.value?.media_aroll?.[0] || null)
const arollVideoRef = ref(null)
const arollAudioRef = ref(null)
const currentTime = ref(0)

const arollStreamUrl = computed(() => {
  if (!arollMedia.value || !projectId.value) return null
  const token = localStorage.getItem('token') || ''
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
  return `${baseUrl}/projects/${projectId.value}/aroll/stream?token=${encodeURIComponent(token)}`
})

const isAudioARoll = computed(() => {
  if (!arollMedia.value) return false
  const ext = arollMedia.value.file_name?.toLowerCase() || ''
  return ext.endsWith('.mp3') || ext.endsWith('.wav') || ext.endsWith('.mpeg') || ext.endsWith('.ogg')
})

// Timeline Playhead & Ruler
const playheadPercent = computed(() => {
  const dur = maxTimelineDuration.value || 60
  return Math.min((currentTime.value / dur) * 100, 100)
})

const onARollTimeUpdate = (e) => {
  currentTime.value = e.target.currentTime || 0
}

// A-Roll Upload
const fileInput = ref(null)
const isUploading = ref(false)

// Search Manual B-Roll
const searchQuery = ref('')
const searchSource = ref('all') // all, external, internal
const isSearching = ref(false)
const searchResults = ref([])
const searchWarnings = ref([])
const addingClipId = ref(null)

// Current Preview
const previewUrl = computed(() => {
  if (selectedClip.value) {
    if (selectedClip.value.b_roll?.source_url) return selectedClip.value.b_roll.source_url
    if (selectedClip.value.asset?.file_path) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
      const origin = baseUrl.replace(/\/api\/v1\/?$/, '')
      return `${origin}/storage/${selectedClip.value.asset.file_path}`
    }
  }
  const firstWithUrl = timeline.value.find(t => t.b_roll?.source_url || t.asset?.file_path)
  if (firstWithUrl) {
    if (firstWithUrl.b_roll?.source_url) return firstWithUrl.b_roll.source_url
    if (firstWithUrl.asset?.file_path) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
      const origin = baseUrl.replace(/\/api\/v1\/?$/, '')
      return `${origin}/storage/${firstWithUrl.asset.file_path}`
    }
  }
  return null
})

// Load Project Details
const loadProjectDetail = async () => {
  if (!projectId.value) return
  try {
    const res = await api.getProjectDetail(projectId.value)
    project.value = res.project
    if (res.project?.timeline_edl) {
      timeline.value = res.project.timeline_edl
    }
    if (res.project?.pipeline_status) {
      pipelineStatus.value = res.project.pipeline_status
    }
  } catch (err) {
    // Handled
  }
}

// Load Timeline
const loadTimeline = async () => {
  if (!projectId.value) return
  try {
    const res = await api.getTimeline(projectId.value)
    timeline.value = res.timeline || []
    if (selectedClip.value) {
      const refreshed = timeline.value.find(t => t.edl_id === selectedClip.value.edl_id)
      if (refreshed) selectClip(refreshed)
    }
  } catch (err) {
    // Handled
  }
}

// Poll Pipeline
const checkPipeline = async () => {
  if (!projectId.value) return
  try {
    const status = await api.getPipelineStatus(projectId.value)
    pipelineStatus.value = status

    if (status.status === 'completed' || status.status === 'failed') {
      stopPolling()
      if (status.status === 'completed') {
        showToast('Pipeline AI selesai memproses B-Roll!', 'success')
        await loadTimeline()
        await loadProjectDetail()
      } else if (status.status === 'failed') {
        showToast(`Pipeline gagal: ${status.error_message || 'Terjadi kesalahan sistem'}`, 'error')
      }
    }
  } catch (err) {
    stopPolling()
  }
}

const startPolling = () => {
  stopPolling()
  pollInterval = setInterval(checkPipeline, 2000)
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// Upload A-Roll Handler
const triggerUploadARoll = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const handleFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file || !projectId.value) return
  isUploading.value = true
  try {
    await api.uploadARoll(projectId.value, file)
    showToast('A-Roll berhasil diunggah. Pipeline AI sedang berjalan...', 'success')
    pipelineStatus.value = { stage: 'transcribing', status: 'running', error_message: null }
    startPolling()
    await loadProjectDetail()
  } catch (err) {
    // Handled
  } finally {
    isUploading.value = false
    event.target.value = ''
  }
}

// Select Clip for editing
const selectClip = (clip) => {
  selectedClip.value = clip
  clipStart.value = clip.start_pos
  clipEnd.value = clip.end_pos
  regenKeyword.value = clip.b_roll?.search_query || clip.asset?.title || ''
}

// Patch Clip
const handlePatchClip = async () => {
  if (!selectedClip.value || !projectId.value) return
  isPatchingClip.value = true
  try {
    const res = await api.patchTimeline(projectId.value, selectedClip.value.edl_id, {
      start_pos: parseFloat(clipStart.value),
      end_pos: parseFloat(clipEnd.value),
    })
    showToast('Posisi klip diperbarui', 'success')
    selectedClip.value = res.timeline_item
    await loadTimeline()
  } catch (err) {
    // Handled
  } finally {
    isPatchingClip.value = false
  }
}

// Regenerate Clip
const handleRegenerateClip = async () => {
  if (!selectedClip.value) return
  isRegenerating.value = true
  try {
    const res = await api.regenerateTimeline(selectedClip.value.edl_id, regenKeyword.value.trim() || undefined)
    showToast(`B-Roll berhasil diperbarui (${res.keyword || 'baru'})`, 'success')
    selectedClip.value = res.timeline_item
    await loadTimeline()
  } catch (err) {
    // Handled
  } finally {
    isRegenerating.value = false
  }
}

// Delete Clip
const handleDeleteClip = async (edlId) => {
  if (!confirm('Hapus klip ini dari timeline?')) return
  try {
    await api.deleteTimeline(edlId)
    showToast('Klip dihapus dari timeline', 'success')
    if (selectedClip.value?.edl_id === edlId) {
      selectedClip.value = null
    }
    await loadTimeline()
  } catch (err) {
    // Handled
  }
}

// Search B-Roll Manual
const handleSearchBroll = async () => {
  if (!searchQuery.value.trim() || searchQuery.value.trim().length < 2) {
    showToast('Masukkan minimal 2 karakter pencarian', 'info')
    return
  }
  isSearching.value = true
  searchResults.value = []
  searchWarnings.value = []
  try {
    const res = await api.searchBroll({
      q: searchQuery.value.trim(),
      source: searchSource.value,
      per_page: 8,
    })
    searchResults.value = res.results || []
    searchWarnings.value = res.warnings || []
  } catch (err) {
    // Handled
  } finally {
    isSearching.value = false
  }
}

// Add to timeline from search
const handleAddToTimeline = async (item) => {
  if (!projectId.value) return
  addingClipId.value = item.id
  try {
    const lastClip = [...timeline.value].sort((a, b) => b.end_pos - a.end_pos)[0]
    const startPos = lastClip ? lastClip.end_pos : 0

    const payload = {
      source: item.source || (item.asset_id ? 'internal' : 'external'),
      start_pos: startPos,
      track_layer: 'V2',
    }

    if (payload.source === 'external') {
      payload.provider = item.provider || 'pexels'
      payload.preview_url = item.preview_url || item.thumbnail_url
      payload.q = searchQuery.value || item.title
      payload.external_id = String(item.id)
    } else {
      payload.asset_id = item.asset_id || item.id
    }

    await api.addTimelineFromSearch(projectId.value, payload)
    showToast('Klip berhasil ditambahkan ke timeline', 'success')
    await loadTimeline()
  } catch (err) {
    // Handled
  } finally {
    addingClipId.value = null
  }
}

// Export Timeline XML
const handleExportXml = async () => {
  if (!projectId.value) return
  try {
    const blob = await api.exportTimeline(projectId.value, 'xml')
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.value?.project_name || 'timeline'}.xml`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    showToast('File XML Timeline berhasil diunduh', 'success')
  } catch (err) {
    // Handled
  }
}

const maxTimelineDuration = computed(() => {
  const arollDur = project.value?.media_aroll?.[0]?.duration || 60
  const maxEnd = timeline.value.reduce((acc, cur) => Math.max(acc, cur.end_pos), arollDur)
  return Math.max(maxEnd, 60)
})

const getClipStyle = (clip) => {
  const total = maxTimelineDuration.value
  const left = (clip.start_pos / total) * 100
  const width = Math.max(((clip.end_pos - clip.start_pos) / total) * 100, 2)
  return {
    left: `${left}%`,
    width: `${width}%`,
  }
}

onMounted(async () => {
  if (!projectId.value) {
    try {
      const res = await api.getProjects()
      if (res.projects?.length > 0) {
        router.replace(`/workspace/${res.projects[0].project_id}`)
        return
      } else {
        router.replace('/dashboard')
        return
      }
    } catch {
      router.replace('/dashboard')
      return
    }
  }

  await loadProjectDetail()
  await loadTimeline()

  if (pipelineStatus.value?.status === 'running' || pipelineStatus.value?.status === 'processing') {
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="h-screen w-full bg-gray-950 flex flex-col font-sans text-sm overflow-hidden selection:bg-purple-500/30">
    
    <!-- Input File Tersembunyi untuk Upload A-Roll -->
    <input 
      type="file" 
      ref="fileInput" 
      @change="handleFileChange" 
      accept="video/*,audio/*" 
      class="hidden" 
    />

    <!-- ========================================== -->
    <!-- HEADER WORKSPACE                           -->
    <!-- ========================================== -->
    <header class="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
      <div class="flex items-center gap-4">
        <button @click="router.push('/dashboard')" class="text-gray-400 hover:text-white transition cursor-pointer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <div class="flex items-center gap-3">
          <h1 class="text-white font-bold text-base">{{ project?.project_name || 'Memuat Proyek...' }}</h1>
          <span class="text-gray-600 text-xs ml-2">{{ project?.resolution || '1080p' }} • {{ project?.media_aroll?.[0]?.duration ? `${project.media_aroll[0].duration}s` : 'Belum ada media' }}</span>
        </div>
      </div>

      <!-- Status Pipeline Indicator -->
      <div class="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-950/70 border border-gray-800 rounded-full text-xs">
        <span 
          class="w-2 h-2 rounded-full" 
          :class="{
            'bg-amber-400 animate-ping': pipelineStatus.status === 'running' || pipelineStatus.status === 'processing',
            'bg-emerald-400': pipelineStatus.status === 'completed',
            'bg-red-400': pipelineStatus.status === 'failed',
            'bg-gray-500': pipelineStatus.status === 'idle'
          }"
        ></span>
        <span class="text-gray-300 capitalize">Tahap: <strong class="text-purple-300">{{ pipelineStatus.stage }}</strong> ({{ pipelineStatus.status }})</span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Tombol Upload A-Roll -->
        <button 
          @click="triggerUploadARoll" 
          :disabled="isUploading"
          class="bg-gray-800 hover:bg-gray-700 text-purple-400 border border-purple-500/30 px-3.5 py-2 rounded-lg font-medium transition text-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <span v-if="isUploading" class="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
          <span>📁</span> Unggah A-Roll
        </button>

        <!-- Ekspor Timeline XML -->
        <button 
          @click="handleExportXml"
          class="bg-purple-600 border border-purple-400 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg font-bold transition shadow-lg shadow-purple-500/20 text-xs flex items-center gap-2 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          Ekspor XML
        </button>

        <!-- Ekspor Video (Nonaktif/Segera Hadir) -->
        <button 
          disabled 
          title="Segera hadir"
          class="bg-gray-800 text-gray-500 border border-gray-700 px-3.5 py-2 rounded-lg font-medium text-xs flex items-center gap-1.5 cursor-not-allowed opacity-60"
        >
          🎬 Ekspor MP4 (Segera hadir)
        </button>
      </div>
    </header>

    <!-- Error Bar jika pipeline gagal -->
    <div v-if="pipelineStatus.status === 'failed'" class="bg-red-950/80 border-b border-red-800/80 px-6 py-2 text-xs text-red-200 flex items-center justify-between">
      <span><strong>Pipeline Error:</strong> {{ pipelineStatus.error_message || 'Gagal memproses AI B-Roll' }}</span>
      <button @click="triggerUploadARoll" class="underline text-red-100 hover:text-white cursor-pointer">Coba unggah ulang</button>
    </div>

    <!-- ========================================== -->
    <!-- MAIN WORKAREA (Kiri, Tengah, Kanan)        -->
    <!-- ========================================== -->
    <div class="flex-1 flex overflow-hidden">
      
      <!-- KIRI: B-Roll & Pencarian Manual -->
      <aside class="w-[340px] bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <!-- Tabs -->
        <div class="flex border-b border-gray-800 text-xs font-medium">
          <button @click="activeTab = 'broll'" :class="activeTab === 'broll' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400'" class="flex-1 py-3 text-center transition cursor-pointer">B-roll AI & Cari</button>
          <button @click="activeTab = 'media'" :class="activeTab === 'media' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400'" class="flex-1 py-3 text-center transition cursor-pointer">A-Roll Media</button>
        </div>
        
        <!-- Tab B-Roll Manual Search -->
        <div v-if="activeTab === 'broll'" class="flex flex-col flex-1 overflow-hidden">
          <div class="p-4 border-b border-gray-800 flex flex-col gap-2">
            <div class="flex gap-2">
              <input 
                v-model="searchQuery" 
                @keyup.enter="handleSearchBroll" 
                type="text" 
                placeholder="Cari B-Roll (min 2 huruf)..." 
                class="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-purple-500 outline-none" 
              />
              <button 
                @click="handleSearchBroll" 
                :disabled="isSearching"
                class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 cursor-pointer"
              >
                <span v-if="isSearching" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span v-else>Cari</span>
              </button>
            </div>
            
            <div class="flex items-center justify-between text-[11px] text-gray-400">
              <span>Sumber:</span>
              <div class="flex gap-2">
                <label class="cursor-pointer flex items-center gap-1">
                  <input type="radio" v-model="searchSource" value="all" /> Semua
                </label>
                <label class="cursor-pointer flex items-center gap-1">
                  <input type="radio" v-model="searchSource" value="external" /> Eksternal
                </label>
                <label class="cursor-pointer flex items-center gap-1">
                  <input type="radio" v-model="searchSource" value="internal" /> Internal
                </label>
              </div>
            </div>

            <!-- Warnings Search -->
            <div v-if="searchWarnings.length > 0" class="text-[10px] text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-900">
              <p v-for="w in searchWarnings" :key="w">⚠️ {{ w }}</p>
            </div>
          </div>

          <!-- Hasil Pencarian -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            <div v-if="isSearching" class="py-8 text-center text-xs text-gray-400">
              <div class="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Mencari video B-Roll...
            </div>

            <div v-else-if="searchResults.length === 0" class="py-8 text-center text-xs text-gray-500">
              Ketik kata kunci untuk mencari B-roll eksternal (Pexels/Pixabay) atau aset internal.
            </div>

            <div 
              v-for="item in searchResults" 
              :key="item.id" 
              class="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden group hover:border-purple-500/50 transition flex flex-col"
            >
              <div class="relative aspect-video bg-black">
                <img :src="item.thumbnail_url" :alt="item.title" class="w-full h-full object-cover" />
                <span class="absolute top-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold text-purple-300">
                  {{ item.provider || item.source }}
                </span>
                <span v-if="item.duration" class="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] text-white">
                  {{ item.duration }}s
                </span>
              </div>
              <div class="p-2.5 flex items-center justify-between gap-2">
                <p class="text-xs text-white truncate font-medium flex-1">{{ item.title || 'B-Roll Video' }}</p>
                <button 
                  @click="handleAddToTimeline(item)"
                  :disabled="addingClipId === item.id"
                  class="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold px-2.5 py-1 rounded transition shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <span v-if="addingClipId === item.id" class="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span v-else>+ Timeline</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab Media A-Roll -->
        <div v-if="activeTab === 'media'" class="flex-1 overflow-y-auto p-4 space-y-4">
          <div v-if="arollMedia" class="space-y-3">
            <div class="p-3.5 rounded-xl bg-gray-950 border border-gray-800">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-lg">🎬</span>
                <p class="text-xs font-bold text-white truncate flex-1">{{ arollMedia.file_name }}</p>
              </div>
              <p class="text-xs text-purple-300 font-medium">Durasi: {{ arollMedia.duration }} detik</p>
              <p class="text-[11px] text-gray-500 mt-1">Status Sinkronisasi: {{ currentTime.toFixed(1) }}s / {{ arollMedia.duration }}s</p>
            </div>

            <!-- Player Widget Mini A-Roll -->
            <div class="p-3 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
              <h4 class="text-xs font-bold text-gray-300">Pemutar Media A-Roll:</h4>
              
              <div v-if="arollStreamUrl">
                <video 
                  v-if="!isAudioARoll" 
                  ref="arollVideoRef" 
                  :src="arollStreamUrl" 
                  @timeupdate="onARollTimeUpdate"
                  controls 
                  class="w-full rounded-lg bg-black aspect-video"
                ></video>
                <audio 
                  v-else 
                  ref="arollAudioRef" 
                  :src="arollStreamUrl" 
                  @timeupdate="onARollTimeUpdate"
                  controls 
                  class="w-full mt-2"
                ></audio>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-xs text-gray-500">
            Belum ada file A-Roll diunggah. Klik tombol "Unggah A-Roll" di bagian atas untuk memulai.
          </div>
        </div>

      </aside>

      <!-- TENGAH: Canvas Preview -->
      <main class="flex-1 bg-gray-950 flex flex-col items-center justify-center p-6 relative">
        <div class="w-full max-w-3xl flex flex-col">
          <!-- Header Canvas -->
          <div class="flex justify-between items-center text-xs text-gray-400 mb-3 px-1">
            <span>Pratinjau: {{ selectedClip ? (selectedClip.b_roll?.search_query || selectedClip.asset?.title || 'Klip Terpilih') : 'Preview Proyek' }}</span>
            <span class="text-purple-400 font-medium">{{ timeline.length }} Klip di Timeline</span>
          </div>
          
          <!-- Video Player (Preview B-Roll / Klip) -->
          <div class="w-full aspect-video bg-black rounded-xl overflow-hidden border border-gray-800 relative shadow-2xl flex items-center justify-center">
            <video 
              v-if="previewUrl"
              :src="previewUrl"
              controls
              autoplay
              muted
              class="w-full h-full object-contain"
            ></video>
            
            <!-- Fallback A-Roll player jika preview B-roll tidak dipilih tapi A-Roll ada -->
            <video 
              v-else-if="arollStreamUrl && !isAudioARoll"
              :src="arollStreamUrl"
              @timeupdate="onARollTimeUpdate"
              controls
              class="w-full h-full object-contain"
            ></video>

            <div v-else class="text-center p-6">
              <span class="text-4xl block mb-2 opacity-50">🎬</span>
              <p class="text-xs text-gray-500 mb-2">
                {{ arollMedia ? 'File A-Roll siap diputar: ' + arollMedia.file_name : 'Unggah A-Roll atau cari B-roll untuk pratinjau.' }}
              </p>
            </div>
          </div>

          <!-- Quick Info Bar -->
          <div class="flex justify-between items-center mt-3 text-gray-400 text-xs px-2">
            <span>Playhead Posisi: <strong class="text-white">{{ currentTime.toFixed(1) }}s</strong> / {{ maxTimelineDuration.toFixed(1) }}s</span>
            <span v-if="selectedClip" class="text-purple-300 font-medium">
              Klip Terpilih: {{ selectedClip.start_pos }}s - {{ selectedClip.end_pos }}s (Track {{ selectedClip.track_layer }})
            </span>
          </div>
        </div>
      </main>

      <!-- KANAN: Inspector / Properti Klip -->
      <aside class="w-[280px] bg-gray-900 border-l border-gray-800 shrink-0 flex flex-col">
        <div class="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 class="text-white font-bold text-sm">Properti Klip</h3>
          <span v-if="selectedClip" class="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800">
            ID: {{ selectedClip.edl_id }}
          </span>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4 space-y-5">
          <div v-if="selectedClip" class="space-y-4">
            
            <!-- Posisi Klip -->
            <div class="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs space-y-3">
              <h4 class="text-gray-300 font-medium">Pengaturan Posisi</h4>
              
              <div>
                <label class="block text-gray-400 text-[11px] mb-1">Mulai (Detik):</label>
                <input 
                  v-model.number="clipStart" 
                  type="number" 
                  step="0.5" 
                  min="0"
                  class="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-white outline-none focus:border-purple-500 text-xs" 
                />
              </div>

              <div>
                <label class="block text-gray-400 text-[11px] mb-1">Selesai (Detik):</label>
                <input 
                  v-model.number="clipEnd" 
                  type="number" 
                  step="0.5" 
                  min="0.1"
                  class="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-white outline-none focus:border-purple-500 text-xs" 
                />
              </div>

              <button 
                @click="handlePatchClip" 
                :disabled="isPatchingClip"
                class="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-1.5 rounded transition text-xs flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <span v-if="isPatchingClip" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Simpan Perubahan Posisi</span>
              </button>
            </div>

            <!-- Regenerasi B-Roll -->
            <div class="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs space-y-3">
              <h4 class="text-purple-300 font-medium">✨ Regenerasi B-Roll AI</h4>
              <p class="text-[11px] text-gray-400">Ganti klip ini dengan hasil pencarian alternatif AI atau gunakan kata kunci khusus:</p>
              
              <input 
                v-model="regenKeyword" 
                type="text" 
                placeholder="Kata kunci alternatif (opsional)..." 
                class="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-white outline-none focus:border-purple-500 text-xs" 
              />

              <button 
                @click="handleRegenerateClip" 
                :disabled="isRegenerating"
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 rounded transition text-xs flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <span v-if="isRegenerating" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Regenerasi Klip</span>
              </button>
            </div>

            <!-- Hapus Klip -->
            <div class="pt-2">
              <button 
                @click="handleDeleteClip(selectedClip.edl_id)" 
                class="w-full bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 py-1.5 rounded text-xs transition font-medium cursor-pointer"
              >
                Hapus Klip dari Timeline
              </button>
            </div>

          </div>

          <div v-else class="text-center py-10 text-xs text-gray-500">
            Klik salah satu klip di trek timeline di bawah untuk mengubah posisi, meregenerasi B-roll, atau menghapusnya.
          </div>
        </div>
      </aside>
    </div>

    <!-- ========================================== -->
    <!-- TIMELINE EDITOR                            -->
    <!-- ========================================== -->
    <div class="h-[280px] bg-gray-900 border-t border-gray-800 flex flex-col shrink-0">
      
      <!-- Toolbar Timeline -->
      <div class="h-10 border-b border-gray-800 flex items-center justify-between px-4 text-gray-400 text-xs">
        <div class="flex items-center gap-4">
          <span class="text-purple-400 font-bold flex items-center gap-1">
            <span>✨</span> Timeline EDL
          </span>
          <div class="w-px h-4 bg-gray-700"></div>
          <button @click="loadTimeline" class="hover:text-white transition flex items-center gap-1 cursor-pointer">
            <span>🔄 Segarkan</span>
          </button>
        </div>
        <div class="text-[11px] text-gray-500">
          Durasi Skala: {{ maxTimelineDuration.toFixed(0) }} detik
        </div>
      </div>

      <!-- Area Tracks -->
      <div class="flex-1 flex overflow-hidden relative">
        <!-- Headers Track (Kiri) -->
        <div class="w-[140px] bg-gray-900 border-r border-gray-800 shrink-0 flex flex-col text-[11px] font-medium text-gray-400 py-6">
          <div class="h-10 flex items-center px-3 text-purple-300 bg-purple-900/10 border-b border-gray-800/50">
            <span>V2</span> <span class="ml-2">✨ B-Roll AI</span>
          </div>
          <div class="h-10 flex items-center px-3 border-b border-gray-800/50">
            <span>V1</span> <span class="ml-2">🎬 A-Roll Utama</span>
          </div>
        </div>

        <!-- Canvas Tracks (Kanan) -->
        <div class="flex-1 bg-gray-950 overflow-x-auto relative p-4">
          
          <!-- Playhead Garis Waktu -->
          <div 
            class="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none transition-all duration-100"
            :style="{ left: `calc(16px + (100% - 32px) * ${playheadPercent / 100})` }"
          >
            <div class="w-2.5 h-2.5 bg-red-500 -ml-1 rounded-full shadow-md shadow-red-500/50"></div>
          </div>

          <div class="relative w-full h-full space-y-4 min-w-[600px]">
            <!-- V2 Track (B-Roll Klip) -->
            <div class="h-10 bg-gray-900/60 rounded-lg relative border border-gray-800">
              <div 
                v-for="clip in timeline" 
                :key="clip.edl_id" 
                :style="getClipStyle(clip)"
                @click="selectClip(clip)"
                class="absolute top-1 bottom-1 rounded px-2 flex items-center text-[10px] text-white cursor-pointer transition select-none truncate"
                :class="selectedClip?.edl_id === clip.edl_id ? 'bg-purple-600 ring-2 ring-white z-20' : 'bg-purple-700/80 hover:bg-purple-600/90 z-10'"
                :title="`${clip.b_roll?.search_query || clip.asset?.title || 'Klip'} (${clip.start_pos}s - ${clip.end_pos}s)`"
              >
                <span class="truncate font-medium">{{ clip.b_roll?.search_query || clip.asset?.title || 'Klip B-Roll' }}</span>
              </div>
              <span v-if="timeline.length === 0" class="absolute inset-0 flex items-center justify-center text-[11px] text-gray-600">
                Belum ada klip B-Roll pada timeline V2
              </span>
            </div>

            <!-- V1 Track (A-Roll) -->
            <div class="h-10 bg-gray-900/60 rounded-lg relative border border-gray-800 flex items-center px-3">
              <div 
                v-if="project?.media_aroll?.[0]" 
                class="w-full h-8 bg-blue-600/60 border border-blue-500 rounded flex items-center px-3 text-[10px] text-white truncate"
              >
                <span>🎬 {{ project.media_aroll[0].file_name }} ({{ project.media_aroll[0].duration }}s)</span>
              </div>
              <span v-else class="text-[11px] text-gray-600">
                Unggah A-Roll untuk mengisi track utama V1
              </span>
            </div>
          </div>

        </div>
      </div>

      <!-- Footer Timeline -->
      <div class="h-8 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-4 text-[11px] text-gray-500 shrink-0">
        <div class="flex items-center gap-2">
          <span>{{ timeline.length }} klip terdaftar</span>
          <span class="text-gray-700">|</span>
          <span class="text-gray-400">Pilih klip untuk melihat pengaturan di inspector kanan</span>
        </div>
        <div class="flex items-center gap-1.5 text-emerald-400 font-medium">
          <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
          Backend API Terhubung
        </div>
      </div>
    </div>
  </div>
</template>