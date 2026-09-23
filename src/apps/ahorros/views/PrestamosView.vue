<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { createLoan, getLoans } from '@/apps/ahorros/services/prestamos'
import { getAccounts } from '@/apps/ahorros/services/cuentas'
import { getEntities } from '@/apps/ahorros/services/entidades'
import { getGoals } from '@/apps/ahorros/services/objetivos'
import PersonaAutocomplete from '@/apps/ahorros/components/PersonaAutocomplete.vue'
import { formatMoney } from '@/apps/ahorros/utils/currency'
import { extractDistinctPersonas } from '@/apps/ahorros/utils/persons'
import { todayInputValue } from '@/apps/ahorros/utils/dates'

const loans = ref([])
const accounts = ref([])
const entities = ref([])
const goals = ref([])
const loading = ref(true)
const serverError = ref('')

const persona = ref('')
const principalAmount = ref(null)
const description = ref('')
const date = ref(todayInputValue())
const sourceAccountId = ref('')
const sourceGoalId = ref('')
const allowOverdraft = ref(false)

const entityById = computed(() => Object.fromEntries(entities.value.map((e) => [e.id, e])))
const accountById = computed(() => Object.fromEntries(accounts.value.map((a) => [a.id, a])))
const personaSuggestions = computed(() => extractDistinctPersonas(loans.value.map((l) => ({ persona: l.persona }))))

const activeLoans = computed(() => loans.value.filter((l) => l.status === 'activo'))
const returnedLoans = computed(() => loans.value.filter((l) => l.status === 'devuelto'))

async function loadAll() {
  loading.value = true
  const [loansResult, accountsResult, entitiesResult, goalsResult] = await Promise.all([
    getLoans(),
    getAccounts(),
    getEntities(),
    getGoals(),
  ])
  loans.value = loansResult
  accounts.value = accountsResult
  entities.value = entitiesResult
  goals.value = goalsResult
  if (!sourceAccountId.value && accounts.value.length > 0) sourceAccountId.value = accounts.value[0].id
  loading.value = false
}

function faltante(loan) {
  return Math.max(0, loan.principalAmount - loan.amountRepaid)
}

async function handleCreate() {
  serverError.value = ''
  if (!persona.value.trim() || !principalAmount.value || !sourceAccountId.value) return
  const account = accountById.value[sourceAccountId.value]
  try {
    await createLoan({
      persona: persona.value.trim(),
      principalAmount: Number(principalAmount.value),
      description: description.value.trim() || null,
      date: date.value,
      sourceAccountId: sourceAccountId.value,
      sourceGoalId: sourceGoalId.value || null,
      currency: account.currency,
      allowOverdraft: allowOverdraft.value,
    })
    persona.value = ''
    principalAmount.value = null
    description.value = ''
    sourceGoalId.value = ''
    allowOverdraft.value = false
    await loadAll()
  } catch (err) {
    serverError.value = err.message
  }
}

onMounted(loadAll)
</script>

<template>
  <h1 class="h4 mb-3">Préstamos</h1>

  <div class="card shadow-sm border-0 mb-4">
    <div class="card-body">
      <h2 class="h6 mb-3">Registrar préstamo</h2>
      <form class="row g-2 align-items-end" @submit.prevent="handleCreate">
        <div class="col-12 col-sm-4">
          <label class="form-label">A quién le prestas</label>
          <PersonaAutocomplete v-model="persona" :suggestions="personaSuggestions" />
        </div>
        <div class="col-6 col-sm-2">
          <label class="form-label">Monto</label>
          <input v-model="principalAmount" type="number" step="0.01" min="0.01" class="form-control" required />
        </div>
        <div class="col-6 col-sm-3">
          <label class="form-label">Cuenta de origen</label>
          <select v-model="sourceAccountId" class="form-select" required>
            <option v-for="account in accounts" :key="account.id" :value="account.id">
              {{ entityById[account.entityId]?.name ?? '—' }} - {{ account.name }} ({{ account.currency }})
            </option>
          </select>
        </div>
        <div class="col-6 col-sm-3">
          <label class="form-label">Objetivo vinculado (opcional)</label>
          <select v-model="sourceGoalId" class="form-select">
            <option value="">Ninguno</option>
            <option v-for="goal in goals" :key="goal.id" :value="goal.id">{{ goal.name }}</option>
          </select>
        </div>
        <div class="col-6 col-sm-3">
          <label class="form-label">Fecha</label>
          <input v-model="date" type="date" class="form-control" required />
        </div>
        <div class="col-12 col-sm-6">
          <label class="form-label">Descripción (opcional)</label>
          <input v-model="description" type="text" class="form-control" placeholder="Ej. motivo" />
        </div>
        <div class="col-12 col-sm-3 d-flex align-items-center">
          <div class="form-check">
            <input id="loan-overdraft" v-model="allowOverdraft" type="checkbox" class="form-check-input" />
            <label class="form-check-label" for="loan-overdraft">Permitir descubierto</label>
          </div>
        </div>
        <div class="col-12 col-sm-3">
          <button type="submit" class="btn btn-primary w-100">Prestar</button>
        </div>
        <div v-if="serverError" class="col-12">
          <div class="alert alert-danger py-2 mb-0">{{ serverError }}</div>
        </div>
      </form>
    </div>
  </div>

  <div v-if="loading" class="text-muted">Cargando…</div>
  <template v-else>
    <div v-if="loans.length === 0" class="text-muted">Aún no hay préstamos registrados.</div>
    <template v-else>
      <h2 class="h6 mb-2">Activos</h2>
      <div v-if="activeLoans.length === 0" class="text-muted mb-4">No hay préstamos activos.</div>
      <ul v-else class="list-group mb-4">
        <li v-for="loan in activeLoans" :key="loan.id" class="list-group-item">
          <RouterLink :to="`/ahorros/prestamos/${loan.id}`" class="text-decoration-none text-body">
            <div class="d-flex justify-content-between align-items-center gap-2">
              <div class="fw-semibold"><i class="bi bi-cash-coin me-2"></i>{{ loan.persona }}</div>
              <span class="badge text-bg-warning">Activo</span>
            </div>
            <div class="d-flex justify-content-between text-muted small mt-1">
              <span>Prestado: {{ formatMoney(loan.principalAmount, loan.currency) }}</span>
              <span class="fw-semibold text-danger">Faltan {{ formatMoney(faltante(loan), loan.currency) }}</span>
            </div>
          </RouterLink>
        </li>
      </ul>

      <template v-if="returnedLoans.length > 0">
        <h2 class="h6 mb-2">Devueltos</h2>
        <ul class="list-group">
          <li v-for="loan in returnedLoans" :key="loan.id" class="list-group-item">
            <RouterLink :to="`/ahorros/prestamos/${loan.id}`" class="text-decoration-none text-body">
              <div class="d-flex justify-content-between align-items-center gap-2">
                <div class="fw-semibold"><i class="bi bi-cash-coin me-2"></i>{{ loan.persona }}</div>
                <span class="badge text-bg-success">Devuelto</span>
              </div>
              <div class="text-muted small mt-1">
                Prestado: {{ formatMoney(loan.principalAmount, loan.currency) }}
              </div>
            </RouterLink>
          </li>
        </ul>
      </template>
    </template>
  </template>
</template>
