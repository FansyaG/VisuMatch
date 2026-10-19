<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'
import { showToast } from '../toast'

// State Navigasi Tab
const activeTab = ref('assets') // 'assets' atau 'api'

// ==========================================
// ASET INTERNAL (UC-15, UC-16, UC-17)
// ==========================================
const internalAssets = ref([])
const isLoadingAssets = ref(true)

// Upload Modal & State
const showUploadModal = ref(false)
const uploadFile = ref(null)
const uploadTitle = ref('')
const uploadDescription = ref('')
const uploadTags = ref('')
const isUploading = ref(false)

// Edit Tag Modal & State
const showEditModal = ref(false)
const editingAsset = ref(null)
const editTags = ref('')
const isUpdatingTag = ref(false)

const loadAssets = async () => {
  isLoadingAssets.value = true
  try {
    const res = await api.getAdminAssets()
    internalAssets.value = res.assets || []
  } catch (err) {
    // Handled in apiRequest
  } finally {
    isLoadingAssets.value = false
  }
}

const handleFileSelect = (e) => {
  uploadFile.value = e.target.files?.[0] || null
}

const handleUploadAsset = async () => {
  if (!uploadFile.value) {
    showToast('Pilih file video/audio terlebih dahulu', 'info')
    return
  }
  if (!uploadTitle.value.trim()) {
    showToast('Judul aset wajib diisi', 'info')
    return
  }

  isUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', uploadFile.value)
    formData.append('title', uploadTitle.value.trim())
    formData.append('description', uploadDescription.value.trim())
    formData.append('tags', uploadTags.value.trim())

    await api.createAdminAsset(formData)
    showToast('Aset internal berhasil diunggah', 'success')
    showUploadModal.value = false
    uploadFile.value = null
    uploadTitle.value = ''
    uploadDescription.value = ''
    uploadTags.value = ''
    await loadAssets()
  } catch (err) {
    // Handled
  } finally {
    isUploading.value = false
  }
}

const openEditModal = (asset) => {
  editingAsset.value = asset
  editTags.value = asset.tags || ''
  showEditModal.value = true
}

const handleUpdateTags = async () => {
  if (!editingAsset.value) return
  isUpdatingTag.value = true
  try {
    await api.updateAdminAsset(editingAsset.value.asset_id, {
      tags: editTags.value.trim(),
    })
    showToast('Tags aset berhasil diperbarui', 'success')
    showEditModal.value = false
    editingAsset.value = null
    await loadAssets()
  } catch (err) {
    // Handled
  } finally {
    isUpdatingTag.value = false
  }
}

const handleDeleteAsset = async (id) => {
  if (!confirm('Hapus aset ini dari database secara permanen?')) return
  try {
    await api.deleteAdminAsset(id)
    showToast('Aset berhasil dihapus', 'success')
    await loadAssets()
  } catch (err) {
    // 409 conflict handled with message in apiRequest
  }
}

// ==========================================
// KONFIGURASI API (UC-18)
// ==========================================
const apiKeysList = ref([])
const isLoadingApiKeys = ref(true)

const newProvider = ref('pexels') // 'pexels' | 'pixabay'
const newApiKey = ref('')
const isSavingKey = ref(false)

const loadApiKeys = async () => {
  isLoadingApiKeys.value = true
  try {
    const res = await api.getAdminApiKeys()
    apiKeysList.value = res.api_keys || []
  } catch (err) {
    // Handled
  } finally {
    isLoadingApiKeys.value = false
  }
}

