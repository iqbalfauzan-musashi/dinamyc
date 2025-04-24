import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CProgress,
  CProgressStacked,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CBadge,
  CSpinner,
} from '@coreui/react'

const MachineStatusTimeline = ({ location, machineCode, selectedLineGroup }) => {
  const [shiftData, setShiftData] = useState([])
  const [machineInfo, setMachineInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchMachineData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (!machineCode) {
          throw new Error('Machine code is required')
        }

        // Fetch machine detail data
        const response = await axios.get(getApiUrl(`machine-detail/${machineCode}`))

        if (response.data && response.data.shifts) {
          setMachineInfo(response.data.machineInfo || {})
          processShiftData(response.data.shifts)
        } else {
          throw new Error('Invalid data format received from server')
        }
      } catch (err) {
        console.error('Failed to fetch machine data:', err)
        setError(err.message || 'An error occurred while fetching machine data')
      } finally {
        setIsLoading(false)
      }
    }

    if (machineCode) {
      fetchMachineData()
    }
  }, [machineCode, location, selectedLineGroup])

  // Process shift data to calculate duration percentages for each status
  const processShiftData = (shifts) => {
    if (!shifts || shifts.length === 0) return

    // Format the shift data with proper percentages and hour information
    const formattedShifts = shifts.map((shift) => {
      // Ensure we have valid percentage values that sum to 100 or less
      let normalOp = shift.goodParts || 0
      let warning = shift.defectiveParts || 0
      let downtime = shift.downtime || 0

      // Calculate total and scale if needed
      const total = normalOp + warning + downtime
      if (total > 100) {
        const scale = 100 / total
        normalOp = Math.floor(normalOp * scale)
        warning = Math.floor(warning * scale)
        downtime = Math.floor(downtime * scale)
      }

      // Calculate remaining percentage (idle)
      const idle = Math.max(0, 100 - (normalOp + warning + downtime))

      return {
        name: shift.name,
        hours: shift.hours || [],
        normalOperation: normalOp,
        warningState: warning,
        downtime: downtime,
        idle: idle,
        productionValues: shift.productionValues || [],
      }
    })

    setShiftData(formattedShifts)
  }

  // Style definitions
  const gridContainerStyle = {
    position: 'relative',
    width: '100%',
    marginBottom: '15px',
    padding: '0',
    height: '120px',
  }

  const gridLineStyle = {
    position: 'absolute',
    top: 30,
    bottom: 30,
    width: '1px',
    backgroundColor: 'rgba(200, 200, 200, 0.5)',
    zIndex: 1,
  }

  const timeTextStyle = {
    position: 'absolute',
    transform: 'translateX(-50%)',
    width: 'auto',
    fontSize: '0.8rem',
    padding: '0 5px',
  }

  const productionValueStyle = {
    position: 'absolute',
    transform: 'translateX(-50%)',
    width: 'auto',
    fontSize: '0.75rem',
    padding: '0 5px',
    color: '#6c757d',
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

  // Status legends for the chart
  const statusLegends = [
    { color: 'success', label: 'Normal Operation' },
    { color: 'warning', label: 'Warning State' },
    { color: 'danger', label: 'Downtime' },
    { color: 'secondary', label: 'Idle' },
  ]

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <CSpinner color="primary" />
        <span className="ms-2">Loading machine status data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <CCard className="text-center text-danger border-danger">
        <CCardBody>
          <h5>Error Loading Machine Data</h5>
          <p>{error}</p>
          <p>Please try again or contact support if the problem persists.</p>
        </CCardBody>
      </CCard>
    )
  }

  if (!shiftData.length) {
    return (
      <CCard className="text-center">
        <CCardBody>
          <h5>No Shift Data Available</h5>
          <p>There is no production data available for this machine.</p>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <div className="machine-status-timeline">
      <style>
        {`
          .progress-stacked {
            height: 32px !important;
          }
          .progress-stacked .progress {
            height: 32px !important;
          }
          .progress-stacked .progress-bar {
            height: 32px !important;
            font-size: 0.9rem !important;
            font-weight: 500;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .machine-info {
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 10px 15px;
            margin-bottom: 20px;
          }
        `}
      </style>

      {machineInfo && (
        <div className="machine-info mb-3">
          <h4>{machineInfo.MACHINE_NAME || `Machine ${machineCode}`}</h4>
          <div className="row g-2">
            <div className="col-md-4">
              <small className="text-muted">Machine Code:</small>{' '}
              {machineInfo.MACHINE_CODE || machineCode}
            </div>
            <div className="col-md-4">
              <small className="text-muted">Line Group:</small> {machineInfo.LINE_GROUP || 'N/A'}
            </div>
            <div className="col-md-4">
              <small className="text-muted">Location:</small>{' '}
              {machineInfo.LOCATION || location || 'N/A'}
            </div>
          </div>
        </div>
      )}

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Machine Status Timeline (24-Hour View)</strong>
          <div className="d-flex gap-3">
            {statusLegends.map((legend, idx) => (
              <div key={idx} className="d-flex align-items-center">
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    backgroundColor: `var(--cui-${legend.color})`,
                    marginRight: '4px',
                    borderRadius: '2px',
                  }}
                ></div>
                <small>{legend.label}</small>
              </div>
            ))}
          </div>
        </CCardHeader>
        <CCardBody>
          {shiftData.map((shift, shiftIndex) => (
            <div key={shiftIndex} className="mb-4">
              <h6 className="text-body fw-bold mb-2">{shift.name}</h6>
              <div style={gridContainerStyle}>
                {/* Time markers */}
                {shift.hours.map((hour, hourIndex) => {
                  const position = `${(100 * hourIndex) / (shift.hours.length - 1)}%`
                  return (
                    <React.Fragment key={hourIndex}>
                      <span style={{ ...timeTextStyle, top: '0', left: position }}>{hour}</span>
                      <div style={{ ...gridLineStyle, left: position }} />
                      <span style={{ ...productionValueStyle, bottom: '0', left: position }}>
                        {shift.productionValues[hourIndex] || 0}
                      </span>
                    </React.Fragment>
                  )
                })}

                {/* Progress bars showing status */}
                <div style={progressContainerStyle}>
                  <CProgressStacked className="progress-stacked">
                    {shift.normalOperation > 0 && (
                      <CProgress value={shift.normalOperation} color="success">
                        {shift.normalOperation}%
                      </CProgress>
                    )}
                    {shift.warningState > 0 && (
                      <CProgress value={shift.warningState} color="warning">
                        {shift.warningState}%
                      </CProgress>
                    )}
                    {shift.downtime > 0 && (
                      <CProgress value={shift.downtime} color="danger">
                        {shift.downtime}%
                      </CProgress>
                    )}
                    {shift.idle > 0 && (
                      <CProgress value={shift.idle} color="secondary">
                        {shift.idle}%
                      </CProgress>
                    )}
                  </CProgressStacked>
                </div>
              </div>

              {/* Shift statistics */}
              <div className="d-flex mt-2 gap-3 flex-wrap">
                <CBadge color="success" className="py-2 px-3">
                  Normal: {shift.normalOperation}%
                </CBadge>
                <CBadge color="warning" className="py-2 px-3">
                  Warning: {shift.warningState}%
                </CBadge>
                <CBadge color="danger" className="py-2 px-3">
                  Downtime: {shift.downtime}%
                </CBadge>
                <CBadge color="secondary" className="py-2 px-3">
                  Idle: {shift.idle}%
                </CBadge>
                <CBadge color="info" className="py-2 px-3">
                  Production: {shift.productionValues.reduce((sum, val) => sum + (val || 0), 0)}{' '}
                  units
                </CBadge>
              </div>
            </div>
          ))}
        </CCardBody>
      </CCard>

      {/* Machine Performance Summary */}
      <CRow className="mt-3">
        <CCol md={6}>
          <CCard className="h-100">
            <CCardHeader>
              <strong>Production Summary</strong>
            </CCardHeader>
            <CCardBody>
              <div className="d-flex justify-content-between mb-3">
                <div>Total Production:</div>
                <div className="fw-bold">
                  {shiftData.reduce(
                    (sum, shift) =>
                      sum + shift.productionValues.reduce((s, val) => s + (val || 0), 0),
                    0,
                  )}{' '}
                  units
                </div>
              </div>

              <h6 className="text-muted mb-2">Status Distribution</h6>

              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <small>Normal Operation</small>
                  <small>
                    {shiftData.reduce((sum, shift) => sum + shift.normalOperation, 0) /
                      shiftData.length}
                    %
                  </small>
                </div>
                <CProgress
                  value={
                    shiftData.reduce((sum, shift) => sum + shift.normalOperation, 0) /
                    shiftData.length
                  }
                  color="success"
                  height={8}
                />
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <small>Warning State</small>
                  <small>
                    {shiftData.reduce((sum, shift) => sum + shift.warningState, 0) /
                      shiftData.length}
                    %
                  </small>
                </div>
                <CProgress
                  value={
                    shiftData.reduce((sum, shift) => sum + shift.warningState, 0) / shiftData.length
                  }
                  color="warning"
                  height={8}
                />
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <small>Downtime</small>
                  <small>
                    {shiftData.reduce((sum, shift) => sum + shift.downtime, 0) / shiftData.length}%
                  </small>
                </div>
                <CProgress
                  value={
                    shiftData.reduce((sum, shift) => sum + shift.downtime, 0) / shiftData.length
                  }
                  color="danger"
                  height={8}
                />
              </div>

              <div>
                <div className="d-flex justify-content-between mb-1">
                  <small>Idle Time</small>
                  <small>
                    {shiftData.reduce((sum, shift) => sum + shift.idle, 0) / shiftData.length}%
                  </small>
                </div>
                <CProgress
                  value={shiftData.reduce((sum, shift) => sum + shift.idle, 0) / shiftData.length}
                  color="secondary"
                  height={8}
                />
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={6}>
          <CCard className="h-100">
            <CCardHeader>
              <strong>Shift Performance</strong>
            </CCardHeader>
            <CCardBody>
              {shiftData.map((shift, idx) => (
                <div key={idx} className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div>
                      <span className="fw-bold">{shift.name}</span>
                    </div>
                    <span className="badge bg-primary">
                      {shift.productionValues.reduce((sum, val) => sum + (val || 0), 0)} units
                    </span>
                  </div>
                  <CProgressStacked height={10} className="mb-2">
                    <CProgress value={shift.normalOperation} color="success" />
                    <CProgress value={shift.warningState} color="warning" />
                    <CProgress value={shift.downtime} color="danger" />
                    <CProgress value={shift.idle} color="secondary" />
                  </CProgressStacked>
                  <div className="d-flex justify-content-between">
                    <small className="text-muted">
                      Normal: {shift.normalOperation}% | Warning: {shift.warningState}% | Downtime:{' '}
                      {shift.downtime}%
                    </small>
                    <small className="text-muted">Utilization: {100 - shift.idle}%</small>
                  </div>
                </div>
              ))}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

export default MachineStatusTimeline
