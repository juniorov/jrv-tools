<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  addGoalMovement,
  deleteGoal,
  getGoal,
  getGoalMovements,
  setPersonTargets,
  updateGoal,
} from '@/apps/ahorros/services/objetivos'
import { getAccounts } from '@/apps/ahorros/services/cuentas'
import { getEntities } from '@/apps/ahorros/services/entidades'
import { materializeGoalMovement } from '@/apps/ahorros/services/movimientos'
import MovementForm from '@/apps/ahorros/components/MovementForm.vue'
import PersonaAutocomplete from '@/apps/ahorros/components/PersonaAutocomplete.vue'
import ShareGoalPanel from '@/apps/ahorros/components/ShareGoalPanel.vue'
import { CURRENCIES, formatMoney } from '@/apps/ahorros/utils/currency'
import { computeGoalTotal, computePersonSubtotals, extractDistinctPersonas } from '@/apps/ahorros/utils/persons'
import { formatDate } from '@/apps/ahorros/utils/dates'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const goalId = route.params.id

const goal = ref(null)
const movements = ref([])
const accounts = ref([])
const entities = ref([])
const loading = ref(true)
const serverError = ref('')

const materializingId = ref(null)
const materializeAccountId = ref('')
const materializeAllowOverdraft = ref(false)
const materializeError = ref('')

const currencyOptions = Object.entries(CURRENCIES).map(([code, cfg]) => ({ code, ...cfg }))
const editingGoal = ref(false)
const editName = ref('')
const editTargetAmount = ref(null)
const editCurrency = ref('CRC')
const editGoalError = ref('')

const editingPersonTarget = ref(null)
const personTargetAmount = ref(null)
const personTargetError = ref('')
const newPersonName = ref('')
const newPersonTarget = ref(null)
const newPersonError = ref('')

const entityById = computed(() => Object.fromEntries(entities.value.map((e) => [e.id, e])))

const isOwner = computed(() => goal.value?.ownerId === authStore.user?.uid)
const canEdit = computed(
  () => isOwner.value || goal.value?.sharedWith?.[authStore.user?.uid] === 'editor',
)

const total = computed(() => computeGoalTotal(movements.value))
const personSubtotals = computed(() => computePersonSubtotals(movements.value))
const personaSuggestions = computed(() => extractDistinctPersonas(movements.value))
const progressPct = computed(() => {
  if (!goal.value?.targetAmount) return null
  return Math.min(100, Math.round((total.value / goal.value.targetAmount) * 100))
})
const remainingAmount = computed(() => {
  if (!goal.value?.targetAmount) return null
  return Math.max(0, goal.value.targetAmount - total.value)
})

const personEntries = computed(() => {
  const targets = goal.value?.personTargets ?? {}
  const subtotals = new Map(personSubtotals.value.map((e) => [e.persona, e.total]))
  const names = new Set([...subtotals.keys(), ...Object.keys(targets)])
  return [...names]
    .map((persona) => {
      const total = subtotals.get(persona) ?? 0
      const target = targets[persona] ?? null
      const progressPct = target ? Math.min(100, Math.round((total / target) * 100)) : null
      const remaining = target ? Math.max(0, target - total) : null
      return { persona, total, target, progressPct, remaining }
    })
    .sort((a, b) => a.persona.localeCompare(b.persona))
})

async function loadAll() {
  loading.value = true
  const [goalResult, movementsResult, accountsResult, entitiesResult] = await Promise.all([
    getGoal(goalId),
    getGoalMovements(goalId),
    getAccounts(),
    getEntities(),
  ])
  goal.value = goalResult
  movements.value = movementsResult
  accounts.value = accountsResult
  entities.value = entitiesResult
  loading.value = false
}

async function handleSubmit(payload) {
  serverError.value = ''
  try {
    await addGoalMovement(goalId, payload)
    await loadAll()
  } catch (err) {
    serverError.value = err.message
  }
}

async function handleDelete() {
  if (!confirm(`¿Eliminar el objetivo "${goal.value.name}" y todo su historial de aportes?`)) return
  await deleteGoal(goalId)
  router.push({ name: 'ahorros-objetivos' })
}

function startEditGoal() {
  editName.value = goal.value.name
  editTargetAmount.value = goal.value.targetAmount
  editCurrency.value = goal.value.currency
  editGoalError.value = ''
  editingGoal.value = true
}

