<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getAccount, getAccounts } from '@/apps/ahorros/services/cuentas'
import { getEntities } from '@/apps/ahorros/services/entidades'
import {
  addAccountMovement,
  addTransfer,
  deleteAccountMovement,
  deleteTransfer,
  getAccountMovements,
  updateAccountMovement,
  updateTransfer,
} from '@/apps/ahorros/services/movimientos'
import { getGoalMovements, getGoals } from '@/apps/ahorros/services/objetivos'
import MovementForm from '@/apps/ahorros/components/MovementForm.vue'
import { formatMoney } from '@/apps/ahorros/utils/currency'
import { extractDistinctPersonas } from '@/apps/ahorros/utils/persons'
import { formatDate, parseDateInput, toDateInputValue } from '@/apps/ahorros/utils/dates'

const route = useRoute()
const accountId = route.params.id

const account = ref(null)
const entity = ref(null)
const entities = ref([])
const movements = ref([])
const goals = ref([])
const accounts = ref([])
const personaSuggestions = ref([])
const loading = ref(true)
const serverError = ref('')

const editingId = ref(null)
const editType = ref('ingreso')
const editAmount = ref(null)
const editDate = ref('')
const editDescription = ref('')
const editGoalId = ref('')
const editPersona = ref('')
const editAllowOverdraft = ref(false)
const editError = ref('')

function entityName(entityId) {
  return entities.value.find((e) => e.id === entityId)?.name ?? null
}

function accountLabel(id) {
  const acc = accounts.value.find((a) => a.id === id)
  if (!acc) return 'cuenta'
  const bank = entityName(acc.entityId)
  return bank ? `${acc.name} (${bank})` : acc.name
}

const transferAccounts = computed(() =>
  accounts.value
    .filter((a) => a.id !== accountId && a.currency === account.value?.currency)
    .map((a) => ({ ...a, label: accountLabel(a.id) })),
)

function isTransfer(movement) {
  return movement.type === 'transferencia_salida' || movement.type === 'transferencia_entrada'
}

async function loadAll() {
  loading.value = true
  const [accountResult, entitiesResult, movementsResult, goalsResult, accountsResult] = await Promise.all([
    getAccount(accountId),
    getEntities(),
    getAccountMovements(accountId),
    getGoals(),
    getAccounts(),
  ])
  account.value = accountResult
  entities.value = entitiesResult
  entity.value = entitiesResult.find((e) => e.id === accountResult?.entityId) ?? null
  movements.value = movementsResult
  goals.value = goalsResult
  accounts.value = accountsResult
  loading.value = false
}

async function handleGoalChange(goalId) {
  personaSuggestions.value = goalId ? extractDistinctPersonas(await getGoalMovements(goalId)) : []
}

async function handleSubmit(payload) {
  serverError.value = ''
  try {
    if (payload.type === 'transferencia') {
      await addTransfer(accountId, payload.toAccountId, payload)
    } else {
      await addAccountMovement(accountId, payload)
    }
    await loadAll()
  } catch (err) {
    serverError.value = err.message
  }
}

