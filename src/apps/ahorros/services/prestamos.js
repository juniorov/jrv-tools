import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { addAccountMovement, deleteAccountMovement } from '@/apps/ahorros/services/movimientos'

const loansRef = collection(db, 'ahorros_loans')

function currentUid() {
  const uid = useAuthStore().user?.uid
  if (!uid) throw new Error('No hay sesión activa')
  return uid
}

// Se ordena en cliente para no requerir un índice compuesto de Firestore.
export async function getLoans() {
  const uid = currentUid()
  const snapshot = await getDocs(query(loansRef, where('ownerId', '==', uid)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.persona.localeCompare(b.persona))
}

export async function getLoan(loanId) {
  const snapshot = await getDoc(doc(db, 'ahorros_loans', loanId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function getLoanRepayments(loanId) {
  const repaymentsRef = collection(db, 'ahorros_loans', loanId, 'repayments')
  const snapshot = await getDocs(query(repaymentsRef, orderBy('date', 'desc')))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Crea un préstamo: registra el egreso en la cuenta de origen (como cualquier otro movimiento,
 * espejado al objetivo vinculado si se pasa `sourceGoalId` — ver `addAccountMovement`) y guarda
 * la metadata propia del préstamo (contraparte, monto, estado) encima de ese movimiento.
 */
export async function createLoan({
  persona,
  principalAmount,
  description = null,
  date,
  sourceAccountId,
  sourceGoalId = null,
  currency,
  allowOverdraft = false,
}) {
  const uid = currentUid()
  const sourceMovementId = await addAccountMovement(sourceAccountId, {
    type: 'egreso',
    amount: principalAmount,
    description: description || `Préstamo a ${persona}`,
    date,
    goalId: sourceGoalId,
    persona,
    allowOverdraft,
  })

  const docRef = doc(loansRef)
  await setDoc(docRef, {
    ownerId: uid,
    persona,
    principalAmount,
    amountRepaid: 0,
    status: 'activo',
    description,
    date,
    currency,
    sourceAccountId,
    sourceGoalId,
    sourceMovementId,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

/**
 * Registra una devolución (total o parcial): crea el ingreso correspondiente en la cuenta de
 * origen (espejado al mismo objetivo vinculado, si aplica) y acumula `amountRepaid`. El préstamo
 * pasa a `devuelto` automáticamente en cuanto lo devuelto alcanza el principal.
 */
export async function addRepayment(loanId, { amount, date, allowOverdraft = false }) {
  const loan = await getLoan(loanId)
  if (!loan) throw new Error('El préstamo no existe')

  const accountMovementId = await addAccountMovement(loan.sourceAccountId, {
    type: 'ingreso',
    amount,
    description: `Devolución de préstamo — ${loan.persona}`,
    date,
    goalId: loan.sourceGoalId,
    persona: loan.persona,
    allowOverdraft,
  })

  const repaymentRef = doc(collection(db, 'ahorros_loans', loanId, 'repayments'))
  const newAmountRepaid = loan.amountRepaid + amount
  const batch = writeBatch(db)
  batch.set(repaymentRef, {
    amount,
    date,
    accountMovementId,
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, 'ahorros_loans', loanId), {
    amountRepaid: newAmountRepaid,
    status: newAmountRepaid >= loan.principalAmount ? 'devuelto' : 'activo',
  })
  await batch.commit()

  return repaymentRef.id
}

/** Cierra manualmente el préstamo (ej. se condona el faltante, o se cerró sin registrar el último pago exacto). */
export async function markAsReturned(loanId) {
  await updateDoc(doc(db, 'ahorros_loans', loanId), { status: 'devuelto' })
}

export async function reopenLoan(loanId) {
  await updateDoc(doc(db, 'ahorros_loans', loanId), { status: 'activo' })
}

/**
 * Elimina el préstamo revirtiendo su efecto: borra el movimiento de egreso original y el de cada
 * devolución (cada uno revierte su propio saldo de cuenta y espejo de objetivo vía
 * `deleteAccountMovement`), y luego el documento del préstamo junto con su historial.
 */
export async function deleteLoan(loanId) {
  const loan = await getLoan(loanId)
  if (!loan) return

  const repaymentsRef = collection(db, 'ahorros_loans', loanId, 'repayments')
  const repaymentsSnapshot = await getDocs(repaymentsRef)

  for (const repaymentDoc of repaymentsSnapshot.docs) {
    const { accountMovementId } = repaymentDoc.data()
    await deleteAccountMovement(loan.sourceAccountId, accountMovementId)
  }
  await deleteAccountMovement(loan.sourceAccountId, loan.sourceMovementId)

  const docs = repaymentsSnapshot.docs
  for (let i = 0; i < docs.length; i += 499) {
    const batch = writeBatch(db)
    docs.slice(i, i + 499).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }

  await deleteDoc(doc(db, 'ahorros_loans', loanId))
}
