import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
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
import { deleteAccountMovement } from '@/apps/ahorros/services/movimientos'
import { resolveUidByEmail } from '@/apps/ahorros/services/userLookup'

const goalsRef = collection(db, 'ahorros_goals')

function currentUid() {
  const uid = useAuthStore().user?.uid
  if (!uid) throw new Error('No hay sesión activa')
  return uid
}

function currentEmail() {
  const email = useAuthStore().user?.email
  if (!email) throw new Error('No hay sesión activa')
  return email.toLowerCase()
}

// Se ordena en cliente para no requerir un índice compuesto de Firestore.
export async function getGoals() {
  const uid = currentUid()
  const snapshot = await getDocs(query(goalsRef, where('ownerId', '==', uid)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getGoal(goalId) {
  const snapshot = await getDoc(doc(db, 'ahorros_goals', goalId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function createGoal({ name, targetAmount = null, currency }) {
  const uid = currentUid()
  const docRef = doc(goalsRef)
  await setDoc(docRef, {
    ownerId: uid,
    name,
    targetAmount,
    currency,
    sharedWith: {},
    pendingInvites: {},
    // Denormalizados para poder filtrar en queries de lista: Firestore no puede validar de
    // forma segura contra las reglas un `where` sobre una clave dinámica de un mapa
    // (ej. `sharedWith.<uid> != null`), pero sí un `array-contains` sobre un campo plano.
    sharedWithUids: [],
    pendingInviteEmails: [],
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateGoal(goalId, { name, targetAmount, currency }) {
  await updateDoc(doc(db, 'ahorros_goals', goalId), { name, targetAmount, currency })
}

/**
 * Reemplaza el mapa completo de metas individuales por persona. Se reemplaza entero (en vez de
 * usar field-path dinámico tipo `personTargets.${persona}`) porque un nombre de persona con un
 * punto rompería ese path al anidarse como sub-mapa en Firestore.
 */
export async function setPersonTargets(goalId, personTargets) {
  await updateDoc(doc(db, 'ahorros_goals', goalId), { personTargets })
}

/** Elimina el objetivo y todo su historial de movimientos (solo el dueño puede hacerlo). */
export async function deleteGoal(goalId) {
  const movementsRef = collection(db, 'ahorros_goals', goalId, 'movements')
  const movementsSnapshot = await getDocs(movementsRef)

  // writeBatch admite máximo 500 operaciones; se parte en lotes por si el historial crece mucho.
  const docs = movementsSnapshot.docs
  for (let i = 0; i < docs.length; i += 499) {
    const batch = writeBatch(db)
    docs.slice(i, i + 499).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }

  await deleteDoc(doc(db, 'ahorros_goals', goalId))
}

export async function getGoalMovements(goalId) {
  const movementsRef = collection(db, 'ahorros_goals', goalId, 'movements')
  const snapshot = await getDocs(query(movementsRef, orderBy('date', 'desc')))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Elimina un aporte del objetivo y, si fue materializado, también revierte la cuenta. */
export async function deleteGoalMovement(goalId, movementId) {
  const movementRef = doc(db, 'ahorros_goals', goalId, 'movements', movementId)
  const movementSnap = await getDoc(movementRef)
  if (!movementSnap.exists()) return

  const movement = movementSnap.data()
  if (movement.accountId) {
    let accountMovementId = movement.accountMovementId
    if (!accountMovementId) {
      // Compatibilidad con aportes materializados antes de guardar accountMovementId.
      const accountMovements = await getDocs(
        collection(db, 'ahorros_accounts', movement.accountId, 'movements'),
      )
      accountMovementId = accountMovements.docs.find(
        (d) => d.data().goalMovementId === movementId,
      )?.id
    }
    if (!accountMovementId) {
      // Compatibilidad con la implementación anterior: guardaba accountId en el objetivo,
      // pero no creaba un movimiento real dentro de la cuenta.
      await deleteDoc(movementRef)
      return
    }
    await deleteAccountMovement(movement.accountId, accountMovementId)
    return
  }

  await deleteDoc(movementRef)
}

/** Objetivos que otra persona compartió conmigo (ya aceptados, no privados del dueño). */
export async function getSharedGoals() {
  const uid = currentUid()
  const snapshot = await getDocs(query(goalsRef, where('sharedWithUids', 'array-contains', uid)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Invitaciones pendientes dirigidas a mi email, todavía no aceptadas. */
export async function getPendingInvitesForMe() {
  const email = currentEmail()
  const snapshot = await getDocs(
    query(goalsRef, where('pendingInviteEmails', 'array-contains', email)),
  )
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Invita a alguien a un objetivo por email. Si ya inició sesión al menos una vez en el suite,
 * queda agregado directo a `sharedWith`; si no, la invitación queda pendiente y se auto-reclama
 * la próxima vez que esa persona inicie sesión y revise sus invitaciones.
 */
export async function inviteToGoal(goalId, email, role = 'editor') {
  const emailLower = email.trim().toLowerCase()
  const uid = await resolveUidByEmail(emailLower)
  if (uid) {
    await updateDoc(doc(db, 'ahorros_goals', goalId), {
      [`sharedWith.${uid}`]: role,
      sharedWithUids: arrayUnion(uid),
    })
  } else {
    await updateDoc(doc(db, 'ahorros_goals', goalId), {
      [`pendingInvites.${emailLower}`]: role,
      pendingInviteEmails: arrayUnion(emailLower),
    })
  }
}

/** El dueño quita acceso a un colaborador. */
export async function removeCollaborator(goalId, uid) {
  await updateDoc(doc(db, 'ahorros_goals', goalId), {
    [`sharedWith.${uid}`]: deleteField(),
    sharedWithUids: arrayRemove(uid),
  })
}

/** El invitado acepta su propia invitación pendiente (permitido por la regla de auto-reclamo). */
export async function claimInvite(goalId, role) {
  const uid = currentUid()
  const email = currentEmail()
  await updateDoc(doc(db, 'ahorros_goals', goalId), {
    [`sharedWith.${uid}`]: role,
    sharedWithUids: arrayUnion(uid),
    [`pendingInvites.${email}`]: deleteField(),
    pendingInviteEmails: arrayRemove(email),
  })
}

/**
 * Registra un aporte/retiro directo en el objetivo, sin pasar por ninguna cuenta bancaria
 * (ej. plata en efectivo que aún no se ha depositado, o un aporte que registra un colaborador
 * invitado que no tiene cuentas propias).
 */
export async function addGoalMovement(goalId, { type, amount, description, date, persona = null }) {
  const uid = currentUid()
  const movementRef = doc(collection(db, 'ahorros_goals', goalId, 'movements'))
  await setDoc(movementRef, {
    type,
    amount,
    description,
    date,
    persona,
    accountId: null,
    createdBy: uid,
    createdAt: serverTimestamp(),
  })
  return movementRef.id
}
