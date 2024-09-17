import fs from 'fs';
import readline from 'readline';
import { apiResponse } from '../config/apiResponse.js';
import { ResultModel } from '../models/result.js';
import historyModel from '../models/History.js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import Threshold from '../models/thresholds.js';

async function processData(req, res) {
  try {
    let { startDateTime, endDateTime, gsat_number } = req.body;
    console.log(startDateTime, endDateTime, gsat_number);
    const fileStream = fs.createReadStream('gs9_drc_tab.out');
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let data = {}

    const func = async () => {
      const necData = await Threshold.find({id : "66e414f1944b8a64a6c0118c"})
      console.log(necData[0])
      data = necData[0]
    }
    func()

    const thresholds =  {
      yaw: data.yaw,
      roll: data.roll,
      pitch: data.pitch
    }



    // thresholds = {
    //   yaw: data.yaw,
    //   roll: data.roll,
    //   pitch: data.pitch
    // }

    console.log("thresholds", thresholds)

    const lowerLimit = data?.samplingTime?.min || 0
    const upperLimit = data?.samplingTime?.max || 10

    const period = data.period

    gsat_number = gsat_number ? gsat_number : data.gsat;

    let [sdate, stime] = startDateTime ? startDateTime.split('T') : ["2024-08-21", "00:00:00"];
    let [edate, etime] = endDateTime ? endDateTime.split('T') : ["2024-08-21", "23:59:59"];

    const [syear, smonth, sday] = sdate.split('-').map(Number);
    const [eyear, emonth, eday] = edate.split('-').map(Number);

    const [shour, smin, ssec] = stime.split(':').map(Number);
    const [ehour, emin, esec] = etime.split(':').map(Number);

    const startDateTimeAfterChange = new Date(syear, smonth - 1, sday, shour, smin, ssec);
    const endDateTimeAfterChange = new Date(eyear, emonth - 1, eday, ehour, emin, esec);



    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const dateRegex = /\b\d{2}\s{1,}[A-Za-z]{3}\s{1,}\d{4}\b/;

    let currentDate = null;
    let prevObj = null;
    let currentHour = null;
    let currentHourData = [];

    let hourlyData = [];
    let thresholdArr = [];
    let thresholdViolationPeriod = [];
    let parameterExceedingPeriod = [];
    let lastPushTime = null;

    const isValid = (line) => {
      return !line.trim().startsWith('DRC') &&
        !line.trim().startsWith('DTG') &&
        !line.trim().startsWith('GSAT') &&
        !line.trim().startsWith('Available') &&
        !line.trim().startsWith('DD') &&
        !line.trim().startsWith('Required') &&
        !line.trim().startsWith(' ') &&
        line.trim() !== '' &&
        !line.trim().startsWith('END');
    };

    const isTimeWithinLimit = (dateStr, time) => {
      const [day, monthName, year] = dateStr.split(' ');
      const monthIndex = monthNames.indexOf(monthName);
      const [hh, mm, ss] = time.split(':');
      const dateObj = new Date(Number(year), monthIndex, Number(day), Number(hh), Number(mm), Number(ss));

      return dateObj >= startDateTimeAfterChange && dateObj <= endDateTimeAfterChange;
    };

    const newEntryOfTime = (currentObj, prevObj) => {
      if (!prevObj) return true;

      const currentTime = currentObj.time.split(':');
      const curHr = currentTime[0];
      const curMin = currentTime[1];
      const prevTime = prevObj.time.split(':');
      const prevHr = prevTime[0];
      const prevMin = prevTime[1];

      return Number(curMin) >= Number(prevMin) && Number(curHr) !== Number(prevHr);
    };

    const isWithin5thTo10thMinute = (time) => {
      // console.log(lowerLimit)
      const [hh, mm] = time.split(':').map(Number);
      return mm >= Number(lowerLimit) && mm <= Number(upperLimit);
    };

    const isNewHour = (time) => {
      const [hh] = time.split(':').map(Number);
      return hh !== currentHour;
    };

    const processNewHourData = () => {
      // Check all values between 0th and 10th minute in currentHourData
      for (const obj of currentHourData) {
        if (isValidValues(obj, hourlyData[hourlyData.length - 1])) {
          if (!hourlyData.some(entry => entry.date === obj.date && entry.time === obj.time && entry.roll === obj.roll && entry.yaw === obj.yaw && entry.pitch === obj.pitch)) {
            hourlyData.push(obj);
          }
        }
      }
      currentHourData = []; // Reset for next hour
    };

    const isValidValues = (curr, prev) => {
      return curr?.yaw !== prev?.yaw || curr?.roll !== prev?.roll || curr?.pitch !== prev?.pitch;
    };

    const thresholdCrossed = (data) => {
      const { yaw, roll, pitch } = data;
      const thresholdLimits = thresholds;
      let crossings = [];

      if (yaw !== null && yaw < thresholdLimits.yaw.min) {
        crossings.push({ type: 'yaw', value: yaw, limit: 'lower', amount: thresholdLimits.yaw.min - yaw });
      }
      if (yaw !== null && yaw > thresholdLimits.yaw.max) {
        crossings.push({ type: 'yaw', value: yaw, limit: 'upper', amount: yaw - thresholdLimits.yaw.max });
      }
      if (roll !== null && roll < thresholdLimits.roll.min) {
        crossings.push({ type: 'roll', value: roll, limit: 'lower', amount: thresholdLimits.roll.min - roll });
      }
      if (roll !== null && roll > thresholdLimits.roll.max) {
        crossings.push({ type: 'roll', value: roll, limit: 'upper', amount: roll - thresholdLimits.roll.max });
      }
      if (pitch !== null && pitch < thresholdLimits.pitch.min) {
        crossings.push({ type: 'pitch', value: pitch, limit: 'lower', amount: thresholdLimits.pitch.min - pitch });
      }
      if (pitch !== null && pitch > thresholdLimits.pitch.max) {
        crossings.push({ type: 'pitch', value: pitch, limit: 'upper', amount: pitch - thresholdLimits.pitch.max });
      }

      return crossings.length > 0 ? crossings : null;
    };

    const addViolationPeriod = (currentObj, thresholdCrossings, previousCrossingTime) => {
      const endTime = currentObj.time;
      thresholdCrossings.forEach((crossing) => {
        const newEntry = {
          key: crossing.type,
          startTime: previousCrossingTime,
          endTime: endTime,
          date: currentObj.date,
          value: crossing.value
        };
        if (!thresholdViolationPeriod.some(item => item.key === newEntry.key && item.startTime === newEntry.startTime && item.endTime === newEntry.endTime && item.date === newEntry.date && item.value === newEntry.value)) {
          thresholdViolationPeriod.push(newEntry);
        }
      });
    };

    let thresholdStartTime = null;

    rl.on('line', (line) => {
      if (!isValid(line)) {
        return;
      }

      if (line.trim().match(dateRegex)) {
        const fields = line.trim().split(/\s+/);
        currentDate = `${fields[0]} ${fields[1]} ${fields[2]}`;
        return;
      }

      if (currentDate) {
        const fields = line.trim().split(/\s+/);
        const time = `${fields[0]}:${fields[1]}:${fields[2]}`;
        const pitch = fields[4];
        const roll = fields[5];
        const yaw = fields[6];

        const currentObj = {
          date: currentDate,
          time: time,
          roll: roll !== '---' ? parseFloat(roll) : null,
          yaw: yaw !== '---' ? parseFloat(yaw) : null,
          pitch: pitch !== '---' ? parseFloat(pitch) : null,
        };

        if (isWithin5thTo10thMinute(time)) {
          if (isNewHour(time)) {
            processNewHourData();
            currentHour = time.split(':')[0];
          }

          // if (Number(currentDate.split(' ')[0]) > Number(sday)) {
          //   return
          // }

          if (isTimeWithinLimit(currentDate, time)) {
            if (isValidValues(currentObj, hourlyData[hourlyData.length - 1])) {
              if (!hourlyData.some(entry => entry.date === currentObj.date && entry.time === currentObj.time && entry.roll === currentObj.roll && entry.yaw === currentObj.yaw && entry.pitch === currentObj.pitch)) {
                hourlyData.push(currentObj);
              }
            }

            const thresholdCrosst = thresholdCrossed(currentObj);
            if (thresholdCrosst) {
              if (!thresholdArr.some(entry => entry.actualObj.date === currentObj.date && entry.actualObj.time === currentObj.time && entry.actualObj.roll === currentObj.roll && entry.actualObj.yaw === currentObj.yaw && entry.actualObj.pitch === currentObj.pitch)) {
                thresholdArr.push({
                  actualObj: currentObj,
                  crossedVal: thresholdCrosst
                });
              }

              if (!thresholdStartTime) {
                thresholdStartTime = time;
              }
              addViolationPeriod(currentObj, thresholdCrosst, thresholdStartTime);
            } else {
              thresholdStartTime = null;
            }
          }
          prevObj = currentObj;
        } else if (isNewHour(time)) {
          processNewHourData();
          currentHour = time.split(':')[0];
        } else {
          currentHourData.push(currentObj);
        }
      }
    });


    rl.on('close', async () => {
      const checkStabilities = (arr) => {
        const stableData = [];

        let counter = {
          yawCounter: 1,
          rollCounter: 1,
          pitchCounter: 1,
        };

        let stableStart = {
          yawStart: null,
          rollStart: null,
          pitchStart: null,
        };

        const isDuplicate = (newEntry) => {
          return stableData.some(existingEntry =>
            existingEntry.type === newEntry.type &&
            existingEntry.start.time === newEntry.start.time &&
            existingEntry.start.date === newEntry.start.date &&
            existingEntry.end.time === newEntry.end.time &&
            existingEntry.end.date === newEntry.end.date &&
            existingEntry.value === newEntry.value
          );
        };

        const hasMoreThanFourHours = (start, end) => {
          const startTime = new Date(`${start.date} ${start.time}`).getTime();
          const endTime = new Date(`${end.date} ${end.time}`).getTime();
          return (endTime - startTime) >= (4 * 60 * 60 * 1000); // 4 hours in milliseconds
        };

        for (let i = 1; i < arr.length; i++) {
          const prev = arr[i - 1];
          const curr = arr[i];

          if (curr.yaw === prev.yaw) {
            if (counter.yawCounter === 1) {
              stableStart.yawStart = { time: prev.time, date: prev.date };
            }
            counter.yawCounter++;
          } else {
            if (counter.yawCounter >= 4) {
              const newEntry = {
                type: 'yaw',
                start: stableStart.yawStart,
                end: { time: prev.time, date: prev.date },
                value: prev.yaw
              };
              if (!isDuplicate(newEntry) && hasMoreThanFourHours(newEntry.start, newEntry.end)) {
                stableData.push(newEntry);
              }
            }
            counter.yawCounter = 1;
            stableStart.yawStart = null;
          }

          if (curr.roll === prev.roll) {
            if (counter.rollCounter === 1) {
              stableStart.rollStart = { time: prev.time, date: prev.date };
            }
            counter.rollCounter++;
          } else {
            if (counter.rollCounter >= Number(period)) {
              const newEntry = {
                type: 'roll',
                start: stableStart.rollStart,
                end: { time: prev.time, date: prev.date },
                value: prev.roll
              };
              if (!isDuplicate(newEntry) && hasMoreThanFourHours(newEntry.start, newEntry.end)) {
                stableData.push(newEntry);
              }
            }
            counter.rollCounter = 1;
            stableStart.rollStart = null;
          }

          if (curr.pitch === prev.pitch) {
            if (counter.pitchCounter === 1) {
              stableStart.pitchStart = { time: prev.time, date: prev.date };
            }
            counter.pitchCounter++;
          } else {
            if (counter.pitchCounter >= Number(period)) {
              const newEntry = {
                type: 'pitch',
                start: stableStart.pitchStart,
                end: { time: prev.time, date: prev.date },
                value: prev.pitch
              };
              if (!isDuplicate(newEntry) && hasMoreThanFourHours(newEntry.start, newEntry.end)) {
                stableData.push(newEntry);
              }
            }
            counter.pitchCounter = 1;
            stableStart.pitchStart = null;
          }
        }

        // Handle last entry if stable
        if (counter.yawCounter >= Number(period)) {
          const newEntry = {
            type: 'yaw',
            start: stableStart.yawStart,
            end: { time: arr[arr.length - 1].time, date: arr[arr.length - 1].date },
            value: arr[arr.length - 1].yaw
          };
          if (!isDuplicate(newEntry) && hasMoreThanFourHours(newEntry.start, newEntry.end)) {
            stableData.push(newEntry);
          }
        }
        if (counter.rollCounter >= Number(period)) {
          const newEntry = {
            type: 'roll',
            start: stableStart.rollStart,
            end: { time: arr[arr.length - 1].time, date: arr[arr.length - 1].date },
            value: arr[arr.length - 1].roll
          };
          if (!isDuplicate(newEntry) && hasMoreThanFourHours(newEntry.start, newEntry.end)) {
            stableData.push(newEntry);
          }
        }
        if (counter.pitchCounter >= Number(period)) {
          const newEntry = {
            type: 'pitch',
            start: stableStart.pitchStart,
            end: { time: arr[arr.length - 1].time, date: arr[arr.length - 1].date },
            value: arr[arr.length - 1].pitch
          };
          if (!isDuplicate(newEntry) && hasMoreThanFourHours(newEntry.start, newEntry.end)) {
            stableData.push(newEntry);
          }
        }

        return stableData;
      };

      const stablePeriod = checkStabilities(hourlyData);

      // const hrlyData = await ResultModel.create({
      //   date: startDateTime,
      //   endDate: endDateTime,
      //   gsat_number: gsat_number,
      //   result: hourlyData.slice(0, 100),
      //   thresholdArr: thresholdArr.slice(3, 100),
      //   inactivity: stablePeriod.slice(0, 100),
      //   stabilityArr: thresholdViolationPeriod.slice(0, 100)
      // });

      const hrlyData = await ResultModel.create({
          date: startDateTime,
          endDate: endDateTime,
          gsat_number: gsat_number,
          result: hourlyData,
          thresholdArr: thresholdArr,
          inactivity: stablePeriod,
          stabilityArr: thresholdViolationPeriod
        });

      const { jwtToken } = req.cookies;
      const payload = await jwt.decode(jwtToken, process.env.JWT_SECRET_TOKEN);
      const name = "Darshan";
      const id = uuidv4();

      const historyData = await historyModel.create({
        userId: name,
        id,
        gsat: data.gsat,
        searchedDate: sdate,
      });

      if (!hrlyData && !historyData) {
        return res.json(new apiResponse(405, "Cannot add it to the database", {})).status(405);
      }
      return res.json(new apiResponse(200, "Retrieved successfully", hrlyData));
    });


  } catch (e) {
    console.log(e);
    return res.json(new apiResponse(500, "Error processing data", e));
  }
}

export default processData;
