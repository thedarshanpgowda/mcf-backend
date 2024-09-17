import fs from "fs";
import { apiResponse } from "../config/apiResponse.js";
import ResultModel from "../models/result.js";
import readline from "readline";
import Threshold from '../models/thresholds.js';

const processDate = async (req, res) => {
  try {
    let { startDate, endDate } = req.body;

    // console.log(startDate, endDate);

    // Default dates if not provided
    if (!startDate) startDate = "2024-08-21T00:00:00";
    if (!endDate) endDate = "2024-08-22T00:00:00";

    const startDateTime = new Date(startDate).toLocaleString();
    const endDateTime = new Date(endDate).toLocaleString();

    const startDateTimeStr = new Date(startDate).toLocaleString('en-US', { timeZone: 'UTC' });
    const endDateTimeStr = new Date(endDate).toLocaleString('en-US', { timeZone: 'UTC' });


    if (startDateTimeStr > endDateTimeStr) {
      return res.status(400).json(new apiResponse(400, "Start date cannot be greater than end date", {}));
    }

    const thresholdObj = await Threshold.findOne({ id: "66e414f1944b8a64a6c0118c" });
    const threshold = {
      yaw: { min: thresholdObj.yaw.min, max: thresholdObj.yaw.max },
      roll: { min: thresholdObj.roll.min, max: thresholdObj.roll.max },
      pitch: { min: thresholdObj.pitch.min, max: thresholdObj.pitch.max }
    };
    const samplingLimit = { lower: thresholdObj.samplingTime.min, upper: thresholdObj.samplingTime.max };
    const gsat_number = thresholdObj.gsat_number;
    const period = Number(thresholdObj.period);

    const searchCondition = await ResultModel.findOne({
      date: startDateTime,
      endDate: endDateTime,
      gsat_number,
    });

    if (searchCondition) {
      return res.status(200).json(new apiResponse(200, "Data already exists", { searchCondition }));
    }

    const fileStream = fs.createReadStream("data.out");
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let currentDate = null;
    let currentObject = null;
    let prevObject = null;
    const hourlyData = [];
    const thresholdBreach = [];
    let thresholdBreachPeriod = null
    let prevBreach = null

    const isValid = (line) => {
      return !line.trim().startsWith("DRC") &&
        !line.trim().startsWith("DTG") &&
        !line.trim().startsWith("GSAT") &&
        !line.trim().startsWith("Available") &&
        !line.trim().startsWith("DD") &&
        !line.trim().startsWith("Required") &&
        !line.trim().startsWith(" ") &&
        line.trim() !== "" &&
        !line.trim().startsWith("END");
    };

    const isWithinSamplingTime = (line) => {
      const fields = line.trim().split(/\s+/);
      return Number(fields[1]) > samplingLimit.lower && Number(fields[1]) < samplingLimit.upper;
    };

    const isValueValid = (currentObject, prevObject) => {
      if (prevObject === null) return true;
      return currentObject.pitch !== prevObject.pitch || currentObject.roll !== prevObject.roll || currentObject.yaw !== prevObject.yaw;
    };

    const checkThresholdBreach = (currentObject) => {
      const { pitch, roll, yaw, date, time } = currentObject;

      // Helper function to format date and time
      const formatDateTime = () => {
        let { date, time } = currentObject;
        const now = new Date(`${date} ${time}`);
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        date = now.toLocaleDateString('en-GB', options).replace(/ /g, '-');
        time = now.toTimeString().split(' ')[0]; // 'H:M:S' format

        return { date, time };
      };

      const thresholdBreach = [];

      // Check for pitch threshold breaches
      if (pitch !== null && pitch < threshold.pitch.min) {
        thresholdBreach.push({
          type: "pitch",
          value: pitch,
          threshold: threshold.pitch.min,
          status: "below",
          difference: threshold.pitch.min - pitch,
          ...formatDateTime()
        });
      }
      if (pitch !== null && pitch > threshold.pitch.max) {
        thresholdBreach.push({
          type: "pitch",
          value: pitch,
          threshold: threshold.pitch.max,
          status: "above",
          difference: pitch - threshold.pitch.max,
          ...formatDateTime()
        });
      }

      // Check for roll threshold breaches
      if (roll !== null && roll < threshold.roll.min) {
        thresholdBreach.push({
          type: "roll",
          value: roll,
          threshold: threshold.roll.min,
          status: "below",
          difference: threshold.roll.min - roll,
          ...formatDateTime()
        });
      }
      if (roll !== null && roll > threshold.roll.max) {
        thresholdBreach.push({
          type: "roll",
          value: roll,
          threshold: threshold.roll.max,
          status: "above",
          difference: roll - threshold.roll.max,
          ...formatDateTime()
        });
      }

      // Check for yaw threshold breaches
      if (yaw !== null && yaw < threshold.yaw.min) {
        thresholdBreach.push({
          type: "yaw",
          value: yaw,
          threshold: threshold.yaw.min,
          status: "below",
          difference: threshold.yaw.min - yaw,
          ...formatDateTime()
        });
      }
      if (yaw !== null && yaw > threshold.yaw.max) {
        thresholdBreach.push({
          type: "yaw",
          value: yaw,
          threshold: threshold.yaw.max,
          status: "above",
          difference: yaw - threshold.yaw.max,
          ...formatDateTime()
        });
      }

      return thresholdBreach.length > 0 ? thresholdBreach : null;
    };


    const trackThresholdBreach = (currentObject, previousBreach = null) => {
      const breachLog = [];

      // Helper function to format the date and time
      const formatDateTime = (dateTime) => {
        const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        return new Date(dateTime).toLocaleString('en-GB', options).replace(/ /g, '-');
      };

      // Helper function to calculate duration
      const calculateDuration = (startTime, endTime) => {
        const diff = new Date(endTime) - new Date(startTime);
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes} minutes ${seconds} seconds`;
      };

      // Check for threshold breaches
      const { pitch, roll, yaw, date, time } = currentObject;
      const dateTime = `${date} ${time}`;

      if (previousBreach === null) {
        // Start a new breach
        if (pitch < threshold.pitch.min || pitch > threshold.pitch.max) {
          previousBreach = { type: 'pitch', startTime: dateTime, startValue: pitch };
        }
        if (roll < threshold.roll.min || roll > threshold.roll.max) {
          previousBreach = { type: 'roll', startTime: dateTime, startValue: roll };
        }
        if (yaw < threshold.yaw.min || yaw > threshold.yaw.max) {
          previousBreach = { type: 'yaw', startTime: dateTime, startValue: yaw };
        }
      } else {
        // Continue or end the existing breach
        const { type, startTime, startValue } = previousBreach;

        if (
          (type === 'pitch' && (pitch < threshold.pitch.min || pitch > threshold.pitch.max)) ||
          (type === 'roll' && (roll < threshold.roll.min || roll > threshold.roll.max)) ||
          (type === 'yaw' && (yaw < threshold.yaw.min || yaw > threshold.yaw.max))
        ) {
          // Still within breach
          previousBreach.endTime = dateTime;
        } else {
          // Breach ended
          breachLog.push({
            type,
            startTime: formatDateTime(startTime),
            endTime: formatDateTime(dateTime),
            duration: calculateDuration(startTime, dateTime),
            startValue
          });
          previousBreach = null; // Reset breach tracker
        }
      }

      return { breachLog, previousBreach };
    };


    const isWithinSetTime = (dateObj) => {
      const dateValue = new Date(`${dateObj?.date} ${dateObj?.time}`);

      // console.log("dateValue:", dateValue);
      // console.log("startDateTime:", startDateTime);
      // console.log("endDateTime:", endDateTime);

      // Convert to Date objects for comparison
      const startDateTimeObj = new Date(startDate);
      const endDateTimeObj = new Date(endDate);

      // Perform proper Date comparison
      const isWithinLimit = dateValue >= startDateTimeObj && dateValue <= endDateTimeObj;

      // console.log("isWithinLimit:", isWithinLimit);

      return isWithinLimit;
    };


    rl.on("line", (line) => {
      if (!isValid(line)) return;

      const fields = line.trim().split(/\s+/);
      if (line.trim().match(/\b\d{2}\s{1,}[A-Za-z]{3}\s{1,}\d{4}\b/)) {
        currentDate = `${fields[0]}-${fields[1]}-${fields[2]}`;
        return;
      }

      const currentDateTime = new Date(`${currentDate} ${fields[0]}:${fields[1]}:${fields[2]}`).toLocaleString();

      const [hour, minute, second, fit, pitch, roll, yaw] = fields;
      currentObject = {
        date: currentDate,
        time: `${hour}:${minute}:${second}`,
        pitch: pitch === "---" ? null : Number(pitch),
        roll: roll === "---" ? null : Number(roll),
        yaw: yaw === "---" ? null : Number(yaw)
      };
      if (currentDateTime <= startDateTime || currentDateTime >= endDateTime) return;

      if (currentDate && isWithinSetTime(currentObject)) {

        if (isWithinSamplingTime(line)) {


          if (isValueValid(currentObject, prevObject)) {
            hourlyData.push(currentObject);

            const thresholdCrossedObj = checkThresholdBreach(currentObject) || [];
            if (thresholdCrossedObj.length > 0) {
              thresholdBreach.push(...thresholdCrossedObj);
            }

            const { breachLog, previousBreach } = trackThresholdBreach(currentObject, prevBreach);
            if (breachLog.length > 0) {
              thresholdBreachPeriod.push(...breachLog);
            }

            prevBreach = previousBreach;
            prevObject = currentObject;
          }
        }
      }
    });

    rl.on("close", () => {
      const getLastOccurrencesPerHourAcrossDays = (data) => {
        const occurrences = {};

        data.forEach(entry => {
          const dateTimeStr = `${entry.date} ${entry.time}`;
          const dateObj = new Date(dateTimeStr);
          const date = entry.date;
          const hour = dateObj.getHours();

          if (!occurrences[date]) {
            occurrences[date] = {};
          }

          occurrences[date][hour] = entry;
        });

        Object.keys(occurrences).forEach(date => {
          for (let hour = 0; hour < 24; hour++) {
            if (!occurrences[date][hour]) {
              occurrences[date][hour] = null;
            }
          }
        });

        return occurrences;
      };

      const result = getLastOccurrencesPerHourAcrossDays(hourlyData);

      function analyzeStability(data, periodHours) {
        const result = {};
        const periodMinutes = periodHours * 60; // Convert hours to minutes

        const timeToMinutes = (time) => {
          const [hours, minutes, seconds = 0] = time.split(':').map(Number);
          return hours * 60 + minutes + seconds / 60;
        };

        const formatTime = (totalMinutes) => {
          const hours = Math.floor(totalMinutes / 60);
          const minutes = Math.floor(totalMinutes % 60);
          const seconds = Math.round((totalMinutes - Math.floor(totalMinutes)) * 60);
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };

        const formatDateTime = (date, totalMinutes) => {
          return `${date} ${formatTime(totalMinutes)}`;
        };

        for (const [date, hours] of Object.entries(data)) {
          // console.log(`Processing date: ${date}`);
          result[date] = { pitch: [], roll: [], yaw: [] };

          let currentStreak = { startTime: null, endTime: null, pitch: null, roll: null, yaw: null };

          for (const [hour, entry] of Object.entries(hours)) {
            const currentEntry = entry;
            if (currentEntry) {
              const { time, pitch, roll, yaw } = currentEntry;
              const totalMinutes = timeToMinutes(time);
              // console.log(`Total minutes for ${time}: ${totalMinutes}`);

              if (currentStreak.startTime === null) {
                // Start a new streak
                currentStreak = { startTime: totalMinutes, endTime: totalMinutes, pitch, roll, yaw };
                // console.log('Starting new streak:', currentStreak);
              } else {
                const durationMinutes = totalMinutes - currentStreak.endTime;
                const isStreakStable = (
                  pitch === currentStreak.pitch &&
                  roll === currentStreak.roll &&
                  yaw === currentStreak.yaw
                );
                // console.log(`Duration minutes since last entry: ${durationMinutes}`);
                // console.log(`Is streak stable: ${isStreakStable}`);

                if (isStreakStable) {
                  // Extend the current streak
                  currentStreak.endTime = totalMinutes;
                  // console.log('Extending streak:', currentStreak);

                  // Check if the duration exceeds the threshold
                  const streakDurationMinutes = currentStreak.endTime - currentStreak.startTime;
                  if (streakDurationMinutes >= periodMinutes) {
                    // Append stable streaks
                    if (currentStreak.pitch !== null) {
                      result[date].pitch.push({
                        startTime: formatDateTime(date, currentStreak.startTime),
                        endTime: formatDateTime(date, currentStreak.endTime),
                        duration: formatTime(streakDurationMinutes),
                        value: currentStreak.pitch
                      });
                    }
                    if (currentStreak.roll !== null) {
                      result[date].roll.push({
                        startTime: formatDateTime(date, currentStreak.startTime),
                        endTime: formatDateTime(date, currentStreak.endTime),
                        duration: formatTime(streakDurationMinutes),
                        value: currentStreak.roll
                      });
                    }
                    if (currentStreak.yaw !== null) {
                      result[date].yaw.push({
                        startTime: formatDateTime(date, currentStreak.startTime),
                        endTime: formatDateTime(date, currentStreak.endTime),
                        duration: formatTime(streakDurationMinutes),
                        value: currentStreak.yaw
                      });
                    }

                    // Start a new streak after exceeding the limit
                    currentStreak = { startTime: totalMinutes, endTime: totalMinutes, pitch, roll, yaw };
                    // console.log('Starting new streak after exceeding limit:', currentStreak);
                  }
                } else {
                  // End of current streak; check if it meets the required period
                  const streakDurationMinutes = currentStreak.endTime - currentStreak.startTime;
                  if (streakDurationMinutes >= periodMinutes) {
                    // Append stable streaks
                    if (currentStreak.pitch !== null) {
                      result[date].pitch.push({
                        startTime: formatDateTime(date, currentStreak.startTime),
                        endTime: formatDateTime(date, currentStreak.endTime),
                        duration: formatTime(streakDurationMinutes),
                        value: currentStreak.pitch
                      });
                    }
                    if (currentStreak.roll !== null) {
                      result[date].roll.push({
                        startTime: formatDateTime(date, currentStreak.startTime),
                        endTime: formatDateTime(date, currentStreak.endTime),
                        duration: formatTime(streakDurationMinutes),
                        value: currentStreak.roll
                      });
                    }
                    if (currentStreak.yaw !== null) {
                      result[date].yaw.push({
                        startTime: formatDateTime(date, currentStreak.startTime),
                        endTime: formatDateTime(date, currentStreak.endTime),
                        duration: formatTime(streakDurationMinutes),
                        value: currentStreak.yaw
                      });
                    }
                  }

                  // Start a new streak after a break
                  currentStreak = { startTime: totalMinutes, endTime: totalMinutes, pitch, roll, yaw };
                  // console.log('Starting new streak after a break:', currentStreak);
                }
              }
            }
          }

          // Check the final streak after the loop
          if (currentStreak.startTime !== null) {
            const finalDurationMinutes = currentStreak.endTime - currentStreak.startTime;
            // console.log(`Final streak duration minutes: ${finalDurationMinutes}`);

            if (finalDurationMinutes >= periodMinutes) {
              if (currentStreak.pitch !== null) {
                result[date].pitch.push({
                  startTime: formatDateTime(date, currentStreak.startTime),
                  endTime: formatDateTime(date, currentStreak.endTime),
                  duration: formatTime(finalDurationMinutes),
                  value: currentStreak.pitch
                });
              }
              if (currentStreak.roll !== null) {
                result[date].roll.push({
                  startTime: formatDateTime(date, currentStreak.startTime),
                  endTime: formatDateTime(date, currentStreak.endTime),
                  duration: formatTime(finalDurationMinutes),
                  value: currentStreak.roll
                });
              }
              if (currentStreak.yaw !== null) {
                result[date].yaw.push({
                  startTime: formatDateTime(date, currentStreak.startTime),
                  endTime: formatDateTime(date, currentStreak.endTime),
                  duration: formatTime(finalDurationMinutes),
                  value: currentStreak.yaw
                });
              }
            }
          }
        }

        // console.log('Final result:', JSON.stringify(result, null, 2));
        return result;
      }


      const testData = {
        "21-AUG-2024": {
          "0": { date: "21-AUG-2024", time: "0:0:00", pitch: 12.8104, roll: -3.3619, yaw: -1.5747 },
          "1": { date: "21-AUG-2024", time: "1:0:00", pitch: 12.8104, roll: -3.3619, yaw: -1.5747 },
          "2": { date: "21-AUG-2024", time: "2:0:00", pitch: 12.8104, roll: -3.3619, yaw: -1.5747 },
          "3": { date: "21-AUG-2024", time: "3:0:00", pitch: 12.8104, roll: -3.3619, yaw: -1.5747 },
          "4": { date: "21-AUG-2024", time: "4:0:00", pitch: 12.8104, roll: -3.3619, yaw: -1.5747 },
          "5": { date: "21-AUG-2024", time: "5:0:00", pitch: 12.8104, roll: -3.3619, yaw: -1.5747 },
          "6": { date: "21-AUG-2024", time: "6:0:00", pitch: 1.8104, roll: -3.3619, yaw: -1.5747 },
          "7": { date: "21-AUG-2024", time: "7:0:00", pitch: 12.8104, roll: -3.3619, yaw: -1.5747 },
          "8": { date: "21-AUG-2024", time: "8:0:00", pitch: 12.8104, roll: -3.3619, yaw: -1.47 },
          "9": { date: "21-AUG-2024", time: "9:0:00", pitch: 12.8104, roll: -3.3619, yaw: -1.5747 },
          "10": { date: "21-AUG-2024", time: "10:0:00", pitch: 1.8104, roll: -3.3619, yaw: -1.5747 },
          "11": { date: "21-AUG-2024", time: "11:0:00", pitch: 1.8104, roll: -3.3619, yaw: -1.5747 },
          "12": { date: "21-AUG-2024", time: "12:0:00", pitch: 1.8104, roll: -3.3619, yaw: -1.5747 },
          "13": { date: "21-AUG-2024", time: "13:0:00", pitch: 1.8104, roll: -3.3619, yaw: -1.5747 },
          "14": { date: "21-AUG-2024", time: "14:0:00", pitch: 1.8104, roll: -3.3619, yaw: -1.5747 },
          "15": { date: "21-AUG-2024", time: "15:0:00", pitch: 1.8104, roll: -3.3619, yaw: -1.5747 },
          "16": { date: "21-AUG-2024", time: "16:0:00", pitch: 1.8104, roll: -3.619, yaw: -1.5747 },
          "17": { date: "21-AUG-2024", time: "17:0:00", pitch: 12.8104, roll: -3.619, yaw: -1.5747 },
          "18": null,
          "19": { date: "21-AUG-2024", time: "19:0:00", pitch: 12.8104, roll: -3.619, yaw: -1.5747 },
          "20": { date: "21-AUG-2024", time: "20:0:00", pitch: 12.8104, roll: -3.619, yaw: -1.5747 },
          "21": { date: "21-AUG-2024", time: "21:0:00", pitch: 12.8104, roll: -3.619, yaw: -1.5747 },
          "22": { date: "21-AUG-2024", time: "22:0:00", pitch: 12.8104, roll: -3.619, yaw: -1.5747 },
          "23": { date: "21-AUG-2024", time: "23:0:00", pitch: 12.8104, roll: -3.3619, yaw: -1.5747 }
        },
        "22-AUG-2024": {
          "0": { date: "22-AUG-2024", time: "0:0:00", pitch: 13.8104, roll: -3.4619, yaw: -1.6747 },
          "1": { date: "22-AUG-2024", time: "1:0:00", pitch: 13.8104, roll: -3.4619, yaw: -1.6747 },
          "2": { date: "22-AUG-2024", time: "2:0:00", pitch: 13.8104, roll: -3.4619, yaw: -1.6747 },
          "3": { date: "22-AUG-2024", time: "3:0:00", pitch: 13.8104, roll: -3.4619, yaw: -1.6747 },
          "4": { date: "22-AUG-2024", time: "4:0:00", pitch: 13.8104, roll: -3.4619, yaw: -1.6747 },
          "5": { date: "22-AUG-2024", time: "5:0:00", pitch: 13.8104, roll: -3.4619, yaw: -1.6747 },
          "6": { date: "22-AUG-2024", time: "6:0:00", pitch: 2.8104, roll: -3.4619, yaw: -1.6747 },
          "7": { date: "22-AUG-2024", time: "7:0:00", pitch: 13.8104, roll: -3.4619, yaw: -1.6747 },
          "8": { date: "22-AUG-2024", time: "8:0:00", pitch: 13.8104, roll: -3.4619, yaw: -1.57 },
          "9": { date: "22-AUG-2024", time: "9:0:00", pitch: 13.8104, roll: -3.4619, yaw: -1.6747 },
          "10": { date: "22-AUG-2024", time: "10:0:00", pitch: 2.8104, roll: -3.4619, yaw: -1.6747 },
          "11": { date: "22-AUG-2024", time: "11:0:00", pitch: 2.8104, roll: -3.4619, yaw: -1.6747 },
          "12": { date: "22-AUG-2024", time: "12:0:00", pitch: 2.8104, roll: -3.4619, yaw: -1.6747 },
          "13": { date: "22-AUG-2024", time: "13:0:00", pitch: 2.8104, roll: -3.4619, yaw: -1.6747 },
          "14": { date: "22-AUG-2024", time: "14:0:00", pitch: 2.8104, roll: -3.4619, yaw: -1.6747 },
          "15": { date: "22-AUG-2024", time: "15:0:00", pitch: 2.8104, roll: -3.4619, yaw: -1.6747 },
          "16": { date: "22-AUG-2024", time: "16:0:00", pitch: 2.8104, roll: -3.719, yaw: -1.6747 },
          "17": { date: "22-AUG-2024", time: "17:0:00", pitch: 13.8104, roll: -3.719, yaw: -1.6747 },
          "18": null,
          "19": { date: "22-AUG-2024", time: "19:0:00", pitch: 13.8104, roll: -3.719, yaw: -1.6747 },
          "20": { date: "22-AUG-2024", time: "20:0:00", pitch: 13.8104, roll: -3.719, yaw: -1.6747 },
          "21": { date: "22-AUG-2024", time: "21:0:00", pitch: 13.8104, roll: -3.719, yaw: -1.6747 },
          "22": { date: "22-AUG-2024", time: "22:0:00", pitch: 13.8104, roll: -3.719, yaw: -1.6747 },
          "23": { date: "22-AUG-2024", time: "23:0:00", pitch: 13.8104, roll: -3.4619, yaw: -1.6747 }
        }
      };

      //use result in space of testDate for the acutal data

      const stabilityResult = analyzeStability(testData, period);

      return res.status(200).json(
        new apiResponse(200, "Data Processed", {
          hourlyData,
          thresholdBreach,
          stabilityResult,
        })
      );

    });
  } catch (e) {
    console.log(e);
    res.status(500).json(new apiResponse(500, "Internal Server Error", {}));
  }
};

export default processDate;
