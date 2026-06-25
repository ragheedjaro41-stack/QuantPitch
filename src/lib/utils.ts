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
  switch (position) {
    case "GK": return "#fbbf24";
    case "DEF":
    case "CB":
    case "RB":
    case "LB":
      return "#3b82f6";
    case "MID":
    case "CM":
    case "CDM":
    case "CAM":
    case "AM":
      return "#10B981";
    case "FWD":
    case "RW":
    case "LW":
    case "ST":
    case "CF":
      return "#f87171";
    default: return "#64748b";
  }
}

export function positionGroup(position: string): string {
  switch (position) {
    case "GK": return "Goalkeeper";
    case "DEF":
    case "CB":
    case "RB":
    case "LB":
      return "Defender";
    case "MID":
    case "CM":
    case "CDM":
    case "CAM":
      return "Midfielder";
    case "FWD":
    case "RW":
    case "LW":
    case "ST":
    case "CF":
      return "Forward";
    default: return position;
  }
}

export function positionLabel(position: string): string {
  switch (position) {
    case "GK": return "Goalkeeper";
    case "DEF": return "Defender";
    case "MID": return "Midfielder";
    case "FWD": return "Forward";
    case "SUB": return "Substitute";
    default: return position;
  }
}

export function ratingColor(rating: number): string {
  if (rating >= 8.0) return "#10B981";
  if (rating >= 7.0) return "#00D4FF";
  if (rating >= 6.0) return "#fbbf24";
  return "#f87171";
}
