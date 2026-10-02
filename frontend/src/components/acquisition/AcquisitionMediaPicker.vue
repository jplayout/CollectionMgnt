<template>
    <section class="media-picker" aria-label="Choix de l’image">
        <img v-if="previewUrl" class="selected-preview" :src="previewUrl" alt="Image sélectionnée" />
        <p v-if="modelValue?.mode === 'remote'">Image présélectionnée · {{ modelValue.candidate.provider || 'Source non renseignée' }}</p>
        <p v-else-if="modelValue?.mode === 'local'">Fichier sélectionné : {{ modelValue.file.name }}</p>
        <p v-else>Aucune image</p>
        <button type="button" :aria-expanded="expanded" :disabled="disabled" @click="expanded = !expanded">Changer l’image</button>
        <div v-if="expanded" class="picker-options">
            <fieldset :disabled="disabled">
                <legend>Images proposées</legend>
                <p v-if="!candidates.length">Aucune image proposée.</p>
                <label v-for="(candidate, index) in displayedCandidates" :key="`${candidate.provider}:${candidate.url}:${index}`" class="candidate">
                    <input type="radio" :name="inputName" :checked="isSelected(candidate)" @change="select({ mode: 'remote', candidate })" />
                    <img :src="candidate.thumbnailUrl || candidate.url" alt="" />
                    <span class="candidate-origin">{{ candidates.some(initial => initial.url === candidate.url) ? 'Image proposée' : 'Résultat de recherche' }}</span>
                    <span>{{ candidate.provider || 'Source non renseignée' }} · {{ candidate.kind || 'image' }} · {{ index + 1 }}</span>
                    <small v-if="candidate.sourceUrl">Source : {{ candidate.sourceUrl }}</small>
                    <span v-if="candidate.attribution">{{ candidate.attribution }}</span>
                    <span v-if="candidate.license">{{ candidate.license }}</span>
                </label>
                <button v-if="searchQuery" type="button" :disabled="disabled || searchLoading" @click="searchMedia">
                    {{ searchLoading ? 'Recherche d’images...' : 'Rechercher d’autres images' }}
                </button>
                <p v-if="searchMessage" role="status">{{ searchMessage }}</p>
                <p v-if="searchWarnings.length" role="status">Recherche incomplète : {{ searchWarnings.map(warning => warning.provider).join(', ') }}. Les images disponibles restent sélectionnables.</p>
                <label>
                    Importer un fichier
                    <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" @change="selectFile" />
                </label>
                <label>
                    <input type="radio" :name="inputName" :checked="modelValue?.mode === 'none'" @change="select({ mode: 'none' })" />
                    Aucune image
                </label>
                <p v-if="fileError" role="alert">{{ fileError }}</p>
            </fieldset>
        </div>
    </section>
</template>

<script setup>
import { searchAcquisitionMedia } from '../../services/acquisition-api.js';
import { normalizeAcquisitionMediaCandidates } from '../../services/acquisition-media.js';
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';

const props = defineProps({
    candidates: { type: Array, default: () => [] },
    modelValue: { type: Object, default: undefined },
    disabled: { type: Boolean, default: false },
    searchQuery: { type: Object, default: null }
});
const emit = defineEmits(['update:modelValue']);
const inputName = useId();
const expanded = ref(false);
const fileInput = ref(null);
const fileError = ref('');
const localPreviewUrl = ref('');
const searchResults = ref([]);
const searchLoading = ref(false);
const searchMessage = ref('');
const searchWarnings = ref([]);
let searchGeneration = 0;
const displayedCandidates = computed(() => {
    const seen = new Set();
    const result = [];
    const selected = props.modelValue?.mode === 'remote' ? props.modelValue.candidate : null;
    for (const candidate of [...props.candidates, ...searchResults.value, ...(selected ? [selected] : [])]) {
        if (!seen.has(candidate.url)) { seen.add(candidate.url); result.push(candidate); }
    }
    return result;
});
watch(() => JSON.stringify(props.searchQuery), () => {
    searchGeneration += 1;
    searchResults.value = [];
    searchLoading.value = false;
    searchMessage.value = '';
    searchWarnings.value = [];
});
async function searchMedia() {
    if (props.disabled || searchLoading.value || !props.searchQuery) return;
    const generation = ++searchGeneration;
    searchLoading.value = true;
    searchMessage.value = '';
    searchWarnings.value = [];
    try {
        const response = await searchAcquisitionMedia(props.searchQuery);
        if (generation !== searchGeneration) return;
        searchResults.value = normalizeAcquisitionMediaCandidates({ images: response.results }).slice(0, 20);
        searchWarnings.value = response.warnings ?? [];
        searchMessage.value = searchResults.value.length ? 'Images trouvées.' : response.incomplete
            ? 'La recherche est incomplète. Vous pouvez réessayer ou conserver votre choix.'
            : 'Aucune autre image trouvée.';
    } catch (error) {
        if (generation !== searchGeneration) return;
        searchMessage.value = error?.payload?.code === 'provider_timeout'
            ? 'La recherche d’images a expiré. Vous pouvez réessayer ou conserver votre choix.'
            : 'La recherche d’images est indisponible. Vous pouvez réessayer ou conserver votre choix.';
    } finally {
        if (generation === searchGeneration) searchLoading.value = false;
    }
}
onBeforeUnmount(() => { searchGeneration += 1; });
const previewUrl = computed(() => props.modelValue?.mode === 'local'
    ? localPreviewUrl.value
    : props.modelValue?.mode === 'remote' ? props.modelValue.candidate.thumbnailUrl || props.modelValue.candidate.url : '');

watch(() => props.candidates, candidates => {
    if (props.modelValue === undefined || (props.modelValue?.mode === 'remote' &&
        !candidates.some(candidate => candidate.url === props.modelValue.candidate.url && candidate.provider === props.modelValue.candidate.provider))) {
        emit('update:modelValue', candidates.length ? { mode: 'remote', candidate: candidates[0] } : { mode: 'none' });
    }
}, { immediate: true });

function releasePreview() {
    if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value);
    localPreviewUrl.value = '';
}
watch(() => props.modelValue, selection => {
    releasePreview();
    if (selection?.mode === 'local') localPreviewUrl.value = URL.createObjectURL(selection.file);
    else if (fileInput.value) fileInput.value.value = '';
}, { immediate: true });
onBeforeUnmount(releasePreview);

function isSelected(candidate) {
    return props.modelValue?.mode === 'remote' && props.modelValue.candidate.url === candidate.url && props.modelValue.candidate.provider === candidate.provider;
}
function select(selection) {
    fileError.value = '';
    if (selection.mode !== 'local' && fileInput.value) fileInput.value.value = '';
    emit('update:modelValue', selection);
}
function selectFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
        fileError.value = 'Choisissez une image JPEG, PNG ou WebP de 10 Mo maximum.';
        event.target.value = '';
        return;
    }
    select({ mode: 'local', file });
}
</script>

<style scoped>
.media-picker, .picker-options, fieldset { display: grid; gap: 10px; min-width: 0; }
.media-picker { grid-column: 1 / -1; }
.media-picker p { margin: 0; color: #5f6f89; }
.selected-preview, .candidate img { width: 64px; height: 88px; object-fit: contain; }
.candidate { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; overflow-wrap: anywhere; }
fieldset { border: 1px solid #d8dee8; border-radius: 6px; }
button { justify-self: start; min-height: 44px; padding: 8px 14px; border: 1px solid #2357a4; border-radius: 6px; background: white; color: #2357a4; font: inherit; cursor: pointer; }
input[type=file] { max-width: 100%; }
</style>
