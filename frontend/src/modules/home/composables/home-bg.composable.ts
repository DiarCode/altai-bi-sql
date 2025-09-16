import { defineStore } from 'pinia'
import { computed, onMounted, ref } from 'vue'

import BG_AURORA from '@/core/assets/home/aurora.jpg'
import BG_CITY from '@/core/assets/home/city-blue.jpg'
import BG_DESERT from '@/core/assets/home/desert-dusk.jpg'
import BG_SPACE from '@/core/assets/home/earth-space.jpg'
import BG_FOREST from '@/core/assets/home/forest-fog.avif'
import BG_MOUNTAIN from '@/core/assets/home/mountain-lake.jpg'
import BG_OCEAN from '@/core/assets/home/ocean-waves.jpg'

export type WorkspaceBackground = {
	id: string
	title: string
	src: string
	tone: 'cool' | 'warm' | 'neutral'
}

export const BACKGROUND_IMAGES: WorkspaceBackground[] = [
	{ id: 'aurora', title: 'Arctic Aurora', src: BG_AURORA, tone: 'cool' },
	{ id: 'ocean', title: 'Ocean Waves', src: BG_OCEAN, tone: 'cool' },
	{ id: 'desert', title: 'Desert Sunset', src: BG_DESERT, tone: 'warm' },
	{ id: 'forest', title: 'Forest Fog', src: BG_FOREST, tone: 'neutral' },
	{ id: 'city', title: 'City Blue Hour', src: BG_CITY, tone: 'cool' },
	{ id: 'mountain', title: 'Mountain Lake Calm', src: BG_MOUNTAIN, tone: 'neutral' },
	{ id: 'space', title: 'Earth from Space', src: BG_SPACE, tone: 'neutral' },
]

export const DEFAULT_BG_ID = 'aurora'
const STORAGE_KEY = 'BI_IMAGE'

export const useBackgroundImage = defineStore(
	'backgroundImage',
	() => {
		const selectedId = ref<string>(DEFAULT_BG_ID)

		const selected = computed(
			() => BACKGROUND_IMAGES.find(b => b.id === selectedId.value) || BACKGROUND_IMAGES[0],
		)
		const url = computed(() => selected.value.src)
		const tone = computed(() => selected.value.tone)

		function setBackground(id: string) {
			selectedId.value = BACKGROUND_IMAGES.some(b => b.id === id) ? id : DEFAULT_BG_ID
		}

		// Optional: image preloading (no persistence needed)
		function preloadAll() {
			if (typeof window === 'undefined') return
			const ordered = [
				...BACKGROUND_IMAGES.filter(a => a.id === selectedId.value),
				...BACKGROUND_IMAGES.filter(a => a.id !== selectedId.value),
			]
			ordered.forEach(bg => {
				const img = new Image()
				img.decoding = 'async'
				img.loading = 'eager'
				img.src = bg.src
			})
		}

		onMounted(() => {
			if ('requestIdleCallback' in window) {
				window.requestIdleCallback(preloadAll)
			} else {
				setTimeout(preloadAll, 0)
			}
		})

		return { selectedId, selected, url, tone, setBackground }
	},
	{
		persist: {
			key: STORAGE_KEY, // custom key in storage
		},
	},
)
