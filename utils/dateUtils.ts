export function formatRelativeTime(dateMs: number): string {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - dateMs) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  const date = new Date(dateMs);
  const currentYear = new Date().getFullYear();
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  
  if (date.getFullYear() === currentYear) {
    return `${month} ${day}`;
  }
  
  return `${month} ${day}, ${date.getFullYear()}`;
}
