export function isStoreCurrentlyOpen(
  isStoreOpenSetting: boolean,
  openingTime: string,
  closingTime: string
): boolean {
  if (!isStoreOpenSetting) return false;
  if (!openingTime || !closingTime) return true;

  try {
    const now = new Date();
    // Use current hours and minutes
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

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
