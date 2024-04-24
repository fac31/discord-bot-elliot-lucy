function timeFormatter(startTime, endTime) {
  function convertTo24Hour(time12h) {
    const [time, period] = time12h.split(/(?<=\d)(am|pm)/i);
    if (!time || !period) {
      throw new Error(
        "Invalid time format. Please provide time in the format '1:30am' or '2:40pm'."
      );
    }
    let [hours, minutes] = time.split(":");
    hours = parseInt(hours);
    minutes = parseInt(minutes);
    if (period.toLowerCase() === "pm" && hours !== 12) {
      hours += 12;
    } else if (period.toLowerCase() === "am" && hours === 12) {
      hours = 0;
    }
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }

  function convertToISOTime(time12h) {
    const [hours, minutes] = convertTo24Hour(time12h).split(":");
    return `${hours}:${minutes}:00`;
  }

  function getTimeInISOFormat(startTime, endTime) {
    const startISOTime = convertToISOTime(startTime);
    const endISOTime = convertToISOTime(endTime);
    return { startTimeISO: startISOTime, endTimeISO: endISOTime };
  }

  return getTimeInISOFormat(startTime, endTime);
}

module.exports = timeFormatter;
