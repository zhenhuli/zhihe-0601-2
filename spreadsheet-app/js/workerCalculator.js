import FormulaParser from './formulaParser.js';

class WorkerCalculator {
    constructor() {
        this.parser = new FormulaParser();
        this.taskQueue = [];
        this.isProcessing = false;
        this.listeners = new Map();
        this.currentTaskId = 0;
    }

    evaluate(ast, cells, namedRanges = {}) {
        return new Promise((resolve, reject) => {
            const taskId = ++this.currentTaskId;
            this.taskQueue.push({
                id: taskId,
                type: 'evaluate',
                ast,
                cells,
                namedRanges,
                resolve,
                reject
            });
            this.processQueue();
        });
    }

    evaluateCell(address, parsed, cells, namedRanges = {}) {
        return new Promise((resolve, reject) => {
            const taskId = ++this.currentTaskId;
            this.taskQueue.push({
                id: taskId,
                type: 'evaluateCell',
                address,
                parsed,
                cells,
                namedRanges,
                resolve,
                reject
            });
            this.processQueue();
        });
    }

    evaluateBatch(cellsToCalculate, allCells, namedRanges = {}) {
        return new Promise((resolve, reject) => {
            const taskId = ++this.currentTaskId;
            this.taskQueue.push({
                id: taskId,
                type: 'evaluateBatch',
                cellsToCalculate,
                allCells,
                namedRanges,
                resolve,
                reject
            });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.taskQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        this._notify('calculating', true);

        while (this.taskQueue.length > 0) {
            const task = this.taskQueue.shift();

            try {
                let result;

                await this._yieldToBrowser();

                switch (task.type) {
                    case 'evaluate':
                        result = this._evaluateNode(task.ast, task.cells, task.namedRanges);
                        break;

                    case 'evaluateCell':
                        result = this._evaluateSingleCell(task.address, task.parsed, task.cells, task.namedRanges);
                        break;

                    case 'evaluateBatch':
                        result = await this._evaluateBatch(
                            task.cellsToCalculate,
                            task.allCells,
                            task.namedRanges
                        );
                        break;
                }

                task.resolve(result);
            } catch (e) {
                task.reject(e);
            }
        }

        this.isProcessing = false;
        this._notify('calculating', false);
    }

    async _evaluateBatch(cellsToCalculate, allCells, namedRanges) {
        const results = new Map();
        const batchSize = 5;

        for (let i = 0; i < cellsToCalculate.length; i += batchSize) {
            const batch = cellsToCalculate.slice(i, i + batchSize);

            for (const address of batch) {
                const cell = allCells[address];
                if (cell && cell.parsed && cell.parsed.type === 'formula') {
                    try {
                        const value = this._evaluateNode(cell.parsed.ast, allCells, namedRanges);
                        results.set(address, { value, error: null });
                    } catch (e) {
                        results.set(address, { value: null, error: e.message });
                    }
                }
            }

            if (i + batchSize < cellsToCalculate.length) {
                await this._yieldToBrowser();
                this._notify('progress', {
                    current: i + batch.length,
                    total: cellsToCalculate.length
                });
            }
        }

        return results;
    }

    _evaluateSingleCell(address, parsed, cells, namedRanges) {
        if (!parsed || parsed.type === 'value') {
            return { value: parsed ? parsed.value : null, error: null };
        }

        if (parsed.type === 'error') {
            return { value: null, error: parsed.error };
        }

        try {
            const value = this._evaluateNode(parsed.ast, cells, namedRanges);
            return { value, error: null };
        } catch (e) {
            return { value: null, error: e.message };
        }
    }

    _evaluateNode(node, cells, namedRanges) {
        if (!node) return null;

        switch (node.type) {
            case 'number':
                return node.value;

            case 'string':
                return node.value;

            case 'cellRef':
                return this._getCellValue(node.address, cells);

            case 'rangeRef':
                return this._getRangeValues(node, cells, namedRanges);

            case 'namedRange':
                return this._getNamedRangeValues(node.name, cells, namedRanges);

            case 'binary':
                return this._evaluateBinary(node, cells, namedRanges);

            case 'unary':
                return this._evaluateUnary(node, cells, namedRanges);

            case 'function':
                return this._evaluateFunction(node, cells, namedRanges);

            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    _getCellValue(address, cells) {
        const cell = cells[address];
        if (!cell) return 0;

        if (cell.value !== undefined && cell.value !== null) {
            if (typeof cell.value === 'string') {
                const num = parseFloat(cell.value);
                if (!isNaN(num) && cell.value.trim() !== '') {
                    return num;
                }
                return cell.value;
            }
            return cell.value;
        }

        if (cell.error) {
            throw new Error(`#REF! (${address})`);
        }

        return 0;
    }

    _getRangeValues(rangeNode, cells, namedRanges) {
        const values = [];
        for (let r = rangeNode.startRow; r <= rangeNode.endRow; r++) {
            for (let c = rangeNode.startCol; c <= rangeNode.endCol; c++) {
                const address = `${this.parser.indexToColumn(c)}${r + 1}`;
                try {
                    const val = this._getCellValue(address, cells);
                    if (typeof val === 'number') {
                        values.push(val);
                    }
                } catch (e) {
                }
            }
        }
        return values;
    }

    _getNamedRangeValues(name, cells, namedRanges) {
        const range = namedRanges[name];
        if (!range) {
            throw new Error(`#NAME? Unknown range: ${name}`);
        }

        const values = [];
        for (let r = range.startRow; r <= range.endRow; r++) {
            for (let c = range.startCol; c <= range.endCol; c++) {
                const address = `${this.parser.indexToColumn(c)}${r + 1}`;
                try {
                    const val = this._getCellValue(address, cells);
                    if (typeof val === 'number') {
                        values.push(val);
                    }
                } catch (e) {
                }
            }
        }
        return values;
    }

    _evaluateBinary(node, cells, namedRanges) {
        const left = this._evaluateNode(node.left, cells, namedRanges);
        const right = this._evaluateNode(node.right, cells, namedRanges);

        const leftNum = typeof left === 'number' ? left : parseFloat(left);
        const rightNum = typeof right === 'number' ? right : parseFloat(right);

        if (isNaN(leftNum) || isNaN(rightNum)) {
            if (node.op === '+') {
                return String(left) + String(right);
            }
            throw new Error('#VALUE!');
        }

        switch (node.op) {
            case '+': return leftNum + rightNum;
            case '-': return leftNum - rightNum;
            case '*': return leftNum * rightNum;
            case '/':
                if (rightNum === 0) throw new Error('#DIV/0!');
                return leftNum / rightNum;
            case '^': return Math.pow(leftNum, rightNum);
            default: throw new Error(`#UNKNOWN! Unknown operator: ${node.op}`);
        }
    }

    _evaluateUnary(node, cells, namedRanges) {
        const operand = this._evaluateNode(node.operand, cells, namedRanges);
        const num = typeof operand === 'number' ? operand : parseFloat(operand);

        if (isNaN(num)) {
            throw new Error('#VALUE!');
        }

        switch (node.op) {
            case '+': return num;
            case '-': return -num;
            default: throw new Error(`#UNKNOWN! Unknown unary operator: ${node.op}`);
        }
    }

    _evaluateFunction(node, cells, namedRanges) {
        const funcDef = node.funcDef;
        if (!funcDef) {
            throw new Error(`#NAME? Unknown function: ${node.name}`);
        }

        const args = node.args.map(arg => {
            if (arg.type === 'rangeRef') {
                return this._getRangeValues(arg, cells, namedRanges);
            } else if (arg.type === 'namedRange') {
                return this._getNamedRangeValues(arg.name, cells, namedRanges);
            } else {
                return this._evaluateNode(arg, cells, namedRanges);
            }
        });

        if (funcDef.args === 'range') {
            const values = args[0];
            if (!Array.isArray(values) || values.length === 0) {
                if (node.name === 'COUNT') return 0;
                throw new Error(`#VALUE! ${node.name} requires numeric values`);
            }
            return funcDef.calc(values);
        } else {
            return funcDef.calc(args[0]);
        }
    }

    _yieldToBrowser() {
        return new Promise(resolve => setTimeout(resolve, 0));
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

    cancelAll() {
        this.taskQueue.forEach(task => {
            task.reject(new Error('Task cancelled'));
        });
        this.taskQueue = [];
        this.isProcessing = false;
    }

    getQueueLength() {
        return this.taskQueue.length;
    }

    isBusy() {
        return this.isProcessing || this.taskQueue.length > 0;
    }
}

export default WorkerCalculator;