function startEdit(movement) {
  editingId.value = movement.id
  editType.value = movement.type
  editAmount.value = movement.amount
  editDate.value = toDateInputValue(movement.date)
  editDescription.value = movement.description ?? ''
  editGoalId.value = movement.goalId ?? ''
  editPersona.value = movement.persona ?? ''
  editAllowOverdraft.value = false
  editError.value = ''
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(movement) {
  editError.value = ''
  if (!editAmount.value || editAmount.value <= 0) {
    editError.value = 'El monto debe ser mayor a cero.'
    return
  }
  try {
    if (isTransfer(movement)) {
      await updateTransfer(accountId, movement.id, {
        amount: Number(editAmount.value),
        description: editDescription.value.trim(),
        date: parseDateInput(editDate.value),
        allowOverdraft: editAllowOverdraft.value,
      })
    } else {
      await updateAccountMovement(accountId, movement.id, {
        type: editType.value,
        amount: Number(editAmount.value),
        description: editDescription.value.trim(),
        date: parseDateInput(editDate.value),
        goalId: editGoalId.value || null,
        persona: editGoalId.value ? editPersona.value.trim() || null : null,
        allowOverdraft: editAllowOverdraft.value,
      })
    }
    editingId.value = null
    await loadAll()
  } catch (err) {
    editError.value = err.message
  }
}

async function handleDeleteMovement(movement) {
  if (!confirm('¿Eliminar este movimiento?')) return
  if (isTransfer(movement)) {
    await deleteTransfer(accountId, movement.id)
  } else {
    await deleteAccountMovement(accountId, movement.id)
  }
  await loadAll()
}

onMounted(loadAll)
</script>

<template>
  <div v-if="loading" class="text-muted">Cargando…</div>
  <template v-else-if="account">
    <h1 class="h4 mb-1">{{ account.name }}</h1>
    <p class="text-muted mb-3">
      {{ entity?.name ?? '—' }} · {{ account.currency }}
    </p>

    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body text-center">
        <div class="text-muted small">Saldo actual</div>
        <div class="display-6 fw-bold" :class="account.balance < 0 ? 'text-danger' : 'text-primary'">
          {{ formatMoney(account.balance ?? 0, account.currency) }}
        </div>
      </div>
    </div>

    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body">
        <h2 class="h6 mb-3">Registrar movimiento</h2>
        <MovementForm
          :goals="goals"
          :persona-suggestions="personaSuggestions"
          :server-error="serverError"
          :transfer-accounts="transferAccounts"
          @submit="handleSubmit"
          @goal-change="handleGoalChange"
        />
      </div>
    </div>

    <h2 class="h6 mb-2">Historial</h2>
    <div v-if="movements.length === 0" class="text-muted">Aún no hay movimientos.</div>
    <ul v-else class="list-group">
      <li v-for="movement in movements" :key="movement.id" class="list-group-item">
        <template v-if="editingId === movement.id">
          <form class="row g-2 align-items-end" @submit.prevent="saveEdit(movement)">
            <div v-if="!isTransfer(movement)" class="col-6 col-sm-3">
              <label class="form-label">Tipo</label>
              <select v-model="editType" class="form-select">
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div v-else class="col-12 col-sm-3">
              <span class="badge text-bg-info">
                {{ movement.type === 'transferencia_salida' ? 'Transferencia enviada' : 'Transferencia recibida' }}
              </span>
            </div>
            <div class="col-6 col-sm-3">
              <label class="form-label">Monto</label>
              <input v-model="editAmount" type="number" step="0.01" min="0" class="form-control" required />
            </div>
            <div class="col-12 col-sm-3">
              <label class="form-label">Fecha</label>
              <input v-model="editDate" type="date" class="form-control" required />
            </div>
            <div class="col-12 col-sm-3">
              <label class="form-label">Descripción</label>
              <input v-model="editDescription" type="text" class="form-control" />
            </div>
            <div v-if="!isTransfer(movement)" class="col-12 col-sm-6">
              <label class="form-label">Vincular a objetivo (opcional)</label>
              <select v-model="editGoalId" class="form-select">
                <option value="">Ninguno</option>
                <option v-for="g in goals" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
            </div>
            <div v-if="!isTransfer(movement) && editGoalId" class="col-12 col-sm-6">
              <label class="form-label">Persona</label>
              <input v-model="editPersona" type="text" class="form-control" />
            </div>
            <div class="col-12 col-sm-6">
              <div class="form-check">
                <input
                  id="edit-overdraft"
                  v-model="editAllowOverdraft"
                  type="checkbox"
                  class="form-check-input"
                />
                <label class="form-check-label" for="edit-overdraft">Permitir descubierto</label>
              </div>
            </div>
            <div class="col-12 d-flex gap-2 justify-content-end">
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="cancelEdit">
                Cancelar
              </button>
              <button type="submit" class="btn btn-sm btn-success">Guardar</button>
            </div>
            <div v-if="editError" class="col-12">
              <div class="alert alert-danger py-2 mb-0">{{ editError }}</div>
            </div>
          </form>
        </template>
        <div v-else class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <div>
              <span
                v-if="isTransfer(movement)"
                class="badge me-2 text-bg-info"
              >
                {{ movement.type === 'transferencia_salida' ? 'Transferencia enviada' : 'Transferencia recibida' }}
              </span>
              <span
                v-else
                class="badge me-2"
                :class="movement.type === 'ingreso' ? 'text-bg-success' : 'text-bg-danger'"
              >
                {{ movement.type === 'ingreso' ? 'Ingreso' : 'Egreso' }}
              </span>
              <span v-if="movement.description">{{ movement.description }}</span>
              <span v-else class="text-muted fst-italic">Sin descripción</span>
            </div>
            <div class="text-muted small">
              {{ formatDate(movement.date) }}
              <span v-if="movement.persona"> · {{ movement.persona }}</span>
              <span v-if="movement.goalId">
                ·
                <RouterLink :to="`/ahorros/objetivos/${movement.goalId}`">
                  {{ goals.find((g) => g.id === movement.goalId)?.name ?? 'objetivo' }}
                </RouterLink>
              </span>
              <span v-if="movement.transferAccountId">
                ·
                <RouterLink :to="`/ahorros/cuentas/${movement.transferAccountId}`">
                  {{ movement.type === 'transferencia_salida' ? '→' : '←' }} {{ accountLabel(movement.transferAccountId) }}
                </RouterLink>
              </span>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <div
              v-if="isTransfer(movement)"
              class="fw-semibold"
              :class="movement.type === 'transferencia_entrada' ? 'text-success' : 'text-danger'"
            >
              {{ movement.type === 'transferencia_entrada' ? '+' : '-' }}{{ formatMoney(movement.amount, account.currency) }}
            </div>
            <div v-else class="fw-semibold" :class="movement.type === 'ingreso' ? 'text-success' : 'text-danger'">
              {{ movement.type === 'ingreso' ? '+' : '-' }}{{ formatMoney(movement.amount, account.currency) }}
            </div>
            <button
              class="btn btn-sm btn-outline-secondary"
              title="Editar movimiento"
              @click="startEdit(movement)"
            >
              <i class="bi bi-pencil"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-danger"
              title="Eliminar movimiento"
              @click="handleDeleteMovement(movement)"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </li>
    </ul>
  </template>
  <div v-else class="alert alert-danger">No se encontró la cuenta.</div>
</template>