function cancelEditGoal() {
  editingGoal.value = false
}

async function saveEditGoal() {
  editGoalError.value = ''
  if (!editName.value.trim()) {
    editGoalError.value = 'El nombre no puede estar vacío.'
    return
  }
  try {
    await updateGoal(goalId, {
      name: editName.value.trim(),
      targetAmount: editTargetAmount.value ? Number(editTargetAmount.value) : null,
      currency: editCurrency.value,
    })
    editingGoal.value = false
    await loadAll()
  } catch (err) {
    editGoalError.value = err.message
  }
}

function startEditPersonTarget(entry) {
  editingPersonTarget.value = entry.persona
  personTargetAmount.value = entry.target
  personTargetError.value = ''
}

function cancelEditPersonTarget() {
  editingPersonTarget.value = null
}

async function savePersonTarget(persona) {
  personTargetError.value = ''
  const amount = Number(personTargetAmount.value)
  if (!personTargetAmount.value || amount <= 0) {
    personTargetError.value = 'Ingresa un monto mayor a 0.'
    return
  }
  try {
    await setPersonTargets(goalId, { ...(goal.value.personTargets ?? {}), [persona]: amount })
    editingPersonTarget.value = null
    await loadAll()
  } catch (err) {
    personTargetError.value = err.message
  }
}

async function removePersonTarget(persona) {
  const targets = { ...(goal.value.personTargets ?? {}) }
  delete targets[persona]
  await setPersonTargets(goalId, targets)
  editingPersonTarget.value = null
  await loadAll()
}

async function addPersonTarget() {
  newPersonError.value = ''
  const name = newPersonName.value.trim()
  const amount = Number(newPersonTarget.value)
  if (!name) {
    newPersonError.value = 'Ingresa un nombre.'
    return
  }
  if (!newPersonTarget.value || amount <= 0) {
    newPersonError.value = 'Ingresa un monto mayor a 0.'
    return
  }
  try {
    await setPersonTargets(goalId, { ...(goal.value.personTargets ?? {}), [name]: amount })
    newPersonName.value = ''
    newPersonTarget.value = null
    await loadAll()
  } catch (err) {
    newPersonError.value = err.message
  }
}

function startMaterialize(movement) {
  materializingId.value = movement.id
  materializeAccountId.value = accounts.value[0]?.id ?? ''
  materializeAllowOverdraft.value = false
  materializeError.value = ''
}

function cancelMaterialize() {
  materializingId.value = null
}

async function confirmMaterialize(movement) {
  materializeError.value = ''
  if (!materializeAccountId.value) {
    materializeError.value = 'Selecciona una cuenta.'
    return
  }
  try {
    await materializeGoalMovement(
      goalId,
      movement.id,
      materializeAccountId.value,
      materializeAllowOverdraft.value,
    )
    materializingId.value = null
    await loadAll()
  } catch (err) {
    materializeError.value = err.message
  }
}

onMounted(loadAll)
</script>

