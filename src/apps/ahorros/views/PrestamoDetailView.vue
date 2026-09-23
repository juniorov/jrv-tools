<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  addRepayment,
  deleteLoan,
  getLoan,
  getLoanRepayments,
  markAsReturned,
  reopenLoan,
  updateLoan,
} from '@/apps/ahorros/services/prestamos'
import { getAccount } from '@/apps/ahorros/services/cuentas'
import { getGoal, getGoals } from '@/apps/ahorros/services/objetivos'
import PersonaAutocomplete from '@/apps/ahorros/components/PersonaAutocomplete.vue'
import { formatMoney } from '@/apps/ahorros/utils/currency'
import { formatDate, todayInputValue } from '@/apps/ahorros/utils/dates'
import { extractDistinctPersonas } from '@/apps/ahorros/utils/persons'

const route = useRoute()
const router = useRouter()
const loanId = route.params.id

const loan = ref(null)
const repayments = ref([])
const account = ref(null)
const goal = ref(null)
const goals = ref([])
const loading = ref(true)

const repaymentAmount = ref(null)
const repaymentDate = ref(todayInputValue())
const repaymentAllowOverdraft = ref(false)
const repaymentError = ref('')

const editingLoan = ref(false)
const editPersona = ref('')
const editPrincipalAmount = ref(null)
const editDescription = ref('')
const editDate = ref('')
const editSourceGoalId = ref('')
const editAllowOverdraft = ref(false)
const editLoanError = ref('')
const personaSuggestions = computed(() => extractDistinctPersonas(loan.value ? [{ persona: loan.value.persona }] : []))

const faltante = computed(() => (loan.value ? Math.max(0, loan.value.principalAmount - loan.value.amountRepaid) : 0))
const progressPct = computed(() =>
  loan.value ? Math.min(100, Math.round((loan.value.amountRepaid / loan.value.principalAmount) * 100)) : 0,
)
const isReturned = computed(() => loan.value?.status === 'devuelto')

async function loadAll() {
  loading.value = true
  const loanResult = await getLoan(loanId)
  loan.value = loanResult
  if (loanResult) {
    const [repaymentsResult, accountResult, goalResult, goalsResult] = await Promise.all([
      getLoanRepayments(loanId),
      getAccount(loanResult.sourceAccountId),
      loanResult.sourceGoalId ? getGoal(loanResult.sourceGoalId) : Promise.resolve(null),
      getGoals(),
    ])
    repayments.value = repaymentsResult
    account.value = accountResult
    goal.value = goalResult
    goals.value = goalsResult
  }
  loading.value = false
}

function startEditLoan() {
  editPersona.value = loan.value.persona
  editPrincipalAmount.value = loan.value.principalAmount
  editDescription.value = loan.value.description ?? ''
  editDate.value = loan.value.date
  editSourceGoalId.value = loan.value.sourceGoalId ?? ''
  editAllowOverdraft.value = false
  editLoanError.value = ''
  editingLoan.value = true
}

function cancelEditLoan() {
  editingLoan.value = false
}

async function saveEditLoan() {
  editLoanError.value = ''
  if (!editPersona.value.trim()) {
    editLoanError.value = 'Ingresa a quién le prestaste.'
    return
  }
  const amount = Number(editPrincipalAmount.value)
  if (!editPrincipalAmount.value || amount <= 0) {
    editLoanError.value = 'Ingresa un monto mayor a 0.'
    return
  }
  try {
    await updateLoan(loanId, {
      persona: editPersona.value.trim(),
      principalAmount: amount,
      description: editDescription.value.trim() || null,
      date: editDate.value,
      sourceGoalId: editSourceGoalId.value || null,
      allowOverdraft: editAllowOverdraft.value,
    })
    editingLoan.value = false
    await loadAll()
  } catch (err) {
    editLoanError.value = err.message
  }
}

async function handleAddRepayment() {
  repaymentError.value = ''
  const amount = Number(repaymentAmount.value)
  if (!repaymentAmount.value || amount <= 0) {
    repaymentError.value = 'Ingresa un monto mayor a 0.'
    return
  }
  try {
    await addRepayment(loanId, {
      amount,
      date: repaymentDate.value,
      allowOverdraft: repaymentAllowOverdraft.value,
    })
    repaymentAmount.value = null
    repaymentAllowOverdraft.value = false
    await loadAll()
  } catch (err) {
    repaymentError.value = err.message
  }
}

async function handleMarkAsReturned() {
  await markAsReturned(loanId)
  await loadAll()
}

async function handleReopen() {
  await reopenLoan(loanId)
  await loadAll()
}

async function handleDelete() {
  if (!confirm(`¿Eliminar el préstamo a "${loan.value.persona}"? Esto revierte el saldo de la cuenta y del objetivo vinculado.`))
    return
  await deleteLoan(loanId)
  router.push({ name: 'ahorros-prestamos' })
}

onMounted(loadAll)
</script>

