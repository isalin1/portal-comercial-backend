const LIMA = 'America/Lima';

export function calendarDateInLima(value: Date = new Date()): Date {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: LIMA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
  const [year, month, day] = formatted.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function asCalendarDate(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

export function addCalendarDays(value: Date, days: number): Date {
  const next = asCalendarDate(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function nextVigenciaEnd(
  currentEnd: Date | null | undefined,
  days: number,
  now: Date = new Date(),
): Date {
  const base = currentEnd ? asCalendarDate(currentEnd) : calendarDateInLima(now);
  return addCalendarDays(base, days);
}

export function isVigente(
  vigenciaEnd?: Date | null,
  now: Date = new Date(),
): boolean {
  if (!vigenciaEnd) return false;
  return asCalendarDate(vigenciaEnd).getTime() >= calendarDateInLima(now).getTime();
}

export function locksToOneCategory(name: string) {
  return /profesional|alimento|comercio|servicio/i.test(name || '');
}

export function toWhatsAppUrl(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9) digits = `51${digits}`;
  return digits ? `whatsapp://send?phone=${digits}` : null;
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABEL: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  0: 'Dom',
};

function limaClock(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LIMA,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value || 'Sun';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  return { day: day < 0 ? 0 : day, minutes: hour * 60 + minute };
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function isOpenNow(
  opensAt?: string | null,
  closesAt?: string | null,
  openDays?: string | null,
  now: Date = new Date(),
): boolean | null {
  if (!opensAt || !closesAt || !openDays) return null;
  const days = openDays.split(',').map(Number);
  const clock = limaClock(now);
  if (!days.includes(clock.day)) return false;
  const open = toMinutes(opensAt);
  const close = toMinutes(closesAt);
  if (close === open) return false;
  if (close > open) return clock.minutes >= open && clock.minutes < close;
  return clock.minutes >= open || clock.minutes < close;
}

export function scheduleLabel(
  opensAt?: string | null,
  closesAt?: string | null,
  openDays?: string | null,
) {
  if (!opensAt || !closesAt || !openDays) return null;
  const selected = new Set(openDays.split(',').map(Number));
  const days = WEEK_ORDER.filter((day) => selected.has(day));
  if (!days.length) return null;
  const groups: number[][] = [];
  for (const day of days) {
    const last = groups[groups.length - 1];
    const previous = last?.[last.length - 1];
    if (
      last &&
      previous !== undefined &&
      WEEK_ORDER.indexOf(day) === WEEK_ORDER.indexOf(previous) + 1
    ) {
      last.push(day);
    } else {
      groups.push([day]);
    }
  }
  const daysLabel =
    days.length === 7
      ? 'Todos los días'
      : groups
          .map((group) =>
            group.length === 1
              ? DAY_LABEL[group[0]]
              : `${DAY_LABEL[group[0]]} a ${DAY_LABEL[group[group.length - 1]]}`,
          )
          .join(', ');
  return `${daysLabel}, ${opensAt} a ${closesAt}`;
}
