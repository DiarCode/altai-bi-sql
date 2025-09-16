<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/core/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog'
import { Input } from '@/core/components/ui/input'
import { Label } from '@/core/components/ui/label'
import { Textarea } from '@/core/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select'
import type { Purpose, WorkspaceData } from '../models/bi.models'



interface Props {
  open: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'submit', data: WorkspaceData): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const formData = ref<WorkspaceData>({
  name: '',
  description: '',
  purpose: 'OTHER'
})

const loading = ref(false)

const purposeOptions = [
  { value: 'HEALTH_CARE', label: 'Health Care' },
  { value: 'E_COMMERCE', label: 'E-Commerce' },
  { value: 'GOVERNEMENT', label: 'Government' },
  { value: 'ACCOUNTING', label: 'Accounting' },
  { value: 'OTHER', label: 'Other' },
] as const

function handleOpenChange(open: boolean) {
  emit('update:open', open)
  if (!open) {
    // Reset form when closing
    formData.value = {
      name: '',
      description: '',
      purpose: 'OTHER'
    }
  }
}

async function handleSubmit() {
  if (!formData.value.name.trim()) return
  
  loading.value = true
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    emit('submit', { ...formData.value })
    emit('update:open', false)
  } catch (error) {
    console.error('Failed to create workspace:', error)
  } finally {
    loading.value = false
  }
}

function handlePurposeChange(value: string) {
  formData.value.purpose = value as Purpose
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Create New Workspace</DialogTitle>
        <DialogDescription>
          Create a new workspace to organize your business intelligence projects.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- Name Field -->
        <div class="space-y-2">
          <Label for="workspace-name" class="text-white font-medium">
            Workspace Name *
          </Label>
          <Input
            id="workspace-name"
            v-model="formData.name"
            placeholder="Enter workspace name"
            class="border-white/30 bg-white/10 text-white placeholder:text-slate-300/70"
            :disabled="loading"
          />
        </div>

        <!-- Description Field -->
        <div class="space-y-2">
          <Label for="workspace-description" class="text-white font-medium">
            Description
          </Label>
          <Textarea
            id="workspace-description"
            v-model="formData.description"
            placeholder="Describe your workspace purpose and goals"
            class="min-h-[80px] border-white/30 bg-white/10 text-white placeholder:text-slate-300/70"
            :disabled="loading"
          />
        </div>

        <!-- Purpose Field -->
        <div class="space-y-2">
          <Label for="workspace-purpose" class="text-white font-medium">
            Industry Purpose
          </Label>
          <Select :value="formData.purpose" @update:value="handlePurposeChange">
            <SelectTrigger class="border-white/30 bg-white/10 text-white w-full">
              <SelectValue placeholder="Select industry purpose" />
            </SelectTrigger>
            <SelectContent class="border-white/30 bg-slate-800/90 backdrop-blur-xl">
              <SelectItem
                v-for="option in purposeOptions"
                :key="option.value"
                :value="option.value"
                class="text-white hover:bg-white/10 focus:bg-white/10"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="handleOpenChange(false)"
          :disabled="loading"
          class="border-white/30 bg-white/5 text-white hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button
          @click="handleSubmit"
          :disabled="!formData.name.trim() || loading"
          class="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <div v-if="loading" class="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
          {{ loading ? 'Creating...' : 'Create Workspace' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>