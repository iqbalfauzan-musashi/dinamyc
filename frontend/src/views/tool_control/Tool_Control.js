import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CProgress,
  CProgressStacked,
} from '@coreui/react'

const MachineDetail = () => {
  // Define shift data with hours and progress values
  const shifts = [
    {
      name: 'Shift 1',
      hours: [
        '07:00',
        '08:00',
        '09:00',
        '10:00',
        '11:00',
        '12:00',
        '13:00',
        '14:00',
        '15:00',
        '16:00',
      ],
      progressValues: [60],
      progressValues2: [30],
      progressValues3: [10],
    },
    {
      name: 'Shift 2',
      hours: [
        '16:00',
        '17:00',
        '18:00',
        '19:00',
        '20:00',
        '21:00',
        '22:00',
        '23:00',
        '00:00',
        '01:00',
      ],
      progressValues: [50],
      progressValues2: [5],
      progressValues3: [20],
    },
    {
      name: 'Shift 3',
      hours: ['01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00'],
      progressValues: [10],
      progressValues2: [15],
      progressValues3: [10],
    },
  ]

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

  // Updated progress container style with height property for thicker bars
  const progressContainerStyle = {
    position: 'absolute',
    left: '0',
    right: '0',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    padding: '0',
    height: '32px', // Added height for thicker progress bars
  }

  return (
    <div>
      {/* Added styles for thicker progress bars */}
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
            font-size: 1rem !important;
          }
        `}
      </style>

      {/* Production details section */}
      <h2>Detail Production</h2>
      <CRow>
        {shifts.map((shift, index) => (
          <CCol md={12} key={index}>
            <CCard className="mb-3">
              <CCardHeader className="text-body">
                <strong>{shift.name}</strong>
              </CCardHeader>
              <CCardBody className="p-4">
                <div style={gridContainerStyle}>
                  {shift.hours.map((hour, index) => {
                    const position = `${(100 * index) / (shift.hours.length - 1)}%`
                    return (
                      <React.Fragment key={index}>
                        <span style={{ ...timeTextStyle, top: '0', left: position }}>{hour}</span>
                        <div style={{ ...gridLineStyle, left: position }} />
                        <span style={{ ...timeTextStyle, bottom: '0', left: position }}>
                          {index * 10}
                        </span>
                      </React.Fragment>
                    )
                  })}

                  {/* Progress bar with updated positioning */}
                  <div style={progressContainerStyle}>
                    <CProgressStacked className="progress-stacked">
                      {shift.progressValues.map((value, valueIndex) => (
                        <CProgress key={valueIndex} color="success" value={value} />
                      ))}
                      {shift.progressValues2.map((value, valueIndex) => (
                        <CProgress key={`2-${valueIndex}`} color="danger" value={value} />
                      ))}
                      {shift.progressValues3.map((value, valueIndex) => (
                        <CProgress key={`3-${valueIndex}`} color="warning" value={value} />
                      ))}
                    </CProgressStacked>
                  </div>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>
    </div>
  )
}

export default MachineDetail
