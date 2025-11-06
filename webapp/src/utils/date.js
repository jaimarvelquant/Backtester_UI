export function dateStringToLong(dateString) {
    if (!dateString)
        return null;
    const sanitized = dateString.replaceAll('-', '');
    if (sanitized.length < 8)
        return null;
    return Number.parseInt(sanitized.substring(2, 8), 10);
}
export function timeStringToLong(timeString) {
    if (!timeString)
        return null;
    const sanitized = timeString.replaceAll(':', '');
    return Number.parseInt(sanitized, 10);
}
export function dateLongToString(dateLong) {
    if (dateLong === null || dateLong === undefined)
        return null;
    const value = String(dateLong).padStart(6, '0');
    return `20${value.substring(0, 2)}-${value.substring(2, 4)}-${value.substring(4, 6)}`;
}
export function dateLongToDisplay(dateLong) {
    if (dateLong === null || dateLong === undefined)
        return null;
    const value = String(dateLong).padStart(6, '0');
    return `${value.substring(4, 6)}-${value.substring(2, 4)}-20${value.substring(0, 2)}`;
}
export function timeLongToString(timeLong) {
    if (timeLong === null || timeLong === undefined)
        return null;
    const value = String(timeLong);
    if (value.length === 3 || value.length === 5) {
        return `0${value.substring(0, 1)}:${value.substring(1, 3)}`;
    }
    return `${value.substring(0, 2)}:${value.substring(2, 4)}`;
}
export function formatIsoDateTime(iso) {
    if (!iso)
        return null;
    return iso.replace('T', ' ');
}
