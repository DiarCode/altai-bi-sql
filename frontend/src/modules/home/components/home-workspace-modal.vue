<script setup lang="ts">
import { reactive, ref, unref } from 'vue';
import { toast } from 'vue-sonner';



import { Button } from '@/core/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/core/components/ui/dialog';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/ui/select';
import { Textarea } from '@/core/components/ui/textarea';



// ⬇️ Our models & composables ONLY
import { useCreateWorkspace } from '../composables/workspaces.composables';
import { type CreateWorkspaceDto, type WorkspaceDto, WorkspacePurpose } from '../models/workspaces.models';





// ---------------------------
// Props / Emits
// ---------------------------
interface Props { open: boolean }
interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'submit', data: WorkspaceDto): void
}
defineProps<Props>()
const emit = defineEmits<Emits>()

// ---------------------------
// Purpose labels (UI-friendly)
// ---------------------------
const PURPOSE_LABELS: Record<WorkspacePurpose, string> = {
  [WorkspacePurpose.HEALTH_CARE]: 'Health Care',
  [WorkspacePurpose.E_COMMERCE]: 'E-Commerce',
  [WorkspacePurpose.GOVERNMENT]: 'Government',
  [WorkspacePurpose.ACCOUNTING]: 'Accounting',
  [WorkspacePurpose.MARKETING]: 'Marketing',
  [WorkspacePurpose.EDUCATION]: 'Education',
  [WorkspacePurpose.FINANCE]: 'Finance',
  [WorkspacePurpose.ENTERTAINMENT]: 'Entertainment',
  [WorkspacePurpose.TECHNOLOGY]: 'Technology',
  [WorkspacePurpose.REAL_ESTATE]: 'Real Estate',
  [WorkspacePurpose.TRAVEL]: 'Travel',
  [WorkspacePurpose.FOOD_BEVERAGE]: 'Food & Beverage',
  [WorkspacePurpose.NON_PROFIT]: 'Non-profit',
  [WorkspacePurpose.SPORTS]: 'Sports',
  [WorkspacePurpose.DEFAULT]: 'Default',
  [WorkspacePurpose.OTHER]: 'Other',
}

// If you want to limit the dropdown, pick a subset here:
const purposeOptions = [
  WorkspacePurpose.HEALTH_CARE,
  WorkspacePurpose.E_COMMERCE,
  WorkspacePurpose.GOVERNMENT,
  WorkspacePurpose.ACCOUNTING,
  WorkspacePurpose.OTHER,
] as const

// ---------------------------
// Form state & validation
// ---------------------------
const formData = ref<CreateWorkspaceDto>({
  name: '',
  description: '',
  purpose: WorkspacePurpose.OTHER,
})

type FormErrors = Partial<Record<'name' | 'description' | 'purpose', string>>
const errors = reactive<FormErrors>({})

function isValidPurpose(val: unknown): val is WorkspacePurpose {
  return Object.values(WorkspacePurpose).includes(val as WorkspacePurpose)
}

function validate(): boolean {
  errors.name = !formData.value.name.trim() ? 'Name is required' : ''
  errors.description = !formData.value.description.trim() ? 'Description is required' : ''
  errors.purpose = !isValidPurpose(formData.value.purpose) ? 'Select a valid purpose' : ''
  return !errors.name && !errors.description && !errors.purpose
}

function resetForm() {
  formData.value = { name: '', description: '', purpose: WorkspacePurpose.OTHER }
  errors.name = errors.description = errors.purpose = ''
}

function handlePurposeChange(value: string) {
  // Guard to enum
  if (isValidPurpose(value)) formData.value.purpose = value
  else errors.purpose = 'Select a valid purpose'
}

function handleOpenChange(open: boolean) {
  emit('update:open', open)
  if (!open) resetForm()
}

// ---------------------------
// Mutation (create workspace)
// ---------------------------
const { mutate: createWorkspace, isPending } = useCreateWorkspace()

async function handleSubmit() {
  if (!validate()) {
    toast.error('Please fix form errors')
    return
  }

  createWorkspace(unref(formData), {
    onSuccess: (ws) => {
      toast.success('Workspace created')
      emit('submit', ws)
      emit('update:open', false)
      resetForm()
    },
    onError: (err) => {
      const msg = err?.message || 'Failed to create workspace'
      toast.error(msg)
    },
  })
}
</script>

<template>
	<Dialog
		:open="open"
		@update:open="handleOpenChange"
	>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle>Create New Workspace</DialogTitle>
				<DialogDescription> Create a workspace to organize your BI projects. </DialogDescription>
			</DialogHeader>

			<div class="space-y-6 py-4">
				<!-- Name -->
				<div class="space-y-2">
					<Label
						for="workspace-name"
						class="font-medium text-white"
					>
						Workspace Name *
					</Label>
					<Input
						id="workspace-name"
						v-model="formData.name"
						placeholder="Enter workspace name"
						class="bg-white/10 border-white/30 text-white placeholder:text-slate-300/70"
						:disabled="isPending"
						:aria-invalid="!!errors.name"
						:aria-errormessage="'err-name'"
					/>
					<p
						v-if="errors.name"
						id="err-name"
						class="text-red-300 text-xs"
					>
						{{ errors.name }}
					</p>
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<Label
						for="workspace-description"
						class="font-medium text-white"
					>
						Description *
					</Label>
					<Textarea
						id="workspace-description"
						v-model="formData.description"
						placeholder="Describe your workspace purpose and goals"
						class="bg-white/10 border-white/30 min-h-[80px] text-white placeholder:text-slate-300/70"
						:disabled="isPending"
						:aria-invalid="!!errors.description"
						:aria-errormessage="'err-desc'"
					/>
					<p
						v-if="errors.description"
						id="err-desc"
						class="text-red-300 text-xs"
					>
						{{ errors.description }}
					</p>
				</div>

				<!-- Purpose -->
				<div class="space-y-2">
					<Label
						for="workspace-purpose"
						class="font-medium text-white"
					>
						Industry Purpose
					</Label>
					<Select
						:value="formData.purpose"
						@update:value="handlePurposeChange"
					>
						<SelectTrigger
							id="workspace-purpose"
							class="bg-white/10 border-white/30 w-full text-white"
							:aria-invalid="!!errors.purpose"
							:aria-errormessage="'err-purpose'"
							:disabled="isPending"
						>
							<SelectValue placeholder="Select industry purpose" />
						</SelectTrigger>
						<SelectContent class="bg-slate-800/90 backdrop-blur-xl border-white/30">
							<SelectItem
								v-for="opt in purposeOptions"
								:key="opt"
								:value="opt"
								class="hover:bg-white/10 focus:bg-white/10 text-white"
							>
								{{ PURPOSE_LABELS[opt] }}
							</SelectItem>
						</SelectContent>
					</Select>
					<p
						v-if="errors.purpose"
						id="err-purpose"
						class="text-red-300 text-xs"
					>
						{{ errors.purpose }}
					</p>
				</div>
			</div>

			<DialogFooter>
				<Button
					variant="outline"
					@click="handleOpenChange(false)"
					:disabled="isPending"
					class="bg-white/5 hover:bg-white/10 border-white/30 text-white"
				>
					Cancel
				</Button>
				<Button
					@click="handleSubmit"
					:disabled="isPending"
					class="bg-blue-600 hover:bg-blue-700 text-white"
				>
					<div
						v-if="isPending"
						class="mr-2 border-2 border-current border-t-transparent rounded-full w-4 h-4 animate-spin"
					/>
					{{ isPending ? 'Creating...' : 'Create Workspace' }}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
</template>
