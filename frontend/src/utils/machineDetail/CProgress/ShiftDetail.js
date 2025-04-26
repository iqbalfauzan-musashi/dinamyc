import React, { useState, useEffect } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CAlert } from '@coreui/react'
import ShiftProgressBar from './ShiftProgressBar'
import { hasShiftStarted, isTimeInShift, isWithinProductionHours, parseDbTime } from './TimeUtils'
import {
  findLatestDataBeforeShift,
  calculateHourlyProduction,
  getAllData,
} from './ShiftCalculations'

const ShiftDetail = ({ shifts, selectedDate }) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [error, setError] = useState(null)

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  // Define the start time for all shifts (07:00)
  const standardStartTime = 7 // 7 AM

  // Parse the selected date
  const parsedSelectedDate = new Date(selectedDate)

  // Check if we're looking at historical data (not today)
  const isHistoricalView = () => {
    const today = new Date()
    return (
      parsedSelectedDate.getDate() !== today.getDate() ||
      parsedSelectedDate.getMonth() !== today.getMonth() ||
      parsedSelectedDate.getFullYear() !== today.getFullYear()
    )
  }

  // Get current hour for display
  const getCurrentHour = () => {
    return currentTime.getHours()
  }

  // Get current minute for display
  const getCurrentMinute = () => {
    return currentTime.getMinutes()
  }

  // Get all data across shifts - with error handling
  let allShiftData = []
  try {
    allShiftData = getAllData(shifts || [])
  } catch (err) {
    console.error('Error getting all shift data:', err)
    setError('Error processing shift data. Please try refreshing the page.')
  }

  return (
    <>
      <h2>Detail Production</h2>

      {error && (
        <CAlert color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}

      {(shifts || []).map((shift, index) => {
        try {
          // Get shift hours - ensure we're using the correct hours as defined in the data
          const shiftHours = shift.hours || [
            '07:00',
            '08:00',
            '09:00',
            '10:00',
            '11:00',
            '12:00',
            '13:00',
            '14:00',
          ]

          // Parse shift start and end hours
          const shiftStartHour = shiftHours[0]
          const shiftEndHour = shiftHours[shiftHours.length - 1]

          const startHourNum = parseInt(shiftStartHour.split(':')[0], 10)
          const endHourNum = parseInt(shiftEndHour.split(':')[0], 10)

          // For historical data, always show all shifts
          // For today's data, only show shifts that have started
          let shiftHasStarted = true
          if (!isHistoricalView()) {
            shiftHasStarted = hasShiftStarted(shiftStartHour, getCurrentHour(), getCurrentMinute())
          }

          // If shift hasn't started yet, don't render it
          if (!shiftHasStarted) {
            return null
          }

          // Determine if current time falls within this shift (only relevant for today)
          const currentHour = getCurrentHour()
          const currentMinute = getCurrentMinute()
          const isActiveShift =
            !isHistoricalView() &&
            isTimeInShift(currentHour, currentMinute, shiftStartHour, shiftEndHour)

          // Create a reference time for historical or current view
          const referenceTime = isHistoricalView()
            ? new Date(parsedSelectedDate.getTime() + 24 * 60 * 60 * 1000)
            : currentTime

          // Find the latest data before this shift starts - with error handling
          let latestBeforeShift = null
          try {
            latestBeforeShift = findLatestDataBeforeShift(
              allShiftData,
              shiftStartHour,
              referenceTime,
            )
          } catch (err) {
            console.error('Error finding latest data before shift:', err)
          }

          // Calculate hourly production values - with error handling
          let hourlyProduction = []
          try {
            hourlyProduction = calculateHourlyProduction(
              shift.data || [],
              shiftHours,
              referenceTime,
            )
          } catch (err) {
            console.error('Error calculating hourly production:', err)
          }

          return (
            <CCol md={12} key={index}>
              <CCard className="mb-3">
                <CCardHeader className="text-body">
                  <strong>{shift.name}</strong>
                  {isActiveShift && <span className="badge bg-success ms-2">Active</span>}
                </CCardHeader>
                <CCardBody className="p-4">
                  <ShiftProgressBar
                    shift={{ ...shift, data: shift.data || [] }}
                    shiftHours={shiftHours}
                    startHourNum={startHourNum}
                    endHourNum={endHourNum}
                    latestBeforeShift={latestBeforeShift}
                    isActiveShift={isActiveShift}
                    currentTime={referenceTime}
                    hourlyProduction={hourlyProduction}
                    isWithinProductionHours={
                      isHistoricalView()
                        ? true
                        : isWithinProductionHours(currentTime.getHours(), standardStartTime)
                    }
                    isHistoricalView={isHistoricalView()}
                  />
                </CCardBody>
              </CCard>
            </CCol>
          )
        } catch (err) {
          console.error(`Error rendering shift ${index}:`, err)
          return (
            <CCol md={12} key={index}>
              <CCard className="mb-3">
                <CCardHeader className="text-body">
                  <strong>{shift?.name || `Shift ${index + 1}`}</strong>
                </CCardHeader>
                <CCardBody className="p-4">
                  <CAlert color="danger">
                    Error displaying shift data. Please try refreshing the page.
                  </CAlert>
                </CCardBody>
              </CCard>
            </CCol>
          )
        }
      })}
    </>
  )
}

export default ShiftDetail
