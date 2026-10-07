import { getCurrentMinutesInIST } from './productAvailability';

export function isStoreCurrentlyOpen(
  isStoreOpenSetting: boolean | undefined = true,
  openingTime?: string,
  closingTime?: string
): boolean {
  if (isStoreOpenSetting === false) return false;
  if (!openingTime || !closingTime) return true;

  try {
    // Store hours are in IST regardless of the customer's device timezone
    const currentMinutes = getCurrentMinutesInIST();

    const [openH, openM] = openingTime.split(':').map(Number);
    const [closeH, closeM] = closingTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (openMinutes <= closeMinutes) {
      return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    } else {
      // Overnight (e.g. 18:00 to 02:00)
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    }
  } catch (e) {
    return true;
  }
}
