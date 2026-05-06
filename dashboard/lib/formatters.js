// Formats a date string to Indian Standard Time (IST)
export const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// Formats a time string for the last poll display
export const formatTime = (date) => {
  if (!date) return "—";
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
};

// Formats a kWh value to 2 decimal places

export const formatkWh = (value) => {
  return Number(value).toFixed(2);
};
