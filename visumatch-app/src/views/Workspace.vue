<script setup>
import { ref } from 'vue'

const activeTab = ref('media') // Tab: media, ai, cari
const isPlaying = ref(false)

const mediaItems = ref([
  { id: 1, name: 'A-Roll_Interview.mp4' },
  { id: 2, name: 'Voiceover_Audio.mp3' }
])

const bRollClips = ref([
  { id: 1, name: 'City Timelapse', start: 10, width: 20 },
  { id: 2, name: 'Coding Hacker', start: 45, width: 15 }
])

// Fitur Pencarian B-Roll Manual (Workspace)
const manualQuery = ref('')
const searchResults = ref([])
const executeManualSearch = () => {
  if (manualQuery.value) {
    // Simulasi hasil kembalian dari Stock Video API
    searchResults.value = [
      { id: 101, name: `${manualQuery.value} - Klip 1.mp4`, type: 'b-roll' },
      { id: 102, name: `${manualQuery.value} - Klip 2.mp4`, type: 'b-roll' }
    ]
  }
}

const handleExport = () => alert('Memulai proses render video ke .MP4...')
</script>

<template>
  <div class="flex flex-col bg-gray-950 h-[calc(100vh-76px)] text-gray-300 text-sm overflow-hidden font-sans">
    
    <div class="flex flex-1 overflow-hidden">
      <!-- Panel Kiri: Media & Search -->
      <div class="w-1/4 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div class="flex border-b border-gray-800 text-xs">
          <button @click="activeTab = 'media'" :class="{'bg-gray-800 text-white': activeTab === 'media'}" class="flex-1 py-3 font-bold transition">Lokal</button>
          <button @click="activeTab = 'ai'" :class="{'bg-gray-800 text-white': activeTab === 'ai'}" class="flex-1 py-3 font-bold transition">Hasil AI</button>
          <!-- Tab Baru: Cari Manual -->
          <button @click="activeTab = 'cari'" :class="{'bg-gray-800 text-white': activeTab === 'cari'}" class="flex-1 py-3 font-bold transition text-purple-400">Cari B-Roll</button>
        </div>
        
        <div class="p-4 flex-1 overflow-y-auto">
          <!-- Tab 1: Lokal -->
          <div v-if="activeTab === 'media'" class="space-y-3">
            <button class="w-full py-3 border border-dashed border-gray-600 rounded-lg hover:border-purple-500 hover:text-purple-400 transition font-medium text-xs">+ Import File Lokal</button>
            <div v-for="item in mediaItems" :key="item.id" class="bg-gray-800 p-2.5 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-gray-700 border border-gray-700">
              <div class="w-8 h-8 bg-gray-900 rounded flex items-center justify-center text-xs">🎬</div>
              <span class="truncate text-xs text-white">{{ item.name }}</span>
            </div>
          </div>
          
          <!-- Tab 2: Hasil AI -->
          <div v-else-if="activeTab === 'ai'" class="text-center text-gray-500 mt-10">
            <p class="text-xs">Klik "Auto-Generate" untuk mencari klip AI.</p>
          </div>
          
          <!-- Tab 3: Cari Manual -->
          <div v-else class="space-y-4">
            <div class="flex gap-2">
              <input v-model="manualQuery" @keyup.enter="executeManualSearch" type="text" placeholder="Ketik kata kunci (Misal: Hujan)" class="w-full px-3 py-2 rounded bg-gray-950 border border-gray-700 text-white focus:border-purple-500 text-xs" />
              <button @click="executeManualSearch" class="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded transition text-xs font-bold">Cari</button>
            </div>
            
            <div v-if="searchResults.length > 0" class="space-y-2 mt-4">
              <p class="text-xs text-gray-400 mb-2">Hasil dari Pexels/Storyblocks API:</p>
              <div v-for="res in searchResults" :key="res.id" class="bg-gray-800 p-2 rounded-lg flex flex-col gap-2 cursor-pointer hover:border-purple-500 border border-gray-700 transition group">
                <div class="h-20 bg-gray-900 rounded flex items-center justify-center text-gray-600 text-xs group-hover:bg-black">Preview B-Roll</div>
                <span class="truncate text-[11px] text-white px-1">{{ res.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel Tengah: Video Canvas -->
      <div class="flex-1 bg-black flex flex-col relative border-r border-gray-800">
        <div class="absolute top-4 left-4 bg-gray-900/80 px-2 py-1 rounded text-xs text-gray-400 z-10">1920x1080 • 60fps</div>
        <div class="flex-1 flex items-center justify-center overflow-hidden p-8">
          <div class="aspect-video w-full max-w-2xl bg-gray-900 border border-gray-700 rounded flex items-center justify-center shadow-2xl shadow-black">
            <span class="text-gray-600 font-bold text-xl tracking-widest">VIDEO PREVIEW</span>
          </div>
        </div>
        <div class="h-14 bg-gray-900 flex items-center justify-center gap-6 border-t border-gray-800">
          <button class="text-xl hover:text-white transition">⏪</button>
          <button @click="isPlaying = !isPlaying" class="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 shadow-lg shadow-purple-500/40 transition">
            {{ isPlaying ? '⏸' : '▶' }}
          </button>
          <button class="text-xl hover:text-white transition">⏩</button>
        </div>
      </div>

      <!-- Panel Kanan: AI Controls -->
      <div class="w-1/5 bg-gray-900 flex flex-col p-5">
        <h3 class="font-bold text-white mb-4 border-b border-gray-800 pb-2">AI Context Matcher</h3>
        <button class="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg mb-6 shadow-lg shadow-purple-500/30 transition text-sm">
          ✨ Auto-Generate B-Roll
        </button>
        <div class="space-y-5">
          <div>
            <label class="text-xs text-gray-400 mb-1.5 block">Bahasa Deteksi Teks</label>
            <select class="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white focus:outline-none focus:border-purple-500">
              <option>Bahasa Indonesia</option>
              <option>English</option>
            </select>
          </div>
        </div>
        <div class="mt-auto pt-4 border-t border-gray-800">
          <button @click="handleExport" class="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-green-500/20 transition text-sm">
            Export Video (MP4)
          </button>
        </div>
      </div>
    </div>

    <!-- Timeline (Disederhanakan untuk ruang kode) -->
    <div class="h-72 bg-gray-900 border-t border-gray-700 flex flex-col">
      <div class="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-6">
        <div class="flex gap-3 text-lg"><button>👆</button><button>✂️</button></div>
        <div class="w-px h-5 bg-gray-600"></div><span class="text-sm font-mono text-purple-400">00:01:24:15</span><div class="w-px h-5 bg-gray-600"></div>
      </div>
      <div class="flex-1 overflow-auto p-2 relative bg-gray-950">
        <div class="absolute left-1/4 top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none"><div class="w-3 h-3 bg-red-500 -ml-1 rounded-sm"></div></div>
        
        <div class="flex mb-1.5 items-center">
          <div class="w-16 flex-shrink-0 text-xs text-gray-500 font-bold px-2">V2</div>
          <div class="flex-1 bg-gray-900 h-12 rounded relative border border-gray-800">
            <div v-for="clip in bRollClips" :key="clip.id" :style="{ left: clip.start + '%', width: clip.width + '%' }" class="absolute top-0 bottom-0 bg-purple-600 border border-purple-400 rounded-md p-1.5 text-xs text-white truncate cursor-pointer hover:bg-purple-500 transition opacity-90">{{ clip.name }}</div>
          </div>
        </div>

        <div class="flex mb-1.5 items-center">
          <div class="w-16 flex-shrink-0 text-xs text-gray-500 font-bold px-2">V1</div>
          <div class="flex-1 bg-gray-900 h-12 rounded relative border border-gray-800">
             <div class="absolute left-0 w-4/5 top-0 bottom-0 bg-blue-600 border border-blue-400 rounded-md p-1.5 text-xs text-white truncate cursor-pointer hover:bg-blue-500 transition opacity-90">A-Roll_Interview.mp4</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>