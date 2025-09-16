<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import { storeToRefs } from "pinia";



// shadcn primitives
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/core/components/ui/dropdown-menu';



import { BACKGROUND_IMAGES, useBackgroundImage } from "@/modules/home/composables/home-bg.composable";





const bgStore = useBackgroundImage()
const { selected } = storeToRefs(bgStore)
const { setBackground } = bgStore

function onPick(id: string) {
  console.log(id)
  setBackground(id)
}
</script>

<template>
	<DropdownMenu>
		<DropdownMenuTrigger>
			<img
				class="size-12 rounded-full border border-white/50"
				:src="selected.src"
				:alt="selected.title"
			/>
		</DropdownMenuTrigger>

		<DropdownMenuContent
			class="w-[440px] rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-xl text-white"
		>
			<!-- Grid previews -->
			<div class="grid grid-cols-2 gap-3">
				<button
					v-for="bg in BACKGROUND_IMAGES"
					:key="bg.id"
					type="button"
					@click="onPick(bg.id)"
					class="relative"
				>
					<img
						class="h-24 w-full rounded-lg"
						:src="bg.src"
						:alt="bg.title"
					/>

					<p class="text-sm font-semibold leading-tight mt-2 text-slate-200">{{ bg.title }}</p>

					<div
						v-if="selected.id === bg.id"
						variant="secondary"
						class="absolute top-3 right-3 text-white rounded-xl border p-1 bg-emerald-500 border-emerald-500"
					>
						<Check class="h-3.5 w-3.5" />
					</div>
				</button>
			</div>
		</DropdownMenuContent>
	</DropdownMenu>
</template>
