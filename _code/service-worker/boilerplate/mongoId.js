/**
 *
 * @param {number} timestamp
 * @param {number} machineId
 * @param {number} processId
 * @param {number} counter
 * @returns {string}
 */
const generateObjectId_ = (timestamp, machineId, processId, counter) => {
    const hexTimestamp = Math.floor(timestamp / 1000).toString(16).padStart(8, '0');
    const hexMachineId = machineId.toString(16).padStart(6, '0');
    const hexProcessId = processId.toString(16).padStart(4, '0');
    const hexCounter = counter.toString(16).padStart(6, '0');
    return hexTimestamp + hexMachineId + hexProcessId + hexCounter;
};
let objIdCounter = 0;
const generateObjectId = () => generateObjectId_(Date.now(), 0, 0, objIdCounter++);
