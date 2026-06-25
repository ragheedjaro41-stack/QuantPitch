export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function positionColor(position: string): string {
  if (position === "GK") return "#fbbf24";
  if (["CB", "RB", "LB"].includes(position)) return "#10B981";
  if (["CM", "CDM", "CAM", "AM"].includes(position)) return "#00D4FF";
  if (["RW", "LW", "ST", "CF"].includes(position)) return "#f87171";
  return "#a78bfa";
}

export function positionGroup(position: string): string {
  if (position === "GK") return "Goalkeeper";
  if (["CB", "RB", "LB"].includes(position)) return "Defender";
  if (["CM", "CDM", "CAM"].includes(position)) return "Midfielder";
  if (["RW", "LW", "ST", "CF"].includes(position)) return "Forward";
  return position;
}

export function ratingColor(rating: number): string {
  if (rating >= 8.0) return "#10B981";
  if (rating >= 7.0) return "#00D4FF";
  if (rating >= 6.0) return "#fbbf24";
  return "#f87171";
}