const handleSaveAPI = async (provider) => {
  const keyToSave = newApiKey.value.trim()
  if (!keyToSave) {
    showToast(`Masukkan API key ${provider} terlebih dahulu`, 'info')
    return
  }

  isSavingKey.value = true
  try {
    await api.createAdminApiKey({
      provider_name: provider.toLowerCase(),
      api_key: keyToSave,
      is_active: true,
    })
    showToast(`Kunci API ${provider.toUpperCase()} berhasil divalidasi dan disimpan!`, 'success')
    newApiKey.value = ''
    await loadApiKeys()
  } catch (err) {
    // Handled
  } finally {
    isSavingKey.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

onMounted(() => {
  loadAssets()
  loadApiKeys()
})
</script>

<template>
  <div class="w-full px-6 py-8 min-h-[80vh] flex flex-col font-sans">
    
    <!-- Header Admin -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white flex items-center gap-3">
        <span>⚙️</span> Panel Administrator
      </h1>
      <p class="text-gray-400 mt-2">Kelola basis data aset internal dan konfigurasi integrasi pihak ketiga.</p>
    </div>

    <!-- Navigasi Tab -->
    <div class="flex border-b border-gray-800 mb-8">
      <button 
        @click="activeTab = 'assets'" 
        :class="activeTab === 'assets' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'"
        class="pb-4 px-6 border-b-2 font-bold transition text-sm sm:text-base cursor-pointer"
      >
        Manajemen Aset Internal
      </button>
      <button 
        @click="activeTab = 'api'" 
        :class="activeTab === 'api' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'"
        class="pb-4 px-6 border-b-2 font-bold transition text-sm sm:text-base cursor-pointer"
      >
        Konfigurasi API
      </button>
    </div>

    <!-- ========================================== -->
    <!-- TAB 1: TABEL ASET INTERNAL                 -->
    <!-- ========================================== -->
    <div v-if="activeTab === 'assets'" class="flex-grow animate-fade-in">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-white">Database Video Stok Lokal</h2>
        <button 
          @click="showUploadModal = true"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg shadow-purple-500/30 flex items-center gap-2 cursor-pointer"
        >
          <span>+</span> Unggah Aset
        </button>
      </div>

      <!-- State Loading Assets -->
      <div v-if="isLoadingAssets" class="py-16 text-center text-gray-400">
        <div class="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Memuat daftar aset...
      </div>

      <!-- Tabel Data -->
      <div v-else class="overflow-x-auto bg-gray-900 border border-gray-800 rounded-xl">
        <table class="w-full text-left text-sm text-gray-400">
          <thead class="bg-gray-800/50 text-xs uppercase text-gray-300 border-b border-gray-800">
            <tr>
              <th scope="col" class="px-6 py-4 font-bold">Judul Video</th>
              <th scope="col" class="px-6 py-4 font-bold">Metadata / Tag</th>
              <th scope="col" class="px-6 py-4 font-bold">File Path</th>
              <th scope="col" class="px-6 py-4 font-bold">Tanggal Upload</th>
              <th scope="col" class="px-6 py-4 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asset in internalAssets" :key="asset.asset_id" class="border-b border-gray-800 hover:bg-gray-800/30 transition">
              <td class="px-6 py-4 font-medium text-white flex items-center gap-3">
                <div class="w-10 h-10 bg-gray-800 rounded flex items-center justify-center text-lg">🎬</div>
                <div>
                  <p class="font-bold">{{ asset.title }}</p>
                  <p class="text-xs text-gray-400">{{ asset.description || 'Tidak ada deskripsi' }}</p>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1.5" v-if="asset.tags">
                  <span v-for="tag in asset.tags.split(',')" :key="tag" class="bg-gray-800 border border-gray-700 px-2 py-0.5 rounded text-xs text-purple-300">
                    {{ tag.trim() }}
                  </span>
                </div>
                <span v-else class="text-xs text-gray-600">-</span>
              </td>
              <td class="px-6 py-4 text-xs font-mono text-gray-400 truncate max-w-[150px]">{{ asset.file_path }}</td>
              <td class="px-6 py-4">{{ formatDate(asset.created_at) }}</td>
              <td class="px-6 py-4 text-right space-x-3">
                <button @click="openEditModal(asset)" class="text-blue-400 hover:text-blue-300 font-medium transition cursor-pointer">Edit Tag</button>
                <button @click="handleDeleteAsset(asset.asset_id)" class="text-red-400 hover:text-red-300 font-medium transition cursor-pointer">Hapus</button>
              </td>
            </tr>
            <tr v-if="internalAssets.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-gray-500">
                Database kosong. Belum ada aset yang diunggah.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- TAB 2: FORM KONFIGURASI API                -->
    <!-- ========================================== -->
    <div v-if="activeTab === 'api'" class="flex-grow animate-fade-in">
      <div class="mb-6">
        <h2 class="text-xl font-bold text-white">Integrasi Pihak Ketiga</h2>
        <p class="text-sm text-gray-400 mt-1">Masukkan API Key agar mesin AI dapat mencari dan menganalisis aset secara otomatis.</p>
      </div>

      <!-- Daftar API Keys Tersimpan -->
      <div class="mb-8">
        <h3 class="text-sm uppercase tracking-wider text-gray-400 font-bold mb-3">API Key Aktif dalam Database</h3>
        
        <div v-if="isLoadingApiKeys" class="py-4 text-xs text-gray-500">Memuat konfigurasi...</div>
        <div v-else-if="apiKeysList.length === 0" class="text-xs text-amber-400 bg-amber-950/30 p-3 rounded-lg border border-amber-900/50">
          Belum ada API key tersimpan. Silakan simpan key di bawah.
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div 
            v-for="k in apiKeysList" 
            :key="k.config_id" 
            class="p-3 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-between"
          >
            <div>
              <p class="text-xs font-bold uppercase text-white">{{ k.provider_name }}</p>
              <p class="text-[11px] font-mono text-gray-400">{{ k.api_key }}</p>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded font-bold" :class="k.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-gray-800 text-gray-500'">
              {{ k.is_active ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Form Pexels API -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-white text-lg">Pexels Video API</h3>
            <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2 py-1 rounded font-medium">Provider Utama</span>
          </div>
          <p class="text-xs text-gray-400 mb-4">Penyedia utama untuk pencarian video stok B-Roll gratis beresolusi tinggi.</p>
          <div class="space-y-3">
            <input 
              v-model="newApiKey" 
              type="password" 
              placeholder="Masukkan API Key Pexels..." 
              class="w-full px-4 py-2.5 rounded-lg bg-gray-950 border border-gray-700 text-white focus:border-purple-500 text-sm font-mono outline-none"
            />
            <button 
              @click="handleSaveAPI('pexels')" 
              :disabled="isSavingKey"
              class="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg border border-purple-500/30 transition font-medium text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span v-if="isSavingKey" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Uji Koneksi & Simpan Pexels</span>
            </button>
          </div>
        </div>

        <!-- Form Pixabay API -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-white text-lg">Pixabay Video API</h3>
            <span class="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs px-2 py-1 rounded font-medium">Fallback Provider</span>
          </div>
          <p class="text-xs text-gray-400 mb-4">Penyedia video stok gratis alternatif/fallback.</p>
          <div class="space-y-3">
            <input 
              v-model="newApiKey" 
              type="password" 
              placeholder="Masukkan API Key Pixabay..." 
              class="w-full px-4 py-2.5 rounded-lg bg-gray-950 border border-gray-700 text-white focus:border-purple-500 text-sm font-mono outline-none"
            />
            <button 
              @click="handleSaveAPI('pixabay')" 
              :disabled="isSavingKey"
              class="w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-lg border border-gray-700 transition font-medium text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span v-if="isSavingKey" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Uji Koneksi & Simpan Pixabay</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL UNGGAH ASET INTERNAL                 -->
    <!-- ========================================== -->
    <div v-if="showUploadModal" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div class="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-white mb-4">Unggah Aset Stok Internal</h3>
        
        <form @submit.prevent="handleUploadAsset" class="space-y-4 text-xs">
          <div>
            <label class="block text-gray-300 mb-1">File Video/Audio *</label>
            <input 
              type="file" 
              @change="handleFileSelect" 
              accept="video/*,audio/*"
              required 
              class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-gray-300" 
            />
          </div>

          <div>
            <label class="block text-gray-300 mb-1">Judul Aset *</label>
            <input 
              v-model="uploadTitle" 
              type="text" 
              required 
              placeholder="Contoh: Pemandangan Danau Toba"
              class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-purple-500" 
            />
          </div>

          <div>
            <label class="block text-gray-300 mb-1">Deskripsi</label>
            <textarea 
              v-model="uploadDescription" 
              placeholder="Deskripsi singkat konten video..."
              class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-purple-500 h-16" 
            ></textarea>
          </div>

          <div>
            <label class="block text-gray-300 mb-1">Tags (pisahkan dengan koma)</label>
            <input 
              v-model="uploadTags" 
              type="text" 
              placeholder="alam, danau, tenang, udara"
              class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-purple-500" 
            />
          </div>

          <div class="flex gap-3 pt-3">
            <button 
              type="button" 
              @click="showUploadModal = false"
              class="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg transition font-medium"
            >
              Batal
            </button>
            <button 
              type="submit" 
              :disabled="isUploading"
              class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg transition font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span v-if="isUploading" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Unggah Sekarang</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- MODAL EDIT TAG ASET                        -->
    <!-- ========================================== -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div class="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
        <h3 class="text-base font-bold text-white mb-2">Edit Tag Aset</h3>
        <p class="text-xs text-gray-400 mb-4">{{ editingAsset?.title }}</p>
        
        <form @submit.prevent="handleUpdateTags" class="space-y-4 text-xs">
          <div>
            <label class="block text-gray-300 mb-1">Tags (pisahkan koma):</label>
            <input 
              v-model="editTags" 
              type="text" 
              class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-purple-500" 
            />
          </div>

          <div class="flex gap-3 pt-2">
            <button 
              type="button" 
              @click="showEditModal = false"
              class="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg transition"
            >
              Batal
            </button>
            <button 
              type="submit" 
              :disabled="isUpdatingTag"
              class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span v-if="isUpdatingTag" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Sedikit pemanis transisi tab */
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>