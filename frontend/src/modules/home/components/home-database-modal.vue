<script setup lang="ts">
import { ref, computed } from 'vue'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select'
import type { ConnectionData, DatabaseType } from '../models/bi.models'


interface Props {
  open: boolean
  mode?: 'add' | 'edit'
  initialData?: Partial<ConnectionData>
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'submit', data: ConnectionData): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const formData = ref<ConnectionData>({
  dbType: 'PostgreSQL',
  username: '',
  password: '',
  databaseName: '',
  host: 'localhost',
  port: '5432'
})

const loading = ref(false)
const testingConnection = ref(false)
const connectionStatus = ref<'idle' | 'success' | 'error'>('idle')

const dbTypeOptions = [
  { value: 'PostgreSQL', label: 'PostgreSQL', defaultPort: '5432' },
  { value: 'MySQL', label: 'MySQL', defaultPort: '3306' },
] as const

const isFormValid = computed(() => {
  return formData.value.username.trim() &&
         formData.value.password.trim() &&
         formData.value.databaseName.trim() &&
         formData.value.host.trim() &&
         formData.value.port.trim()
})

function handleOpenChange(open: boolean) {
  emit('update:open', open)
  if (!open) {
    // Reset form when closing
    formData.value = {
      dbType: 'PostgreSQL',
      username: '',
      password: '',
      databaseName: '',
      host: 'localhost',
      port: '5432'
    }
    connectionStatus.value = 'idle'
  }
}

function handleDbTypeChange(value: string) {
  const dbType = value as DatabaseType
  formData.value.dbType = dbType
  
  // Update default port based on database type
  const selectedOption = dbTypeOptions.find(opt => opt.value === dbType)
  if (selectedOption) {
    formData.value.port = selectedOption.defaultPort
  }
}

async function testConnection() {
  if (!isFormValid.value) return
  
  testingConnection.value = true
  connectionStatus.value = 'idle'
  
  try {
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock success/error (80% success rate for demo)
    const isSuccess = Math.random() > 0.2
    connectionStatus.value = isSuccess ? 'success' : 'error'
  } catch (error) {
    connectionStatus.value = 'error'
    console.error('Connection test failed:', error)
  } finally {
    testingConnection.value = false
  }
}

async function handleSubmit() {
  if (!isFormValid.value) return
  
  loading.value = true
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    emit('submit', { ...formData.value })
    emit('update:open', false)
  } catch (error) {
    console.error('Failed to save connection:', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Configure Database Connection</DialogTitle>
        <DialogDescription>
          Set up your database connection to enable data querying and analysis.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Database Type -->
        <div class="space-y-2">
          <Label for="db-type" class="text-white font-medium">
            Database Type *
          </Label>
          <Select :value="formData.dbType" @update:value="handleDbTypeChange">
            <SelectTrigger class="border-white/30 bg-white/10 text-white data-[placeholder]:text-slate-300/70 w-full">
              <SelectValue placeholder="Select database type" />
            </SelectTrigger>
            <SelectContent class="border-white/30 bg-slate-800/90 backdrop-blur-xl">
              <SelectItem
                v-for="option in dbTypeOptions"
                :key="option.value"
                :value="option.value"
                class="text-white hover:bg-white/10 focus:bg-white/10"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Host and Port -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="host" class="text-white font-medium">
              Host *
            </Label>
            <Input
              id="host"
              v-model="formData.host"
              placeholder="localhost"
              class="border-white/30 bg-white/10 text-white placeholder:text-slate-300/70"
              :disabled="loading || testingConnection"
            />
          </div>
          <div class="space-y-2">
            <Label for="port" class="text-white font-medium">
              Port *
            </Label>
            <Input
              id="port"
              v-model="formData.port"
              placeholder="5432"
              class="border-white/30 bg-white/10 text-white placeholder:text-slate-300/70"
              :disabled="loading || testingConnection"
            />
          </div>
        </div>

        <!-- Database Name -->
        <div class="space-y-2">
          <Label for="database-name" class="text-white font-medium">
            Database Name *
          </Label>
          <Input
            id="database-name"
            v-model="formData.databaseName"
            placeholder="Enter database name"
            class="border-white/30 bg-white/10 text-white placeholder:text-slate-300/70"
            :disabled="loading || testingConnection"
          />
        </div>

        <!-- Username -->
        <div class="space-y-2">
          <Label for="username" class="text-white font-medium">
            Username *
          </Label>
          <Input
            id="username"
            v-model="formData.username"
            placeholder="Enter username"
            class="border-white/30 bg-white/10 text-white placeholder:text-slate-300/70"
            :disabled="loading || testingConnection"
          />
        </div>

        <!-- Password -->
        <div class="space-y-2">
          <Label for="password" class="text-white font-medium">
            Password *
          </Label>
          <Input
            id="password"
            v-model="formData.password"
            type="password"
            placeholder="Enter password"
            class="border-white/30 bg-white/10 text-white placeholder:text-slate-300/70"
            :disabled="loading || testingConnection"
          />
        </div>

        <!-- Test Connection -->
        <div class="space-y-2">
          <Button
            variant="outline"
            @click="testConnection"
            :disabled="!isFormValid || loading || testingConnection"
            class="w-full border-white/30 bg-white/5 text-white hover:bg-white/10"
          >
            <div v-if="testingConnection" class="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
            {{ testingConnection ? 'Testing Connection...' : 'Test Connection' }}
          </Button>
          
          <!-- Connection Status -->
          <div v-if="connectionStatus !== 'idle'" class="text-center text-sm">
            <p v-if="connectionStatus === 'success'" class="text-emerald-300 flex items-center justify-center gap-2">
              <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
              Connection successful!
            </p>
            <p v-else-if="connectionStatus === 'error'" class="text-rose-300 flex items-center justify-center gap-2">
              <span class="h-2 w-2 rounded-full bg-rose-400"></span>
              Connection failed. Please check your credentials.
            </p>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="handleOpenChange(false)"
          :disabled="loading || testingConnection"
          class="border-white/30 bg-white/5 text-white hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button
          @click="handleSubmit"
          :disabled="!isFormValid || loading || testingConnection"
          class="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <div v-if="loading" class="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
          {{ loading ? 'Saving...' : 'Save Connection' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>