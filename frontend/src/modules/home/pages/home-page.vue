<script setup lang="ts">
import { ArrowRight, Bell, ChevronRight, LogOut, ScanLine } from 'lucide-vue-next';
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';



/* assets */
import imgFallback from '@/core/assets/images/fallback.png';
import frontBreak from '@/core/assets/zones/front_break.png';
import frontOk from '@/core/assets/zones/front_ok.png';
import frontWarn from '@/core/assets/zones/front_warn.png';
import leftBreak from '@/core/assets/zones/left_break.png';
import leftOk from '@/core/assets/zones/left_ok.png';
import leftWarn from '@/core/assets/zones/left_warn.png';
import rearBreak from '@/core/assets/zones/rear_break.png';
import rearOk from '@/core/assets/zones/rear_ok.png';
import rearWarn from '@/core/assets/zones/rear_warn.png';
import rightBreak from '@/core/assets/zones/right_break.png';
import rightOk from '@/core/assets/zones/right_ok.png';
import rightWarn from '@/core/assets/zones/right_warn.png';
/* shadcn/ui */
import { Avatar, AvatarFallback } from '@/core/components/ui/avatar';
import { Button } from '@/core/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/core/components/ui/dropdown-menu';
import { Skeleton } from '@/core/components/ui/skeleton';
/* app */
import TabBar from '@/core/layouts/primary/primary-tabbar.vue';



/* latest analysis composable */
import { useLatestAnalysis } from '@/modules/analysis/composables/analysis.composables';
import { type CarAnalysisDto, type CarAnalysisZoneDto, CarStatus } from '@/modules/analysis/models/analysis.models';
/* auth */
import { useAuth } from '@/modules/auth/composables/use-auth.composable';
import { useMe } from '@/modules/auth/composables/use-me.composables';



import ReadinessGauge from '../components/home-readiness-gauge.vue';





type ZoneKey = 'FRONT' | 'LEFT' | 'RIGHT' | 'BACK'



const zoneStateImageMap: Record<ZoneKey, Record<ZoneState, string>> = {
    FRONT: { ok: frontOk, warn: frontWarn, break: frontBreak },
    LEFT:  { ok: leftOk,  warn: leftWarn,  break: leftBreak  },
    RIGHT: { ok: rightOk, warn: rightWarn, break: rightBreak },
    BACK:  { ok: rearOk,  warn: rearWarn,  break: rearBreak  }
  }


const router = useRouter()

/* auth */
const { data: user } = useMe()
const { logout } = useAuth()
const handleLogout = async () => {
  await logout()
  router.push({ name: 'welcome' })
}

/* initials (handles one-word names) */
const userInitials = computed(() => {
  const name = user.value?.name?.trim() ?? ''
  if (!name) return ''
  const parts = name.split(/\s+/).filter(Boolean)
  const firstChar = (s: string) => Array.from(s)[0] ?? ''
  if (parts.length === 1) {
    const arr = Array.from(parts[0])
    return (arr[0] ?? '').concat(arr[1] ?? '').toLocaleUpperCase('ru-RU')
  }
  return (firstChar(parts[0]) + firstChar(parts.at(-1)!)).toLocaleUpperCase('ru-RU')
})

/* =========================
   DATA (from API)
   ========================= */
const {
  data: latest,
  isLoading,
  isError,
} = useLatestAnalysis()

/* helpers */
const isEmptyState = computed(() => {
  return (!!isError.value) || (!isLoading.value && !latest.value)
})

const analysis = computed<CarAnalysisDto | undefined>(() => latest.value ?? undefined)

