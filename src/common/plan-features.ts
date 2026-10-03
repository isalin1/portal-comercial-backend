export type PlanFlags = {
  showProducts: boolean
  whatsappButton: boolean
  showPhone: boolean
  operatorOrders: boolean
  clientOrders: boolean
  daySummary: boolean
  agenda: boolean
}

const legacyPlan: PlanFlags = {
  showProducts: true,
  whatsappButton: true,
  showPhone: false,
  operatorOrders: true,
  clientOrders: true,
  daySummary: true,
  agenda: true,
}

export type PlanLevel = Partial<PlanFlags> & {
  price?: unknown
  days?: number | null
}

export function planPower(plan?: Partial<PlanFlags> | null) {
  if (!plan) return 0
  return (
    (plan.showProducts ? 1 : 0) +
    (plan.whatsappButton ? 1 : 0) +
    (plan.operatorOrders ? 2 : 0) +
    (plan.agenda ? 2 : 0) +
    (plan.clientOrders ? 4 : 0) +
    (plan.daySummary ? 4 : 0)
  )
}

export function comparePlans(current?: PlanLevel | null, next?: PlanLevel | null) {
  const left = planPower(current)
  const right = planPower(next)
  if (right !== left) return right > left ? 'superior' : 'inferior'
  const leftPrice = Number(String(current?.price ?? 0))
  const rightPrice = Number(String(next?.price ?? 0))
  if (rightPrice !== leftPrice) return rightPrice > leftPrice ? 'superior' : 'inferior'
  const leftDays = Number(current?.days || 0)
  const rightDays = Number(next?.days || 0)
  if (rightDays !== leftDays) return rightDays > leftDays ? 'superior' : 'inferior'
  return 'igual'
}

export function planFlags(plan?: Partial<PlanFlags> | null): PlanFlags {
  if (!plan) return legacyPlan
  return {
    showProducts: Boolean(plan.showProducts),
    whatsappButton: Boolean(plan.whatsappButton),
    showPhone: Boolean(plan.showPhone),
    operatorOrders: Boolean(plan.operatorOrders),
    clientOrders: Boolean(plan.clientOrders),
    daySummary: Boolean(plan.daySummary),
    agenda: Boolean(plan.agenda),
  }
}