<template>
  <div v-if="loading" class="text-muted">Cargando…</div>
  <template v-else-if="loan">
    <div v-if="editingLoan" class="card shadow-sm border-0 mb-3">
      <div class="card-body">
        <form class="row g-2 align-items-end" @submit.prevent="saveEditLoan">
          <div class="col-12 col-sm-4">
            <label class="form-label">A quién le prestas</label>
            <PersonaAutocomplete v-model="editPersona" :suggestions="personaSuggestions" />
          </div>
          <div class="col-6 col-sm-2">
            <label class="form-label">Monto</label>
            <input v-model="editPrincipalAmount" type="number" step="0.01" min="0.01" class="form-control" required />
          </div>
          <div class="col-6 col-sm-3">
            <label class="form-label">Objetivo vinculado (opcional)</label>
            <select v-model="editSourceGoalId" class="form-select">
              <option value="">Ninguno</option>
              <option v-for="g in goals" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div class="col-6 col-sm-3">
            <label class="form-label">Fecha</label>
            <input v-model="editDate" type="date" class="form-control" required />
          </div>
          <div class="col-12 col-sm-6">
            <label class="form-label">Descripción (opcional)</label>
            <input v-model="editDescription" type="text" class="form-control" />
          </div>
          <div class="col-12 col-sm-3 d-flex align-items-center">
            <div class="form-check">
              <input
                id="edit-loan-overdraft"
                v-model="editAllowOverdraft"
                type="checkbox"
                class="form-check-input"
              />
              <label class="form-check-label" for="edit-loan-overdraft">Permitir descubierto</label>
            </div>
          </div>
          <div class="col-12 d-flex gap-2 justify-content-end">
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="cancelEditLoan">
              Cancelar
            </button>
            <button type="submit" class="btn btn-sm btn-success">Guardar</button>
          </div>
          <div v-if="editLoanError" class="col-12">
            <div class="alert alert-danger py-2 mb-0">{{ editLoanError }}</div>
          </div>
        </form>
      </div>
    </div>
    <div v-else class="d-flex justify-content-between align-items-center mb-1">
      <h1 class="h4 mb-0"><i class="bi bi-cash-coin me-2"></i>{{ loan.persona }}</h1>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" title="Editar préstamo" @click="startEditLoan">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" title="Eliminar préstamo" @click="handleDelete">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
    <div v-if="!editingLoan" class="text-muted small mb-3">
      Desde {{ account?.name ?? '—' }}
      <template v-if="goal">· vinculado al objetivo "{{ goal.name }}"</template>
      · {{ formatDate(loan.date) }}
      <template v-if="loan.description">· {{ loan.description }}</template>
    </div>

    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body text-center">
        <span class="badge mb-2" :class="isReturned ? 'text-bg-success' : 'text-bg-warning'">
          {{ isReturned ? 'Devuelto' : 'Activo' }}
        </span>
        <div class="text-muted small">Prestado</div>
        <div class="display-6 fw-bold text-primary">{{ formatMoney(loan.principalAmount, loan.currency) }}</div>
        <div class="text-muted small mt-1">Devuelto: {{ formatMoney(loan.amountRepaid, loan.currency) }}</div>
        <div class="progress mt-2" style="height: 0.5rem">
          <div class="progress-bar" :style="{ width: progressPct + '%' }"></div>
        </div>
        <div class="small mt-1" :class="faltante > 0 ? 'text-muted' : 'text-success fw-semibold'">
          <template v-if="faltante > 0">
            Falta {{ formatMoney(faltante, loan.currency) }} por devolver
          </template>
          <template v-else>
            <i class="bi bi-check-circle-fill me-1"></i>Préstamo completamente devuelto
          </template>
        </div>
        <div class="mt-3">
          <button v-if="!isReturned" class="btn btn-sm btn-success" @click="handleMarkAsReturned">
            Marcar como devuelto
          </button>
          <button v-else class="btn btn-sm btn-outline-secondary" @click="handleReopen">
            Reabrir préstamo
          </button>
        </div>
      </div>
    </div>

    <div v-if="!isReturned" class="card shadow-sm border-0 mb-4">
      <div class="card-body">
        <h2 class="h6 mb-3">Registrar devolución</h2>
        <form class="row g-2 align-items-end" @submit.prevent="handleAddRepayment">
          <div class="col-6 col-sm-4">
            <label class="form-label">Monto</label>
            <input v-model="repaymentAmount" type="number" step="0.01" min="0.01" class="form-control" required />
          </div>
          <div class="col-6 col-sm-4">
            <label class="form-label">Fecha</label>
            <input v-model="repaymentDate" type="date" class="form-control" required />
          </div>
          <div class="col-12 col-sm-2 d-flex align-items-center">
            <div class="form-check">
              <input
                id="repayment-overdraft"
                v-model="repaymentAllowOverdraft"
                type="checkbox"
                class="form-check-input"
              />
              <label class="form-check-label" for="repayment-overdraft">Descubierto</label>
            </div>
          </div>
          <div class="col-12 col-sm-2">
            <button type="submit" class="btn btn-primary w-100">Registrar</button>
          </div>
          <div v-if="repaymentError" class="col-12">
            <div class="alert alert-danger py-2 mb-0">{{ repaymentError }}</div>
          </div>
        </form>
      </div>
    </div>

    <h2 class="h6 mb-2">Historial de devoluciones</h2>
    <div v-if="repayments.length === 0" class="text-muted">Aún no hay devoluciones registradas.</div>
    <ul v-else class="list-group">
      <li v-for="repayment in repayments" :key="repayment.id" class="list-group-item d-flex justify-content-between align-items-center">
        <div class="text-muted small">{{ formatDate(repayment.date) }}</div>
        <div class="fw-semibold text-success">+{{ formatMoney(repayment.amount, loan.currency) }}</div>
      </li>
    </ul>
  </template>
  <div v-else class="alert alert-danger">No se encontró el préstamo.</div>
</template>