<template>
  <div v-if="loading" class="text-muted">Cargando…</div>
  <template v-else-if="goal">
    <div v-if="editingGoal" class="card shadow-sm border-0 mb-3">
      <div class="card-body">
        <form class="row g-2 align-items-end" @submit.prevent="saveEditGoal">
          <div class="col-12 col-sm-6">
            <label class="form-label" for="goal-edit-name">Nombre</label>
            <input id="goal-edit-name" v-model="editName" type="text" class="form-control" required />
          </div>
          <div class="col-6 col-sm-3">
            <label class="form-label" for="goal-edit-target">Meta (opcional)</label>
            <input
              id="goal-edit-target"
              v-model="editTargetAmount"
              type="number"
              step="0.01"
              min="0"
              class="form-control"
            />
          </div>
          <div class="col-6 col-sm-3">
            <label class="form-label" for="goal-edit-currency">Moneda</label>
            <select id="goal-edit-currency" v-model="editCurrency" class="form-select">
              <option v-for="c in currencyOptions" :key="c.code" :value="c.code">{{ c.code }}</option>
            </select>
          </div>
          <div class="col-12 d-flex gap-2 justify-content-end">
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="cancelEditGoal">
              Cancelar
            </button>
            <button type="submit" class="btn btn-sm btn-success">Guardar</button>
          </div>
          <div v-if="editGoalError" class="col-12">
            <div class="alert alert-danger py-2 mb-0">{{ editGoalError }}</div>
          </div>
        </form>
      </div>
    </div>
    <div v-else class="d-flex justify-content-between align-items-center mb-1">
      <h1 class="h4 mb-0"><i class="bi bi-flag-fill me-2"></i>{{ goal.name }}</h1>
      <div v-if="isOwner" class="d-flex gap-2">
        <button
          class="btn btn-sm btn-outline-secondary"
          title="Editar objetivo"
          @click="startEditGoal"
        >
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" title="Eliminar objetivo" @click="handleDelete">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>

    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body text-center">
        <div class="text-muted small">Total acumulado</div>
        <div class="display-6 fw-bold text-primary">{{ formatMoney(total, goal.currency) }}</div>
        <template v-if="goal.targetAmount">
          <div class="text-muted small mt-1">Meta: {{ formatMoney(goal.targetAmount, goal.currency) }}</div>
          <div class="progress mt-2" style="height: 0.5rem">
            <div class="progress-bar" :style="{ width: progressPct + '%' }"></div>
          </div>
          <div class="small mt-1" :class="remainingAmount > 0 ? 'text-muted' : 'text-success fw-semibold'">
            <template v-if="remainingAmount > 0">
              Falta {{ formatMoney(remainingAmount, goal.currency) }} para completar la meta
            </template>
            <template v-else>
              <i class="bi bi-check-circle-fill me-1"></i>Meta completa
            </template>
          </div>
        </template>
      </div>
    </div>

    <div v-if="personEntries.length > 0 || isOwner" class="card shadow-sm border-0 mb-4">
      <div class="card-body">
        <h2 class="h6 mb-3">Aportes por persona</h2>
        <ul v-if="personEntries.length > 0" class="list-group list-group-flush mb-3">
          <li v-for="entry in personEntries" :key="entry.persona" class="list-group-item px-0">
            <div v-if="editingPersonTarget === entry.persona" class="row g-2 align-items-end">
              <div class="col-12 fw-semibold">{{ entry.persona }}</div>
              <div class="col-6">
                <input
                  v-model="personTargetAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  class="form-control form-control-sm"
                  placeholder="Meta individual"
                />
              </div>
              <div class="col-6 d-flex gap-2">
                <button
                  type="button"
                  class="btn btn-sm btn-success"
                  @click="savePersonTarget(entry.persona)"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  @click="cancelEditPersonTarget"
                >
                  Cancelar
                </button>
                <button
                  v-if="entry.target"
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  title="Quitar meta individual"
                  @click="removePersonTarget(entry.persona)"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
              <div v-if="personTargetError" class="col-12">
                <div class="alert alert-danger py-2 mb-0">{{ personTargetError }}</div>
              </div>
            </div>
            <div v-else class="d-flex justify-content-between align-items-start gap-2">
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2">
                  <span>{{ entry.persona }}</span>
                  <i
                    v-if="entry.progressPct >= 100"
                    class="bi bi-check-circle-fill text-success"
                    title="Meta individual completa"
                  ></i>
                </div>
                <template v-if="entry.target">
                  <div class="d-flex justify-content-between text-muted small mt-1">
                    <span>
                      {{ formatMoney(entry.total, goal.currency) }} de
                      {{ formatMoney(entry.target, goal.currency) }}
                    </span>
                    <span class="fw-semibold">{{ entry.progressPct }}%</span>
                  </div>
                  <div class="progress mt-1" style="height: 0.4rem">
                    <div class="progress-bar" :style="{ width: entry.progressPct + '%' }"></div>
                  </div>
                  <div class="small mt-1" :class="entry.remaining > 0 ? 'text-muted' : 'text-success'">
                    <template v-if="entry.remaining > 0">
                      Falta {{ formatMoney(entry.remaining, goal.currency) }}
                    </template>
                    <template v-else>Meta completa</template>
                  </div>
                </template>
              </div>
              <div class="d-flex align-items-center gap-2">
                <span v-if="!entry.target" class="fw-semibold">
                  {{ formatMoney(entry.total, goal.currency) }}
                </span>
                <button
                  v-if="isOwner"
                  class="btn btn-sm btn-outline-secondary"
                  title="Editar meta individual"
                  @click="startEditPersonTarget(entry)"
                >
                  <i class="bi bi-pencil"></i>
                </button>
              </div>
            </div>
          </li>
        </ul>

        <form v-if="isOwner" class="row g-2 align-items-end" @submit.prevent="addPersonTarget">
          <div class="col-12 col-sm-6">
            <label class="form-label small mb-1">Persona</label>
            <PersonaAutocomplete v-model="newPersonName" :suggestions="personaSuggestions" />
          </div>
          <div class="col-8 col-sm-4">
            <label class="form-label small mb-1">Meta individual</label>
            <input
              v-model="newPersonTarget"
              type="number"
              step="0.01"
              min="0"
              class="form-control"
            />
          </div>
          <div class="col-4 col-sm-2">
            <button type="submit" class="btn btn-outline-primary w-100">Agregar</button>
          </div>
          <div v-if="newPersonError" class="col-12">
            <div class="alert alert-danger py-2 mb-0">{{ newPersonError }}</div>
          </div>
        </form>
      </div>
    </div>

    <div v-if="canEdit" class="card shadow-sm border-0 mb-4">
      <div class="card-body">
        <h2 class="h6 mb-3">Registrar aporte / retiro</h2>
        <MovementForm
          show-persona
          :show-overdraft="false"
          :persona-suggestions="personaSuggestions"
          :server-error="serverError"
          @submit="handleSubmit"
        />
      </div>
    </div>

    <ShareGoalPanel v-if="isOwner" :goal="goal" @changed="loadAll" />

    <h2 class="h6 mb-2">Historial</h2>
    <div v-if="movements.length === 0" class="text-muted">Aún no hay movimientos.</div>
    <ul v-else class="list-group">
      <li v-for="movement in movements" :key="movement.id" class="list-group-item">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <div>
              <span
                class="badge me-2"
                :class="movement.type === 'ingreso' ? 'text-bg-success' : 'text-bg-danger'"
              >
                {{ movement.type === 'ingreso' ? 'Ingreso' : 'Egreso' }}
              </span>
              <span v-if="movement.persona" class="fw-semibold">{{ movement.persona }}</span>
              <span v-if="movement.description" class="text-muted"> — {{ movement.description }}</span>
            </div>
            <div class="text-muted small">{{ formatDate(movement.date) }}</div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <div class="fw-semibold" :class="movement.type === 'ingreso' ? 'text-success' : 'text-danger'">
              {{ movement.type === 'ingreso' ? '+' : '-' }}{{ formatMoney(movement.amount, goal.currency) }}
            </div>
            <button
              v-if="isOwner && !movement.accountId && accounts.length > 0"
              class="btn btn-sm btn-outline-secondary"
              title="Materializar en una cuenta"
              @click="startMaterialize(movement)"
            >
              <i class="bi bi-bank2"></i>
            </button>
          </div>
        </div>

        <div v-if="materializingId === movement.id" class="mt-2 pt-2 border-top">
          <p class="text-muted small mb-2">
            Convierte este aporte en un movimiento real de la cuenta elegida (no se duplica en el
            objetivo).
          </p>
          <form class="row g-2 align-items-end" @submit.prevent="confirmMaterialize(movement)">
            <div class="col-12 col-sm-6">
              <label class="form-label">Cuenta</label>
              <select v-model="materializeAccountId" class="form-select" required>
                <option v-for="account in accounts" :key="account.id" :value="account.id">
                  {{ entityById[account.entityId]?.name ?? '—' }} - {{ account.name }} ({{ account.currency }})
                </option>
              </select>
            </div>
            <div class="col-12 col-sm-6">
              <div class="form-check">
                <input
                  id="materialize-overdraft"
                  v-model="materializeAllowOverdraft"
                  type="checkbox"
                  class="form-check-input"
                />
                <label class="form-check-label" for="materialize-overdraft">Permitir descubierto</label>
              </div>
            </div>
            <div class="col-12 d-flex gap-2 justify-content-end">
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="cancelMaterialize">
                Cancelar
              </button>
              <button type="submit" class="btn btn-sm btn-success">Confirmar</button>
            </div>
            <div v-if="materializeError" class="col-12">
              <div class="alert alert-danger py-2 mb-0">{{ materializeError }}</div>
            </div>
          </form>
        </div>
      </li>
    </ul>
  </template>
  <div v-else class="alert alert-danger">No se encontró el objetivo.</div>
</template>
