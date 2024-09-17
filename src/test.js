import { describe, it } from 'mocha';
import { expect } from 'chai';
import { calculateStabilityPeriods, calculateDuration } from './controllers/newco.js';

describe('calculateStabilityPeriods', () => {
    it('should calculate stability periods correctly', () => {
        const data = {
            '2023-10-01': {
                0: { pitch: 1, roll: 2, yaw: 3, time: '00:00:00' },
                1: { pitch: 1, roll: 2, yaw: 3, time: '01:00:00' },
                2: { pitch: 1, roll: 2, yaw: 3, time: '02:00:00' },
                3: { pitch: 4, roll: 5, yaw: 6, time: '03:00:00' },
                4: { pitch: 4, roll: 5, yaw: 6, time: '04:00:00' },
                5: { pitch: 7, roll: 8, yaw: 9, time: '05:00:00' },
            },
        };

        const expected = {
            '2023-10-01': {
                pitch: [
                    { startTime: '00:00:00', endTime: '02:00:00', duration: '2h 0m 0s' },
                    { startTime: '03:00:00', endTime: '04:00:00', duration: '1h 0m 0s' },
                ],
                roll: [
                    { startTime: '00:00:00', endTime: '02:00:00', duration: '2h 0m 0s' },
                    { startTime: '03:00:00', endTime: '04:00:00', duration: '1h 0m 0s' },
                ],
                yaw: [
                    { startTime: '00:00:00', endTime: '02:00:00', duration: '2h 0m 0s' },
                    { startTime: '03:00:00', endTime: '04:00:00', duration: '1h 0m 0s' },
                ],
            },
        };

        const result = calculateStabilityPeriods(data);
        expect(result).to.deep.equal(expected);
    });

    it('should handle empty data', () => {
        const data = {};
        const expected = {};
        const result = calculateStabilityPeriods(data);
        expect(result).to.deep.equal(expected);
    });

    it('should handle data with no stability periods', () => {
        const data = {
            '2023-10-01': {
                0: { pitch: 1, roll: 2, yaw: 3, time: '00:00:00' },
                1: { pitch: 4, roll: 5, yaw: 6, time: '01:00:00' },
                2: { pitch: 7, roll: 8, yaw: 9, time: '02:00:00' },
            },
        };

        const expected = {
            '2023-10-01': {
                pitch: [],
                roll: [],
                yaw: [],
            },
        };

        const result = calculateStabilityPeriods(data);
        expect(result).to.deep.equal(expected);
    });

    it('should handle data with mixed stability periods', () => {
        const data = {
            '2023-10-01': {
                0: { pitch: 1, roll: 2, yaw: 3, time: '00:00:00' },
                1: { pitch: 1, roll: 5, yaw: 6, time: '01:00:00' },
                2: { pitch: 1, roll: 5, yaw: 6, time: '02:00:00' },
                3: { pitch: 4, roll: 5, yaw: 6, time: '03:00:00' },
                4: { pitch: 4, roll: 5, yaw: 6, time: '04:00:00' },
                5: { pitch: 7, roll: 8, yaw: 9, time: '05:00:00' },
            },
        };

        const expected = {
            '2023-10-01': {
                pitch: [
                    { startTime: '00:00:00', endTime: '02:00:00', duration: '2h 0m 0s' },
                    { startTime: '03:00:00', endTime: '04:00:00', duration: '1h 0m 0s' },
                ],
                roll: [
                    { startTime: '01:00:00', endTime: '04:00:00', duration: '3h 0m 0s' },
                ],
                yaw: [
                    { startTime: '01:00:00', endTime: '04:00:00', duration: '3h 0m 0s' },
                ],
            },
        };

        const result = calculateStabilityPeriods(data);
        expect(result).to.deep.equal(expected);
    });

    it('should handle data with null entries', () => {
        const data = {
            '2023-10-01': {
                0: { pitch: 1, roll: 2, yaw: 3, time: '00:00:00' },
                1: null,
                2: { pitch: 1, roll: 2, yaw: 3, time: '02:00:00' },
                3: { pitch: 4, roll: 5, yaw: 6, time: '03:00:00' },
                4: null,
                5: { pitch: 7, roll: 8, yaw: 9, time: '05:00:00' },
            },
        };

        const expected = {
            '2023-10-01': {
                pitch: [
                    { startTime: '00:00:00', endTime: '02:00:00', duration: '2h 0m 0s' },
                ],
                roll: [
                    { startTime: '00:00:00', endTime: '02:00:00', duration: '2h 0m 0s' },
                ],
                yaw: [
                    { startTime: '00:00:00', endTime: '02:00:00', duration: '2h 0m 0s' },
                ],
            },
        };

        const result = calculateStabilityPeriods(data);
        expect(result).to.deep.equal(expected);
    });
});

describe('calculateDuration', () => {
    it('should calculate duration correctly', () => {
        const startTime = '00:00:00';
        const endTime = '02:30:45';
        const expected = '2h 30m 45s';
        const result = calculateDuration(startTime, endTime);
        expect(result).to.equal(expected);
    });

    it('should handle same start and end time', () => {
        const startTime = '00:00:00';
        const endTime = '00:00:00';
        const expected = '0h 0m 0s';
        const result = calculateDuration(startTime, endTime);
        expect(result).to.equal(expected);
    });

    it('should handle end time before start time', () => {
        const startTime = '02:30:45';
        const endTime = '00:00:00';
        const expected = '-2h -30m -45s';
        const result = calculateDuration(startTime, endTime);
        expect(result).to.equal(expected);
    });

    it('should handle times with different hours, minutes, and seconds', () => {
        const startTime = '01:15:30';
        const endTime = '03:45:15';
        const expected = '2h 29m 45s';
        const result = calculateDuration(startTime, endTime);
        expect(result).to.equal(expected);
    });

    it('should handle times with only minutes and seconds difference', () => {
        const startTime = '00:00:00';
        const endTime = '00:45:30';
        const expected = '0h 45m 30s';
        const result = calculateDuration(startTime, endTime);
        expect(result).to.equal(expected);
    });

    it('should handle times with only seconds difference', () => {
        const startTime = '00:00:00';
        const endTime = '00:00:45';
        const expected = '0h 0m 45s';
        const result = calculateDuration(startTime, endTime);
        expect(result).to.equal(expected);
    });
});