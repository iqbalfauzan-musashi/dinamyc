// TimeUtils.js - Contains time-related utility functions

// Convert database time to display time without timezone conversion
export const parseDbTime = (dateString) => {
  if (!dateString) return new Date()

  try {
    // Handle different date formats - some might come as ISO strings
    if (dateString.includes('T')) {
      const date = new Date(dateString)
      return date
    }

    // Parse database timestamp exactly as received, without timezone conversion
    const parts = dateString.split(' ')
    // If we can't split the string properly, return current date
    if (!parts || parts.length < 2) return new Date()

    const datePart = parts[0]
    const timePart = parts[1]

    // If we don't have date or time part, return current date
    if (!datePart || !timePart) return new Date()

    const [year, month, day] = datePart.split('-').map(Number)

    // Handle time part which might include milliseconds
    const timeComponents = timePart.split('.')
    const [hours, minutes, seconds] = timeComponents[0].split(':').map(Number)

    // Create a local date with the exact components from database
    const date = new Date()
    date.setFullYear(year)
    date.setMonth(month - 1) // JavaScript months are 0-based
    date.setDate(day)
    date.setHours(hours)
    date.setMinutes(minutes)
    date.setSeconds(seconds)

    // If there are milliseconds, set them
    if (timeComponents.length > 1) {
      const ms = parseInt(timeComponents[1], 10)
      if (!isNaN(ms)) {
        date.setMilliseconds(ms)
      }
    }

    return date
  } catch (error) {
    console.error('Error parsing date:', error, 'for dateString:', dateString)
    return new Date()
  }
}

// Check if shift has started based on current time
export const hasShiftStarted = (shiftStartHour, currentHour, currentMinute) => {
  const startHour = parseInt(shiftStartHour.split(':')[0], 10)
  return currentHour > startHour || (currentHour === startHour && currentMinute >= 0)
}

// Determine if current time is within production hours (starting at standardStartTime)
export const isWithinProductionHours = (currentHour, standardStartTime) => {
  return currentHour >= standardStartTime
}

// Function to determine if a time is within a shift's range
export const isTimeInShift = (hour, minutes, shiftStart, shiftEnd) => {
  const timeDecimal = hour + minutes / 60
  const startHour = parseInt(shiftStart.split(':')[0], 10)
  const endHour = parseInt(shiftEnd.split(':')[0], 10)
  // Handle shifts that cross midnight
  if (endHour < startHour) {
    return timeDecimal >= startHour || timeDecimal < endHour
  } else {
    return timeDecimal >= startHour && timeDecimal < endHour
  }
}

// Helper function to calculate position on timeline for a given time
export const calculateTimePosition = (hour, minute, shiftStartHour, shiftEndHour, totalHours) => {
  // Convert hour and minute to decimal hours
  const timeDecimal = hour + minute / 60
  // Handle shifts that cross midnight
  let hoursPassed
  if (shiftEndHour < shiftStartHour) {
    // Shift crosses midnight
    if (timeDecimal >= shiftStartHour) {
      // Time is after shift start but before midnight
      hoursPassed = timeDecimal - shiftStartHour
    } else {
      // Time is after midnight but before shift end
      hoursPassed = 24 - shiftStartHour + timeDecimal
    }
  } else {
    // Regular shift within same day
    hoursPassed = timeDecimal - shiftStartHour
  }
  // Calculate shift length in hours
  const shiftLength =
    shiftEndHour < shiftStartHour
      ? 24 - shiftStartHour + shiftEndHour
      : shiftEndHour - shiftStartHour
  // Calculate position as percentage of shift length
  return Math.min(100, Math.max(0, (hoursPassed / shiftLength) * 100))
}

// Helper function to calculate current time position for the active shift
export const calculateCurrentTimePosition = (
  hour,
  minute,
  shiftStartHour,
  shiftEndHour,
  totalHours,
) => {
  return calculateTimePosition(hour, minute, shiftStartHour, shiftEndHour, totalHours)
}

// Format time for display according to backend format
export const formatDbTime = (date) => {
  if (!date) return ''
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}
