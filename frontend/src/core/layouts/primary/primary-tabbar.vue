<template>
	<nav
		class="fixed bottom-0 inset-x-0 z-20 p-6"
		role="navigation"
		aria-label="Навигация по приложению"
	>
		<div class="bg-white/80 backdrop-blur-md rounded-3xl border-slate-200 border">
			<div class="flex justify-around items-center px-2 py-3">
				<RouterLink
					v-for="tab in tabs"
					:key="tab.name"
					:to="tab.route"
					:aria-current="isActiveTab(tab.name) ? 'page' : undefined"
					:class="[
            'flex flex-col items-center gap-2 py-2 px-3 transition-colors duration-200 min-w-0 flex-1',
            isActiveTab(tab.name)
              ? 'text-lime-700'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900'
          ]"
				>
					<component
						:is="tab.icon"
						class="size-6 flex-shrink-0"
					/>
					<span class="text-sm font-medium truncate">{{ tab.label }}</span>
				</RouterLink>
			</div>
		</div>
	</nav>
</template>

<script setup lang="ts">
import { History, Home, ScanLine } from 'lucide-vue-next';
import { RouterLink, useRoute } from 'vue-router';





const route = useRoute()

// Tabs (history now links to its own route)
const tabs = [
  { name: 'home',    label: 'Главная',     icon: Home,     route: { name: 'home' } },
  { name: 'scan',    label: 'Сканировать', icon: ScanLine, route: { name: 'scan' }, primary: true },
  { name: 'analysis', label: 'История',     icon: History,  route: { name: 'analysis' } },
]

// Active if exact or nested like 'history-item'
const isActiveTab = (tabName: string): boolean => {
  const current = String(route.name ?? '')
  return current === tabName || current.startsWith(`${tabName}-`)
}
</script>
