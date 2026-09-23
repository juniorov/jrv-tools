import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'

// NOTA IMPORTANTE sobre offline: este archivo NO usa runTransaction(). Firestore documenta
// explícitamente que las transacciones requieren conexión activa (leen el estado real del
// servidor) y fallan sin conexión — lo cual rompía por completo el registro de movimientos
// offline, el uso más común de la app. En su lugar se lee el saldo con un getDoc() normal
// (que sí resuelve desde la caché local sin conexión) solo para la validación de "descubierto",
// y el saldo se actualiza con increment() dentro de un writeBatch, que si no hay conexión queda
// encolado y se sincroniza solo cuando vuelve el internet (igual que cualquier otro write del
// suite). El costo: la validación de saldo negativo es "best effort" contra el último saldo
// que la app tenía cargado, no contra el valor más reciente del servidor si hay ediciones
// concurrentes desde otro dispositivo — aceptable para una app personal/familiar de bajo tráfico.

function currentUid() {
  const uid = useAuthStore().user?.uid
  if (!uid) throw new Error('No hay sesión activa')
  return uid
}

export async function getAccountMovements(accountId) {
  const movementsRef = collection(db, 'ahorros_accounts', accountId, 'movements')
  const snapshot = await getDocs(query(movementsRef, orderBy('date', 'desc')))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Registra un ingreso/egreso en una cuenta y actualiza su saldo. Si viene `goalId`, además
 * escribe un movimiento espejo en el objetivo (sin exponer la cuenta a colaboradores:
 * `accountId` solo queda visible en el documento privado de la cuenta, el espejo del objetivo
 * nunca lo incluye).
 *
 * Por defecto un egreso no puede dejar el saldo negativo; `allowOverdraft` lo permite
 * para el caso real de registrar el egreso antes que el ingreso correspondiente.
 */
export async function addAccountMovement(
  accountId,
  { type, amount, description, date, goalId = null, persona = null, allowOverdraft = false },
) {
  const uid = currentUid()
  const accountRef = doc(db, 'ahorros_accounts', accountId)
  const movementRef = doc(collection(accountRef, 'movements'))
  const goalMovementRef = goalId ? doc(collection(db, 'ahorros_goals', goalId, 'movements')) : null
  const delta = type === 'ingreso' ? amount : -amount

  const accountSnap = await getDoc(accountRef)
  if (!accountSnap.exists()) throw new Error('La cuenta no existe')
  const currentBalance = accountSnap.data().balance ?? 0
  if (currentBalance + delta < 0 && !allowOverdraft) {
    throw new Error('El egreso deja la cuenta en negativo. Marca "permitir descubierto" si es intencional.')
  }

  const batch = writeBatch(db)
  batch.update(accountRef, { balance: increment(delta) })
  batch.set(movementRef, {
    type,
    amount,
    description,
    date,
    goalId,
    persona,
    // Referencia al movimiento espejo del objetivo, para poder editarlo/borrarlo en conjunto.
    goalMovementId: goalMovementRef?.id ?? null,
    createdAt: serverTimestamp(),
  })
  if (goalId) {
    batch.set(goalMovementRef, {
      type,
      amount,
      description,
      date,
      persona,
      accountId,
      createdBy: uid,
      createdAt: serverTimestamp(),
    })
  }
  await batch.commit()

  return movementRef.id
}

/**
 * Edita un movimiento de cuenta ya registrado, recalculando el saldo de la cuenta (se revierte
 * el efecto del monto/tipo anterior y se aplica el nuevo). El vínculo a objetivo también se
 * puede cambiar desde aquí (vincular uno nuevo, cambiarlo por otro, o desvincularlo): si cambia,
 * se borra el espejo viejo (si había) y se crea uno nuevo (si corresponde); si el objetivo
 * vinculado es el mismo de antes, su espejo solo se actualiza con los datos nuevos.
 */
export async function updateAccountMovement(
  accountId,
  movementId,
  { type, amount, description, date, goalId = null, persona = null, allowOverdraft = false },
) {
  const accountRef = doc(db, 'ahorros_accounts', accountId)
  const movementRef = doc(accountRef, 'movements', movementId)

  const [accountSnap, movementSnap] = await Promise.all([getDoc(accountRef), getDoc(movementRef)])
  if (!accountSnap.exists()) throw new Error('La cuenta no existe')
  if (!movementSnap.exists()) throw new Error('El movimiento no existe')

  const oldMovement = movementSnap.data()
  const oldDelta = oldMovement.type === 'ingreso' ? oldMovement.amount : -oldMovement.amount
  const newDelta = type === 'ingreso' ? amount : -amount
  const currentBalance = accountSnap.data().balance ?? 0
  if (currentBalance - oldDelta + newDelta < 0 && !allowOverdraft) {
    throw new Error('El cambio deja la cuenta en negativo. Marca "permitir descubierto" si es intencional.')
  }

  const oldGoalId = oldMovement.goalId ?? null
  const oldGoalMovementId = oldMovement.goalMovementId ?? null

  const batch = writeBatch(db)
  batch.update(accountRef, { balance: increment(newDelta - oldDelta) })

  if (oldGoalId === goalId) {
    batch.update(movementRef, { type, amount, description, date, persona: goalId ? persona : null })
    if (goalId && oldGoalMovementId) {
      batch.update(doc(db, 'ahorros_goals', goalId, 'movements', oldGoalMovementId), {
        type,
        amount,
        description,
        date,
        persona,
      })
    }
  } else {
    if (oldGoalId && oldGoalMovementId) {
      batch.delete(doc(db, 'ahorros_goals', oldGoalId, 'movements', oldGoalMovementId))
    }
    let newGoalMovementId = null
    if (goalId) {
      const uid = currentUid()
      const newGoalMovementRef = doc(collection(db, 'ahorros_goals', goalId, 'movements'))
      newGoalMovementId = newGoalMovementRef.id
      batch.set(newGoalMovementRef, {
        type,
        amount,
        description,
        date,
        persona,
        accountId,
        createdBy: uid,
        createdAt: serverTimestamp(),
      })
    }
    batch.update(movementRef, {
      type,
      amount,
      description,
      date,
      goalId,
      goalMovementId: newGoalMovementId,
      persona: goalId ? persona : null,
    })
  }
  await batch.commit()
}

/**
 * "Materializa" un aporte que se había registrado directo en un objetivo (sin cuenta, ej. plata
 * en efectivo) convirtiéndolo en un movimiento real de la cuenta elegida, sin duplicarlo: no
 * crea un movimiento nuevo en el objetivo, sino que vincula (`accountId`) el mismo documento que
 * ya existía. Solo aplica a movimientos de objetivo que todavía no tengan `accountId`.
 */
export async function materializeGoalMovement(goalId, goalMovementId, accountId, allowOverdraft = false) {
  const goalMovementRef = doc(db, 'ahorros_goals', goalId, 'movements', goalMovementId)
  const accountRef = doc(db, 'ahorros_accounts', accountId)
  const accountMovementRef = doc(collection(accountRef, 'movements'))

  const [goalMovementSnap, accountSnap] = await Promise.all([getDoc(goalMovementRef), getDoc(accountRef)])
  if (!goalMovementSnap.exists()) throw new Error('El movimiento no existe')
  if (!accountSnap.exists()) throw new Error('La cuenta no existe')

  const goalMovement = goalMovementSnap.data()
  if (goalMovement.accountId) throw new Error('Este movimiento ya está vinculado a una cuenta')

  const delta = goalMovement.type === 'ingreso' ? goalMovement.amount : -goalMovement.amount
  const currentBalance = accountSnap.data().balance ?? 0
  if (currentBalance + delta < 0 && !allowOverdraft) {
    throw new Error('Esto deja la cuenta en negativo. Marca "permitir descubierto" si es intencional.')
  }

  const batch = writeBatch(db)
  batch.update(accountRef, { balance: increment(delta) })
  batch.set(accountMovementRef, {
    type: goalMovement.type,
    amount: goalMovement.amount,
    description: goalMovement.description ?? '',
    date: goalMovement.date,
    goalId,
    persona: goalMovement.persona ?? null,
    goalMovementId,
    createdAt: serverTimestamp(),
  })
  batch.update(goalMovementRef, { accountId })
  await batch.commit()

  return accountMovementRef.id
}

/** Elimina un movimiento de cuenta, revirtiendo su efecto en el saldo y en el objetivo vinculado. */
export async function deleteAccountMovement(accountId, movementId) {
  const accountRef = doc(db, 'ahorros_accounts', accountId)
  const movementRef = doc(accountRef, 'movements', movementId)

  const movementSnap = await getDoc(movementRef)
  if (!movementSnap.exists()) return

  const oldMovement = movementSnap.data()
  const oldDelta = oldMovement.type === 'ingreso' ? oldMovement.amount : -oldMovement.amount
  const goalId = oldMovement.goalId ?? null
  const goalMovementId = oldMovement.goalMovementId ?? null

  const batch = writeBatch(db)
  batch.update(accountRef, { balance: increment(-oldDelta) })
  batch.delete(movementRef)
  if (goalId && goalMovementId) {
    batch.delete(doc(db, 'ahorros_goals', goalId, 'movements', goalMovementId))
  }
  await batch.commit()
}

/**
 * Registra una transferencia entre dos cuentas propias: resta el monto de `fromAccountId`, lo
 * suma a `toAccountId`, y escribe un movimiento espejo en cada una (`transferencia_salida` /
 * `transferencia_entrada`) enlazados entre sí con `transferAccountId`/`transferMovementId`, igual
 * que el vínculo cuenta↔objetivo de arriba.
 */
export async function addTransfer(
  fromAccountId,
  toAccountId,
  { amount, description, date, allowOverdraft = false },
) {
  const fromAccountRef = doc(db, 'ahorros_accounts', fromAccountId)
  const toAccountRef = doc(db, 'ahorros_accounts', toAccountId)
  const fromMovementRef = doc(collection(fromAccountRef, 'movements'))
  const toMovementRef = doc(collection(toAccountRef, 'movements'))

  const fromAccountSnap = await getDoc(fromAccountRef)
  if (!fromAccountSnap.exists()) throw new Error('La cuenta de origen no existe')
  const currentBalance = fromAccountSnap.data().balance ?? 0
  if (currentBalance - amount < 0 && !allowOverdraft) {
    throw new Error(
      'La transferencia deja la cuenta de origen en negativo. Marca "permitir descubierto" si es intencional.',
    )
  }

  const batch = writeBatch(db)
  batch.update(fromAccountRef, { balance: increment(-amount) })
  batch.update(toAccountRef, { balance: increment(amount) })
  batch.set(fromMovementRef, {
    type: 'transferencia_salida',
    amount,
    description,
    date,
    goalId: null,
    persona: null,
    transferAccountId: toAccountId,
    transferMovementId: toMovementRef.id,
    createdAt: serverTimestamp(),
  })
  batch.set(toMovementRef, {
    type: 'transferencia_entrada',
    amount,
    description,
    date,
    goalId: null,
    persona: null,
    transferAccountId: fromAccountId,
    transferMovementId: fromMovementRef.id,
    createdAt: serverTimestamp(),
  })
  await batch.commit()

  return fromMovementRef.id
}

/**
 * Edita el monto/fecha/descripción de una transferencia ya registrada (no se puede cambiar la
 * cuenta contraparte ni la dirección). Recalcula el saldo de ambas cuentas y actualiza los dos
 * movimientos espejo.
 */
export async function updateTransfer(accountId, movementId, { amount, description, date, allowOverdraft = false }) {
  const accountRef = doc(db, 'ahorros_accounts', accountId)
  const movementRef = doc(accountRef, 'movements', movementId)

  const movementSnap = await getDoc(movementRef)
  if (!movementSnap.exists()) throw new Error('El movimiento no existe')
  const movement = movementSnap.data()
  const isOutgoing = movement.type === 'transferencia_salida'

  const otherAccountRef = doc(db, 'ahorros_accounts', movement.transferAccountId)
  const otherMovementRef = doc(otherAccountRef, 'movements', movement.transferMovementId)

  const fromAccountRef = isOutgoing ? accountRef : otherAccountRef
  const fromMovementRef = isOutgoing ? movementRef : otherMovementRef
  const toAccountRef = isOutgoing ? otherAccountRef : accountRef
  const toMovementRef = isOutgoing ? otherMovementRef : movementRef

  const fromAccountSnap = await getDoc(fromAccountRef)
  if (!fromAccountSnap.exists()) throw new Error('La cuenta de origen no existe')
  const currentBalance = fromAccountSnap.data().balance ?? 0
  if (currentBalance + movement.amount - amount < 0 && !allowOverdraft) {
    throw new Error(
      'El cambio deja la cuenta de origen en negativo. Marca "permitir descubierto" si es intencional.',
    )
  }

  const batch = writeBatch(db)
  batch.update(fromAccountRef, { balance: increment(movement.amount - amount) })
  batch.update(toAccountRef, { balance: increment(amount - movement.amount) })
  batch.update(fromMovementRef, { amount, description, date })
  batch.update(toMovementRef, { amount, description, date })
  await batch.commit()
}

/**
 * Elimina una transferencia, revirtiendo su efecto en el saldo de ambas cuentas y borrando los
 * dos movimientos espejo.
 */
export async function deleteTransfer(accountId, movementId) {
  const accountRef = doc(db, 'ahorros_accounts', accountId)
  const movementRef = doc(accountRef, 'movements', movementId)

  const movementSnap = await getDoc(movementRef)
  if (!movementSnap.exists()) return
  const movement = movementSnap.data()
  const isOutgoing = movement.type === 'transferencia_salida'

  const otherAccountRef = doc(db, 'ahorros_accounts', movement.transferAccountId)
  const otherMovementRef = doc(otherAccountRef, 'movements', movement.transferMovementId)
  const delta = isOutgoing ? movement.amount : -movement.amount

  const batch = writeBatch(db)
  batch.update(accountRef, { balance: increment(delta) })
  batch.update(otherAccountRef, { balance: increment(-delta) })
  batch.delete(movementRef)
  batch.delete(otherMovementRef)
  await batch.commit()
}
