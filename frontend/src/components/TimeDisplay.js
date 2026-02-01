import React from 'react';
import { Tooltip, Typography } from 'antd';
import { ClockCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTimezone } from '../context/TimezoneContext';

const { Text } = Typography;

/**
 * TimeDisplay - A component for displaying times with timezone awareness
 * 
 * @param {string} time - ISO date string (should be UTC from backend)
 * @param {string} format - 'datetime' | 'date' | 'time' | 'relative' | 'full'
 * @param {boolean} showTimezone - Show timezone abbreviation
 * @param {boolean} showTooltip - Show full datetime in tooltip
 * @param {object} style - Custom styles
 * @param {string} className - Custom class name
 * @param {boolean} showIcon - Show clock icon
 * @param {string} type - Typography type: 'secondary', 'warning', etc.
 * @param {number} fontSize - Font size in pixels
 */
const TimeDisplay = ({
  time,
  format = 'datetime',
  showTimezone = false,
  showTooltip = true,
  style = {},
  className = '',
  showIcon = false,
  type,
  fontSize,
}) => {
  const { 
    formatDateTime, 
    formatDate, 
    formatTime, 
    getRelativeTime,
    getTimezoneAbbr,
    timezone
  } = useTimezone();

  if (!time) {
    return <Text type="secondary" style={style}>—</Text>;
  }

  let displayText;
  let tooltipContent;

  switch (format) {
    case 'relative':
      displayText = getRelativeTime(time);
      tooltipContent = formatDateTime(time);
      break;
    case 'date':
      displayText = formatDate(time);
      tooltipContent = formatDateTime(time);
      break;
    case 'time':
      displayText = formatTime(time);
      tooltipContent = formatDateTime(time);
      break;
    case 'full':
      displayText = formatDateTime(time, { showSeconds: true });
      tooltipContent = null; // No tooltip needed for full format
      break;
    case 'datetime':
    default:
      displayText = formatDateTime(time);
      tooltipContent = formatDateTime(time, { showSeconds: true });
      break;
  }

  // Add timezone abbreviation if requested
  if (showTimezone && format !== 'relative') {
    displayText += ` ${getTimezoneAbbr()}`;
  }

  const textStyle = {
    ...style,
    fontSize: fontSize ? `${fontSize}px` : style.fontSize,
  };

  const content = (
    <Text type={type} style={textStyle} className={className}>
      {showIcon && <ClockCircleOutlined style={{ marginRight: 4 }} />}
      {displayText}
    </Text>
  );

  if (showTooltip && tooltipContent) {
    return (
      <Tooltip 
        title={
          <div>
            <div>{tooltipContent}</div>
            {timezone !== 'UTC' && (
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>
                <GlobalOutlined style={{ marginRight: 4 }} />
                {getTimezoneAbbr()}
              </div>
            )}
          </div>
        }
      >
        {content}
      </Tooltip>
    );
  }

  return content;
};

/**
 * RelativeTime - Shorthand for relative time display
 */
export const RelativeTime = (props) => (
  <TimeDisplay {...props} format="relative" />
);

/**
 * DateTime - Shorthand for full datetime display
 */
export const DateTime = (props) => (
  <TimeDisplay {...props} format="datetime" />
);

/**
 * DateOnly - Shorthand for date-only display
 */
export const DateOnly = (props) => (
  <TimeDisplay {...props} format="date" />
);

/**
 * TimeOnly - Shorthand for time-only display
 */
export const TimeOnly = (props) => (
  <TimeDisplay {...props} format="time" />
);

export default TimeDisplay;
