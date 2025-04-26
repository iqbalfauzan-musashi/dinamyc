import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CFormInput,
  CSpinner,
  CProgress,
  CProgressStacked,
} from '@coreui/react'
import axios from 'axios'
import { getApiUrl } from '../../utils/apiUtils'

const MachineDetail = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [machineData, setMachineData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const machineCode = '45044'

  const fetchMachineData = async (date) => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(getApiUrl(`machine-detail/${machineCode}`))
      const processedData = processDataForDisplay(response.data, date)
      setMachineData(processedData)
    } catch (err) {
      console.error('Error fetching machine data:', err)
      setError('Failed to load machine data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const processDataForDisplay = (data, selectedDate) => {
    const shiftRanges = [
      { name: 'Shift 1', start: 7, end: 16 },
      { name: 'Shift 2', start: 16, end: 0 },
      { name: 'Shift 3', start: 0, end: 7 },
    ]

    const rawRecords = []

    const selectedDateObj = new Date(selectedDate)
    const nextDateObj = new Date(selectedDate)
    nextDateObj.setDate(nextDateObj.getDate() + 1)

    const selectedDateStr = selectedDateObj.toISOString().slice(0, 10)
    const nextDateStr = nextDateObj.toISOString().slice(0, 10)

    if (data.shifts && Array.isArray(data.shifts)) {
      data.shifts.forEach((shift) => {
        if (shift.records && Array.isArray(shift.records)) {
          shift.records.forEach((record) => {
            const recordDate = new Date(record.timestamp)

            // Force the hours to be as in the original timestamp
            // This fixes timezone issues by using the hours directly from the timestamp string
            const timestampParts = record.timestamp.split('T')[1].split(':')
            const recordHour = parseInt(timestampParts[0], 10)
            recordDate.setHours(recordHour)

            const recordDateStr = recordDate.toISOString().slice(0, 10)

            if (
              (recordDateStr === selectedDateStr && recordHour >= 7) ||
              (recordDateStr === nextDateStr && recordHour < 7)
            ) {
              let shiftDate
              if (recordDateStr === selectedDateStr) {
                shiftDate = new Date(selectedDateStr)
              } else {
                shiftDate = new Date(nextDateStr)
              }

              // Use the original hours from the timestamp string
              shiftDate.setHours(
                recordHour,
                parseInt(timestampParts[1], 10),
                parseInt(timestampParts[2], 10),
                0,
              )

              rawRecords.push({
                timestamp: shiftDate,
                originalTimestamp: new Date(record.timestamp),
                status: record.status,
                counter: record.counter,
              })
            }
          })
        }
      })
    }

    rawRecords.sort((a, b) => a.timestamp - b.timestamp)

    let lastRecordShift1 = null
    const shift1End = new Date(selectedDate)
    shift1End.setHours(16, 0, 0, 0)

    for (let i = 0; i < rawRecords.length; i++) {
      if (rawRecords[i].timestamp < shift1End) {
        lastRecordShift1 = rawRecords[i]
      } else {
        break
      }
    }

    const shift2Start = new Date(selectedDate)
    shift2Start.setHours(16, 0, 0, 0)

    const shift2Records = rawRecords.filter(
      (record) =>
        record.timestamp >= shift2Start &&
        record.timestamp.getDate() === selectedDateObj.getDate() &&
        record.timestamp.getHours() >= 16,
    )

    if (
      lastRecordShift1 &&
      (!shift2Records.length ||
        shift2Records[0].timestamp.getHours() > 16 ||
        shift2Records[0].timestamp.getMinutes() > 0)
    ) {
      const continuityRecord = {
        timestamp: new Date(shift2Start),
        status: lastRecordShift1.status,
        counter: lastRecordShift1.counter,
        isContinuity: true,
        sourceTimestamp: lastRecordShift1.timestamp,
      }
      rawRecords.push(continuityRecord)
      rawRecords.sort((a, b) => a.timestamp - b.timestamp)
    }

    let lastRecordShift2 = null
    const shift2End = new Date(selectedDate)
    shift2End.setHours(23, 59, 59, 999)

    for (let i = 0; i < rawRecords.length; i++) {
      if (rawRecords[i].timestamp <= shift2End) {
        lastRecordShift2 = rawRecords[i]
      } else {
        break
      }
    }

    const shift3Start = new Date(nextDateStr)
    shift3Start.setHours(0, 0, 0, 0)

    const shift3Records = rawRecords.filter(
      (record) =>
        record.timestamp.getDate() === nextDateObj.getDate() && record.timestamp.getHours() < 7,
    )

    if (
      lastRecordShift2 &&
      (!shift3Records.length ||
        shift3Records[0].timestamp.getHours() > 0 ||
        shift3Records[0].timestamp.getMinutes() > 0)
    ) {
      const continuityRecord = {
        timestamp: new Date(shift3Start),
        status: lastRecordShift2.status,
        counter: lastRecordShift2.counter,
        isContinuity: true,
        sourceTimestamp: lastRecordShift2.timestamp,
      }
      rawRecords.push(continuityRecord)
      rawRecords.sort((a, b) => a.timestamp - b.timestamp)
    }

    const shifts = shiftRanges.map((shift) => {
      const progressSegments = createProgressSegments(shift, selectedDate, rawRecords)

      return {
        name: shift.name,
        progressSegments: progressSegments,
        shiftStartHour: shift.start,
        shiftEndHour: shift.end,
      }
    })

    return {
      machineInfo: data.machineInfo,
      shifts: shifts,
    }
  }

  const createProgressSegments = (shift, selectedDate, records) => {
    if (!records || records.length === 0) {
      return []
    }

    const baseDate = new Date(selectedDate)
    const nextDate = new Date(selectedDate)
    nextDate.setDate(nextDate.getDate() + 1)

    let shiftStartDate, shiftEndDate

    if (shift.name === 'Shift 1') {
      shiftStartDate = new Date(baseDate)
      shiftStartDate.setHours(shift.start, 0, 0, 0)

      shiftEndDate = new Date(baseDate)
      shiftEndDate.setHours(shift.end, 0, 0, 0)
    } else if (shift.name === 'Shift 2') {
      shiftStartDate = new Date(baseDate)
      shiftStartDate.setHours(shift.start, 0, 0, 0)

      shiftEndDate = new Date(nextDate)
      shiftEndDate.setHours(0, 0, 0, 0)
    } else if (shift.name === 'Shift 3') {
      shiftStartDate = new Date(nextDate)
      shiftStartDate.setHours(0, 0, 0, 0)

      shiftEndDate = new Date(nextDate)
      shiftEndDate.setHours(shift.end, 0, 0, 0)
    }

    const shiftRecords = records.filter((record) => {
      return record.timestamp >= shiftStartDate && record.timestamp < shiftEndDate
    })

    if (shiftRecords.length === 0) {
      return []
    }

    shiftRecords.sort((a, b) => a.timestamp - b.timestamp)

    const shiftDurationMinutes = (shiftEndDate - shiftStartDate) / (60 * 1000)

    const segments = []

    if (shiftRecords.length > 0) {
      const firstRecord = shiftRecords[0]
      const initialPadMinutes = (firstRecord.timestamp - shiftStartDate) / (60 * 1000)
      const initialPadWidth = (initialPadMinutes / shiftDurationMinutes) * 100

      if (initialPadWidth > 0.1) {
        segments.push({
          status: 'EMPTY',
          value: initialPadWidth,
          displayTime: `${shiftStartDate.getHours().toString().padStart(2, '0')}:00`,
          isEmpty: true,
        })
      }
    }

    for (let i = 0; i < shiftRecords.length; i++) {
      const currentRecord = shiftRecords[i]
      const nextRecord = i < shiftRecords.length - 1 ? shiftRecords[i + 1] : null

      const actualStartTimestamp =
        currentRecord.isContinuity && currentRecord.sourceTimestamp
          ? currentRecord.sourceTimestamp
          : currentRecord.timestamp

      const startTime = currentRecord.timestamp
      let endTime

      if (nextRecord) {
        endTime = nextRecord.timestamp
      } else {
        endTime = new Date(shiftEndDate)
      }

      const durationMinutes = (endTime - startTime) / (60 * 1000)

      const width = (durationMinutes / shiftDurationMinutes) * 100

      let durationDisplay = ''
      if (currentRecord.isContinuity && currentRecord.sourceTimestamp) {
        const durationMs = endTime - actualStartTimestamp
        const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
        durationDisplay = ` (${durationHours}h ${durationMinutes}m total)`
      }

      segments.push({
        status: currentRecord.status,
        value: Math.max(0.1, width),
        displayTime: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
        durationDisplay: durationDisplay,
        isContinuity: currentRecord.isContinuity,
        sourceTime: currentRecord.isContinuity
          ? `${actualStartTimestamp.getHours().toString().padStart(2, '0')}:${actualStartTimestamp.getMinutes().toString().padStart(2, '0')}`
          : null,
      })
    }

    return segments
  }

  const handleDateChange = (e) => {
    const newDate = e.target.value
    setSelectedDate(newDate)
    fetchMachineData(newDate)
  }

  useEffect(() => {
    fetchMachineData(selectedDate)
  }, [selectedDate])

  const gridContainerStyle = {
    position: 'relative',
    width: '100%',
    marginBottom: '5px',
    padding: '0',
    height: '120px',
  }

  const gridLineStyle = {
    position: 'absolute',
    top: 25,
    bottom: 25,
    width: '2px',
    backgroundColor: 'rgba(200, 200, 200, 0.5)',
    zIndex: 1,
  }

  const timeTextStyle = {
    position: 'absolute',
    transform: 'translateX(-50%)',
    width: 'auto',
    fontSize: '0.9rem',
    padding: '0 5px',
  }

  const progressContainerStyle = {
    position: 'absolute',
    left: '0',
    right: '0',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    padding: '0',
    height: '32px',
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'NORMAL OPERATION':
        return 'success'
      case 'CHOKOTEI':
        return 'danger'
      case 'TIDAK NORMAL':
        return 'warning'
      case 'EMPTY':
        return 'light'
      default:
        return 'primary'
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )
  }

  const generateTimeMarkers = (shift) => {
    const markers = []

    let startHour,
      endHour,
      isNextDay = false

    if (shift.name === 'Shift 1') {
      startHour = 7
      endHour = 16
    } else if (shift.name === 'Shift 2') {
      startHour = 16
      endHour = 24
    } else if (shift.name === 'Shift 3') {
      startHour = 0
      endHour = 7
      isNextDay = true
    }

    if (shift.name === 'Shift 1' || shift.name === 'Shift 3') {
      for (let hour = startHour; hour <= endHour; hour++) {
        const position = ((hour - startHour) / (endHour - startHour)) * 100
        markers.push({
          time: `${hour.toString().padStart(2, '0')}:00${isNextDay ? ' (+1)' : ''}`,
          position: position,
          minutes: (hour - startHour) * 60,
        })
      }
    } else if (shift.name === 'Shift 2') {
      for (let hour = startHour; hour <= endHour; hour++) {
        const position = ((hour - startHour) / (endHour - startHour)) * 100
        markers.push({
          time: `${(hour === 24 ? 0 : hour).toString().padStart(2, '0')}:00${hour === 24 ? ' (+1)' : ''}`,
          position: position,
          minutes: (hour - startHour) * 60,
        })
      }
    }

    return markers
  }

  const getNextDayFormatted = () => {
    const nextDay = new Date(selectedDate)
    nextDay.setDate(nextDay.getDate() + 1)
    return nextDay.toISOString().slice(0, 10)
  }

  return (
    <div>
      <style>
        {`
          .c-progress {
            height: 32px !important;
          }
          .c-progress-bar {
            height: 32px !important;
          }
          .c-progress-stacked {
            height: 32px !important;
          }
        `}
      </style>

      <CRow className="mb-4">
        <CCol md={4}>
          <CCard>
            <CCardHeader>
              <strong>Select Date</strong>
            </CCardHeader>
            <CCardBody>
              <CFormInput
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                label="Production Date"
              />
            </CCardBody>
          </CCard>
        </CCol>
        {machineData && machineData.machineInfo && (
          <CCol md={8}>
            <CCard>
              <CCardHeader>
                <strong>Machine Information</strong>
              </CCardHeader>
              <CCardBody>
                <CRow>
                  <CCol md={6}>
                    <p>
                      <strong>Machine Code:</strong> {machineData.machineInfo.MACHINE_CODE}
                    </p>
                    <p>
                      <strong>Machine Name:</strong> {machineData.machineInfo.MACHINE_NAME}
                    </p>
                  </CCol>
                  <CCol md={6}>
                    <p>
                      <strong>Line Group:</strong> {machineData.machineInfo.LINE_GROUP}
                    </p>
                    <p>
                      <strong>Location:</strong> {machineData.machineInfo.LOCATION}
                    </p>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CCol>
        )}
      </CRow>

      <h2>
        Detail Production - {selectedDate} (Shift 1 & 2) and {getNextDayFormatted()} (Shift 3)
      </h2>
      {machineData && machineData.shifts && (
        <CRow>
          {machineData.shifts.map((shift, index) => {
            const timeMarkers = generateTimeMarkers(shift)
            return (
              <CCol md={12} key={index}>
                <CCard className="mb-3">
                  <CCardHeader className="text-body">
                    <strong>{shift.name}</strong>
                    {shift.name === 'Shift 3' && (
                      <span className="ms-2 text-muted">({getNextDayFormatted()})</span>
                    )}
                  </CCardHeader>
                  <CCardBody className="p-4">
                    <div style={gridContainerStyle}>
                      {timeMarkers.map((marker, markerIndex) => (
                        <React.Fragment key={markerIndex}>
                          <span style={{ ...timeTextStyle, top: '0', left: `${marker.position}%` }}>
                            {marker.time}
                          </span>
                          <div style={{ ...gridLineStyle, left: `${marker.position}%` }} />
                          <span
                            style={{ ...timeTextStyle, bottom: '0', left: `${marker.position}%` }}
                          >
                            {marker.minutes}
                          </span>
                        </React.Fragment>
                      ))}

                      {timeMarkers.length > 0 &&
                        Math.abs(timeMarkers[timeMarkers.length - 1].position - 100) > 1 && (
                          <div style={{ ...gridLineStyle, left: '100%' }} />
                        )}

                      <div style={progressContainerStyle}>
                        <CProgressStacked className="mb-3">
                          {shift.progressSegments &&
                            shift.progressSegments.map((segment, segmentIndex) => (
                              <CProgress
                                color={getStatusColor(segment.status)}
                                value={segment.value}
                                key={segmentIndex}
                                title={
                                  segment.isEmpty
                                    ? undefined
                                    : segment.isContinuity
                                      ? `${segment.displayTime}: ${segment.status} (Continued from ${segment.sourceTime})${segment.durationDisplay}`
                                      : `${segment.displayTime}: ${segment.status}`
                                }
                                variant={segment.isEmpty ? 'none' : undefined}
                              />
                            ))}
                        </CProgressStacked>
                      </div>
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
            )
          })}
        </CRow>
      )}

      <CCard className="mb-3">
        <CCardHeader>
          <strong>Legend</strong>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={3}>
              <div className="d-flex align-items-center">
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'var(--cui-success)',
                    marginRight: '10px',
                  }}
                ></div>
                <span>Normal Operation</span>
              </div>
            </CCol>
            <CCol md={3}>
              <div className="d-flex align-items-center">
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'var(--cui-danger)',
                    marginRight: '10px',
                  }}
                ></div>
                <span>Chokotei</span>
              </div>
            </CCol>
            <CCol md={3}>
              <div className="d-flex align-items-center">
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'var(--cui-warning)',
                    marginRight: '10px',
                  }}
                ></div>
                <span>Tidak Normal</span>
              </div>
            </CCol>
            <CCol md={3}>
              <div className="d-flex align-items-center">
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'var(--cui-primary)',
                    marginRight: '10px',
                  }}
                ></div>
                <span>Other Status</span>
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default MachineDetail