/* updated label */
const updatedRelative = computed(() => {
  if (!analysis.value?.createdAt) return ''
  const ts = new Date(analysis.value.createdAt).getTime()
  const delta = Math.max(0, Date.now() - ts)
  const m = Math.floor(delta / 60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин. назад`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч. назад`
  const d = Math.floor(h / 24)
  return `${d} дн. назад`
})

/* readiness: prefer overallScore (0..5) -> %; otherwise derive from zones */
const readiness = computed(() => {
  if (analysis.value?.overallScore && analysis.value.overallScore > 0) {
    return Math.round((Math.min(5, Math.max(0, analysis.value.overallScore)) / 5) * 100)
  }
  const zones = analysis.value?.zones ?? []
  const breaking = zones.filter(z => z.breaking).length
  const maint = zones.filter(z => z.hasRust || z.isDirty).length
  const maintOnly = Math.max(0, maint - breaking)
  const score = 100 - breaking * 18 - maintOnly * 6
  return Math.min(100, Math.max(40, score))
})

const gaugeTone = computed<'primary' | 'amber' | 'red'>(() =>
  readiness.value >= 80 ? 'primary' : readiness.value >= 60 ? 'amber' : 'red'
)

const readinessStatus = computed(() => {
  const s = analysis.value?.status
      // map CarStatus → label/color
  // fallback to readiness thresholds if status unknown
  if (s === CarStatus.EXCELLENT) return { text: 'Отличное состояние', color: 'text-primary' }
  if (s === CarStatus.COSMETIC_ISSUES || s === CarStatus.MECHANICAL_SERVICE_NEEDED) return { text: 'Требует внимания', color: 'text-amber-600' }
  if (s === CarStatus.CRITICAL_CONDITION) return { text: 'Критическое состояние', color: 'text-red-600' }

  if (readiness.value >= 80) return { text: 'Отличное состояние', color: 'text-primary' }
  if (readiness.value >= 60) return { text: 'Требует внимания', color: 'text-amber-600' }
  return { text: 'Критическое состояние', color: 'text-red-600' }
})

/* zone name + image mapping (supports enum or ru label) */
const zoneKey = (name: CarAnalysisZoneDto['name'] | string): ZoneKey | undefined => {
  const n = String(name).toUpperCase()
  if (['FRONT', 'ПЕРЕДНЯЯ'].includes(n)) return 'FRONT'
  if (['LEFT', 'ЛЕВАЯ'].includes(n)) return 'LEFT'
  if (['RIGHT', 'ПРАВАЯ'].includes(n)) return 'RIGHT'
  if (['BACK', 'REAR', 'ЗАДНЯЯ', 'ЗАДНЯЯ ЧАСТЬ'].includes(n)) return 'BACK'
  return undefined
}

const zoneLabelRu = (k: ZoneKey | undefined) =>
  k === 'FRONT' ? 'Передняя'
  : k === 'LEFT' ? 'Левая'
  : k === 'RIGHT' ? 'Правая'
  : k === 'BACK' ? 'Задняя'
  : 'Зона'

/* priority: top 3 zones by: breaking desc, urgency desc, cost desc, rust/dirty desc */
const urgencyWeight = (u?: string) => (u === 'HIGH' ? 3 : u === 'MEDIUM' ? 2 : 1)

/* img fallback */
const onImgError = (e: Event) => {
  const t = e.target as HTMLImageElement
  if (t && t.src !== imgFallback) t.src = imgFallback
}

/* formatters */
const formatCurrency = (v: number) =>
  new Intl.NumberFormat('kk-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(v)

type ZoneState = 'ok' | 'warn' | 'break'

const zoneState = (z: CarAnalysisDto['zones'][number]): ZoneState =>
  z.breaking ? 'break' : (z.hasRust || z.isDirty) ? 'warn' : 'ok'

const zoneImg = (name: ZoneKey, st: ZoneState) => {
  return zoneStateImageMap[name]?.[st] || imgFallback
}

const priorityTop = computed(() => {
  const zones = analysis.value?.zones ?? []
  const scored = zones
    .map(z => {
      const k = zoneKey(z.name)
      const score =
        (z.breaking ? 1000 : 0) +
        urgencyWeight(z.aiAnalysis?.urgency as string) * 50 +
        (z.aiAnalysis?.estimatedCost ?? 0) / 10 +
        (z.hasRust ? 20 : 0) +
        (z.isDirty ? 10 : 0)
      return { z, k, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => ({
      name: zoneLabelRu(item.k),
      img: item.k ? zoneImg(item.k, zoneState(item.z)) : imgFallback,
      cost: item.z.aiAnalysis?.estimatedCost ?? 0,
      breaking: item.z.breaking,
      hasRust: item.z.hasRust,
      isDirty: item.z.isDirty
    }))
  return scored
})
</script>

<template>
	<div
		class="relative bg-gradient-to-b from-slate-100 to-slate-200 min-h-screen overflow-hidden text-slate-900"
	>
		<!-- Header -->
		<header
			class="top-0 z-20 sticky bg-white/70 backdrop-blur-md px-6 py-4 border-slate-200 border-b"
		>
			<div class="flex justify-between items-center">
				<h1 class="mt-0.5 font-semibold text-2xl tracking-tight">Главная</h1>

				<div class="flex items-center gap-2">
					<Button
						size="icon"
						variant="ghost"
					>
						<Bell class="size-5 text-slate-600" />
					</Button>

					<DropdownMenu v-if="user">
						<DropdownMenuTrigger>
							<Avatar>
								<AvatarFallback>{{ userInitials }}</AvatarFallback>
							</Avatar>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem
								@click="handleLogout"
								class="text-destructive"
							>
								<LogOut class="mr-2 text-destructive" /> Выйти
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>

		<!-- Main -->
		<main class="z-10 relative space-y-4 mx-auto mt-4 px-6 pb-32 max-w-screen-sm">
			<!-- Readiness -->
			<section
				v-if="!isEmptyState"
				class="bg-white/60 backdrop-blur-xl p-6 border border-slate-200 rounded-3xl"
			>
				<div class="flex justify-between items-center gap-4 mb-4">
					<div class="min-w-0">
						<p class="text-slate-600 text-sm">
							<span v-if="!isLoading && analysis">Обновлено {{ updatedRelative }}</span>
							<Skeleton
								v-else
								class="w-40 h-4"
							/>
						</p>

						<h2 class="mt-1 font-semibold text-[22px] leading-snug">Готовность к поездке</h2>
						<p
							v-if="!isLoading && analysis"
							:class="`mt-1 text-base font-semibold ${readinessStatus.color}`"
						>
							{{ readinessStatus.text }}
						</p>
						<Skeleton
							v-else
							class="mt-2 w-52 h-5"
						/>
					</div>

					<div class="shrink-0">
						<ReadinessGauge
							v-if="!isLoading && analysis"
							:value="readiness"
							:tone="gaugeTone"
						/>
						<Skeleton
							v-else
							class="rounded-full w-14 h-14"
						/>
					</div>
				</div>

				<div class="flex gap-3">
					<RouterLink
						:to="{ name: 'scan' }"
						class="flex flex-1 justify-center items-center gap-3 bg-primary hover:bg-primary/80 px-6 py-4 rounded-2xl text-primary-foreground transition-colors"
					>
						<ScanLine class="w-5 h-5" />
						<span class="font-semibold text-base">Сканировать</span>
					</RouterLink>

					<RouterLink
						v-if="!isLoading && analysis"
						:to="{ name: 'analysis-details', params: { id: String(analysis!.id) } }"
						class="inline-flex justify-center items-center bg-white/70 hover:bg-white px-5 py-3.5 border border-slate-200 rounded-2xl transition-colors"
					>
						<ChevronRight class="w-5 h-5 text-slate-700" />
					</RouterLink>
					<div
						v-else
						class="inline-flex items-center"
					>
						<Skeleton class="rounded-2xl w-11 h-11" />
					</div>
				</div>
			</section>

			<!-- Empty state -->
			<section
				v-if="isEmptyState"
				class="bg-white/70 backdrop-blur-xl p-8 border border-slate-200 rounded-2xl text-center"
			>
				<div class="place-items-center grid bg-slate-100 mx-auto mb-4 rounded-full w-16 h-16">
					<ScanLine class="w-7 h-7 text-slate-500" />
				</div>
				<h3 class="mb-1 font-semibold text-lg">Пока нет анализов</h3>
				<p class="mb-6 text-slate-600">Сканируйте автомобиль, чтобы получить первый отчёт</p>
				<RouterLink
					:to="{ name: 'scan' }"
					class="inline-flex items-center gap-2 bg-primary hover:bg-primary/80 px-5 py-3 rounded-xl text-primary-foreground transition"
				>
					<ScanLine class="w-5 h-5" />
					Начать сканирование
				</RouterLink>
			</section>

			<!-- Latest Analysis (summary + priority) -->
			<section
				v-else
				class="bg-white/60 backdrop-blur-xl p-6 border border-slate-200 rounded-2xl"
			>
				<div class="flex justify-between items-center gap-2">
					<div>
						<h3 class="font-semibold text-xl tracking-tight">Последний анализ</h3>
						<span
							v-if="analysis"
							class="text-slate-600 text-sm"
						>
							{{ new Date(analysis.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) }}
						</span>
						<Skeleton
							v-else
							class="mt-1 w-40 h-4"
						/>
					</div>

					<Button
						@click="$router.push({ name: 'analysis-details', params: { id: String(analysis!.id) } })"
						size="icon"
						variant="ghost"
					>
						<ArrowRight class="size-6 text-slate-700" />
					</Button>
				</div>

				<!-- Skeleton while loading -->
				<div
					v-if="isLoading"
					class="space-y-3 mt-4"
				>
					<div class="flex items-center gap-3">
						<Skeleton class="rounded-xl size-18" />
						<div class="flex-1 space-y-2">
							<Skeleton class="w-44 h-4" />
							<Skeleton class="w-28 h-4" />
							<div class="flex gap-2">
								<Skeleton class="rounded-md w-14 h-5" />
								<Skeleton class="rounded-md w-16 h-5" />
							</div>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<Skeleton class="rounded-xl size-18" />
						<div class="flex-1 space-y-2">
							<Skeleton class="w-40 h-4" />
							<Skeleton class="w-24 h-4" />
							<div class="flex gap-2">
								<Skeleton class="rounded-md w-14 h-5" />
								<Skeleton class="rounded-md w-16 h-5" />
							</div>
						</div>
					</div>
				</div>

				<!-- Priority with illustrations -->
				<div
					v-else
					class="space-y-3 mt-4"
				>
					<div
						v-for="item in priorityTop"
						:key="item.name"
						class="flex items-center gap-3 bg-white/80 p-3 border border-slate-200 rounded-2xl"
					>
						<!-- Illustration -->
						<img
							:src="item.img"
							:alt="`${item.name} часть — иллюстрация`"
							class="bg-slate-50 border border-slate-200 rounded-xl size-18 object-contain"
							@error="onImgError"
						/>

						<!-- Text -->
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-sm truncate">{{ item.name }} часть</p>
							<span class="text-slate-700 text-sm whitespace-nowrap">
								{{ item.cost > 0 ? formatCurrency(item.cost) : 'Без затрат' }}
							</span>

							<!-- Issue chips -->
							<div class="flex flex-wrap items-center gap-1.5 mt-2">
								<span
									v-if="item.breaking"
									class="bg-red-50 px-2 py-0.5 border border-red-200 rounded-md font-medium text-[11px] text-red-700"
								>
									Поломка
								</span>
								<span
									v-if="item.hasRust"
									class="bg-orange-50 px-2 py-0.5 border border-orange-200 rounded-md font-medium text-[11px] text-orange-700"
								>
									Ржавчина
								</span>
								<span
									v-if="item.isDirty"
									class="bg-amber-50 px-2 py-0.5 border border-amber-200 rounded-md font-medium text-[11px] text-amber-700"
								>
									Грязь
								</span>
							</div>
						</div>
					</div>

					<!-- Risk / Total -->
					<div class="flex justify-between items-start mt-6">
						<div>
							<p class="text-slate-500 text-xs">Статус</p>
							<p
								class="font-semibold"
								:class="analysis?.status === CarStatus.CRITICAL_CONDITION
                   ? 'text-red-600'
                   : analysis?.status === CarStatus.COSMETIC_ISSUES || analysis?.status === CarStatus.MECHANICAL_SERVICE_NEEDED
                   ? 'text-amber-600'
                   : 'text-primary'"
							>
								{{
                  analysis?.status === CarStatus.CRITICAL_CONDITION ? 'Критический' :
                  analysis?.status === CarStatus.COSMETIC_ISSUES || analysis?.status === CarStatus.MECHANICAL_SERVICE_NEEDED ? 'Требует внимания' :
                  analysis?.status === CarStatus.EXCELLENT ? 'Хороший' : 'Отличный'
								}}
							</p>
						</div>

						<div>
							<p class="text-slate-500 text-xs">Итого</p>
							<p class="font-semibold text-base">
								{{ analysis ? formatCurrency(analysis.totalEstimatedCost) : '' }}
							</p>
						</div>
					</div>
				</div>
			</section>
		</main>

		<TabBar />
	</div>
</template>
