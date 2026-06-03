class NamedRangeManager {
    constructor() {
        this.ranges = new Map();
        this.listeners = new Map();
    }

    addRange(name, startRow, startCol, endRow, endCol) {
        name = name.trim().toUpperCase();

        if (!name || !/^[A-Z_][A-Z0-9_]*$/.test(name)) {
            throw new Error('Invalid name. Must start with letter or underscore, contain only letters, numbers, and underscores.');
        }

        if (this.functions.has(name)) {
            throw new Error(`Name "${name}" is reserved for a function.`);
        }

        if (/^[A-Z]+[0-9]+$/.test(name)) {
            throw new Error(`Name "${name}" conflicts with cell address format.`);
        }

        if (this.ranges.has(name)) {
            throw new Error(`Named range "${name}" already exists.`);
        }

        if (startRow > endRow || startCol > endCol) {
            throw new Error('Invalid range: start must be before end.');
        }

        const range = {
            name,
            startRow: Math.min(startRow, endRow),
            startCol: Math.min(startCol, endCol),
            endRow: Math.max(startRow, endRow),
            endCol: Math.max(startCol, endCol),
            createdAt: Date.now()
        };

        range.address = this._getRangeAddress(range);
        range.cellCount = (range.endRow - range.startRow + 1) * (range.endCol - range.startCol + 1);

        this.ranges.set(name, range);
        this._notify('rangeAdded', range);
        return range;
    }

    removeRange(name) {
        name = name.toUpperCase();

        if (!this.ranges.has(name)) {
            throw new Error(`Named range "${name}" does not exist.`);
        }

        const range = this.ranges.get(name);
        this.ranges.delete(name);
        this._notify('rangeRemoved', { name, range });
        return range;
    }

    updateRange(name, startRow, startCol, endRow, endCol) {
        name = name.toUpperCase();

        if (!this.ranges.has(name)) {
            throw new Error(`Named range "${name}" does not exist.`);
        }

        if (startRow > endRow || startCol > endCol) {
            throw new Error('Invalid range: start must be before end.');
        }

        const oldRange = { ...this.ranges.get(name) };

        const range = {
            name,
            startRow: Math.min(startRow, endRow),
            startCol: Math.min(startCol, endCol),
            endRow: Math.max(startRow, endRow),
            endCol: Math.max(startCol, endCol),
            createdAt: oldRange.createdAt,
            updatedAt: Date.now()
        };

        range.address = this._getRangeAddress(range);
        range.cellCount = (range.endRow - range.startRow + 1) * (range.endCol - range.startCol + 1);

        this.ranges.set(name, range);
        this._notify('rangeUpdated', { oldRange, newRange: range });
        return range;
    }

    getRange(name) {
        return this.ranges.get(name.toUpperCase()) || null;
    }

    hasRange(name) {
        return this.ranges.has(name.toUpperCase());
    }

    getAllRanges() {
        return Array.from(this.ranges.values());
    }

    getRangesForCell(row, col) {
        const result = [];
        for (const range of this.ranges.values()) {
            if (row >= range.startRow && row <= range.endRow &&
                col >= range.startCol && col <= range.endCol) {
                result.push(range);
            }
        }
        return result;
    }

    getCellAddresses(range) {
        const addresses = [];
        const parser = {
            indexToColumn: (index) => {
                let col = '';
                index++;
                while (index > 0) {
                    const remainder = (index - 1) % 26;
                    col = String.fromCharCode('A'.charCodeAt(0) + remainder) + col;
                    index = Math.floor((index - 1) / 26);
                }
                return col;
            }
        };

        for (let r = range.startRow; r <= range.endRow; r++) {
            for (let c = range.startCol; c <= range.endCol; c++) {
                addresses.push(`${parser.indexToColumn(c)}${r + 1}`);
            }
        }
        return addresses;
    }

    findRangeByNameOrAddress(identifier) {
        identifier = identifier.toUpperCase();

        if (this.ranges.has(identifier)) {
            return this.ranges.get(identifier);
        }

        for (const range of this.ranges.values()) {
            if (range.address === identifier) {
                return range;
            }
        }

        return null;
    }

    renameRange(oldName, newName) {
        oldName = oldName.toUpperCase();
        newName = newName.trim().toUpperCase();

        if (!this.ranges.has(oldName)) {
            throw new Error(`Named range "${oldName}" does not exist.`);
        }

        if (oldName === newName) {
            return this.ranges.get(oldName);
        }

        if (!newName || !/^[A-Z_][A-Z0-9_]*$/.test(newName)) {
            throw new Error('Invalid name. Must start with letter or underscore, contain only letters, numbers, and underscores.');
        }

        if (this.ranges.has(newName)) {
            throw new Error(`Named range "${newName}" already exists.`);
        }

        if (this.functions.has(newName)) {
            throw new Error(`Name "${newName}" is reserved for a function.`);
        }

        if (/^[A-Z]+[0-9]+$/.test(newName)) {
            throw new Error(`Name "${newName}" conflicts with cell address format.`);
        }

        const range = { ...this.ranges.get(oldName), name: newName, updatedAt: Date.now() };
        this.ranges.delete(oldName);
        this.ranges.set(newName, range);
        this._notify('rangeRenamed', { oldName, newName, range });
        return range;
    }

    clear() {
        const oldRanges = Array.from(this.ranges.values());
        this.ranges.clear();
        this._notify('cleared', oldRanges);
    }

    restoreRange(rangeData) {
        this.ranges.set(rangeData.name, { ...rangeData });
        this._notify('rangeAdded', this.ranges.get(rangeData.name));
        return this.ranges.get(rangeData.name);
    }

    _getRangeAddress(range) {
        const indexToColumn = (index) => {
            let col = '';
            index++;
            while (index > 0) {
                const remainder = (index - 1) % 26;
                col = String.fromCharCode('A'.charCodeAt(0) + remainder) + col;
                index = Math.floor((index - 1) / 26);
            }
            return col;
        };

        const startCol = indexToColumn(range.startCol);
        const endCol = indexToColumn(range.endCol);
        const startRow = range.startRow + 1;
        const endRow = range.endRow + 1;

        return `${startCol}${startRow}:${endCol}${endRow}`;
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        return () => {
            this.listeners.get(event).delete(callback);
        };
    }

    _notify(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    serialize() {
        const data = {};
        for (const [name, range] of this.ranges.entries()) {
            data[name] = { ...range };
        }
        return data;
    }

    deserialize(data) {
        this.clear();

        if (!data) return;

        for (const [name, range] of Object.entries(data)) {
            this.ranges.set(name, { ...range });
        }
    }

    toJSON() {
        return this.serialize();
    }

    get functions() {
        return new Set([
            'SUM', 'AVG', 'AVERAGE', 'MIN', 'MAX', 'COUNT',
            'ABS', 'ROUND', 'SQRT', 'IF', 'AND', 'OR', 'NOT'
        ]);
    }
}

export default NamedRangeManager;
