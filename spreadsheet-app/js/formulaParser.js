class FormulaParser {
    constructor() {
        this.pos = 0;
        this.input = '';
        this.functions = {
            'SUM': { args: 'range', calc: (values) => values.reduce((a, b) => a + b, 0) },
            'AVG': { args: 'range', calc: (values) => values.reduce((a, b) => a + b, 0) / values.length },
            'AVERAGE': { args: 'range', calc: (values) => values.reduce((a, b) => a + b, 0) / values.length },
            'MIN': { args: 'range', calc: (values) => Math.min(...values) },
            'MAX': { args: 'range', calc: (values) => Math.max(...values) },
            'COUNT': { args: 'range', calc: (values) => values.filter(v => typeof v === 'number' && !isNaN(v)).length },
            'ABS': { args: 'single', calc: (v) => Math.abs(v) },
            'ROUND': { args: 'single', calc: (v) => Math.round(v * 100) / 100 },
            'SQRT': { args: 'single', calc: (v) => Math.sqrt(v) }
        };
    }

    parse(formula) {
        if (!formula || typeof formula !== 'string') {
            return { type: 'value', value: formula };
        }

        const trimmed = formula.trim();
        if (trimmed.length === 0 || (trimmed[0] !== '=' && trimmed[0] !== '＝')) {
            return { type: 'value', value: formula };
        }

        this.input = trimmed.substring(1).replace(/\s+/g, '');
        this.pos = 0;

        try {
            const ast = this.parseExpression();
            if (this.pos < this.input.length) {
                throw new Error(`Unexpected character at position ${this.pos}: "${this.input[this.pos]}"`);
            }
            return { type: 'formula', ast, formula: formula };
        } catch (e) {
            return { type: 'error', error: e.message, formula: formula };
        }
    }

    parseExpression() {
        let left = this.parseTerm();

        while (this.pos < this.input.length && (this.input[this.pos] === '+' || this.input[this.pos] === '-')) {
            const op = this.input[this.pos++];
            const right = this.parseTerm();
            left = { type: 'binary', op, left, right };
        }

        return left;
    }

    parseTerm() {
        let left = this.parseFactor();

        while (this.pos < this.input.length && (this.input[this.pos] === '*' || this.input[this.pos] === '/')) {
            const op = this.input[this.pos++];
            const right = this.parseFactor();
            left = { type: 'binary', op, left, right };
        }

        return left;
    }

    parseFactor() {
        let left = this.parsePrimary();

        if (this.pos < this.input.length && this.input[this.pos] === '^') {
            this.pos++;
            const right = this.parseFactor();
            return { type: 'binary', op: '^', left, right };
        }

        return left;
    }

    parsePrimary() {
        if (this.pos >= this.input.length) {
            throw new Error('Unexpected end of expression');
        }

        const char = this.input[this.pos];

        if (char === '(') {
            this.pos++;
            const expr = this.parseExpression();
            if (this.input[this.pos] !== ')') {
                throw new Error('Missing closing parenthesis');
            }
            this.pos++;
            return expr;
        }

        if (char === '-' || char === '+') {
            const op = this.pos++;
            const operand = this.parsePrimary();
            return { type: 'unary', op: char, operand };
        }

        if (char >= '0' && char <= '9' || char === '.') {
            return this.parseNumber();
        }

        if (char === '"') {
            return this.parseString();
        }

        if (char >= 'A' && char <= 'Z' || char >= 'a' && char <= 'z' || char === '_') {
            return this.parseIdentifier();
        }

        throw new Error(`Unexpected character: "${char}" at position ${this.pos}`);
    }

    parseNumber() {
        const start = this.pos;
        while (this.pos < this.input.length && 
               (this.input[this.pos] >= '0' && this.input[this.pos] <= '9' || this.input[this.pos] === '.')) {
            this.pos++;
        }
        const numStr = this.input.substring(start, this.pos);
        const value = parseFloat(numStr);
        if (isNaN(value)) {
            throw new Error(`Invalid number: ${numStr}`);
        }
        return { type: 'number', value };
    }

    parseString() {
        this.pos++;
        const start = this.pos;
        while (this.pos < this.input.length && this.input[this.pos] !== '"') {
            if (this.input[this.pos] === '\\') {
                this.pos++;
            }
            this.pos++;
        }
        if (this.pos >= this.input.length) {
            throw new Error('Unterminated string literal');
        }
        const value = this.input.substring(start, this.pos);
        this.pos++;
        return { type: 'string', value };
    }

    parseIdentifier() {
        const start = this.pos;
        while (this.pos < this.input.length && 
               (this.input[this.pos] >= 'A' && this.input[this.pos] <= 'Z' ||
                this.input[this.pos] >= 'a' && this.input[this.pos] <= 'z' ||
                this.input[this.pos] >= '0' && this.input[this.pos] <= '9' ||
                this.input[this.pos] === '_')) {
            this.pos++;
        }
        const ident = this.input.substring(start, this.pos).toUpperCase();

        if (this.pos < this.input.length && this.input[this.pos] === '(') {
            return this.parseFunction(ident);
        }

        if (/^[A-Z]+[0-9]+$/.test(ident)) {
            return this.parseCellRef(ident);
        }

        if (this.pos < this.input.length && this.input[this.pos] === ':') {
            return this.parseRangeRef(ident);
        }

        return { type: 'namedRange', name: ident };
    }

    parseCellRef(ident) {
        const match = ident.match(/^([A-Z]+)([0-9]+)$/);
        if (!match) {
            throw new Error(`Invalid cell reference: ${ident}`);
        }
        const col = this.columnToIndex(match[1]);
        const row = parseInt(match[2], 10) - 1;
        return { type: 'cellRef', col, row, address: ident };
    }

    parseRangeRef(startIdent) {
        this.pos++;
        const endStart = this.pos;
        while (this.pos < this.input.length && 
               (this.input[this.pos] >= 'A' && this.input[this.pos] <= 'Z' ||
                this.input[this.pos] >= 'a' && this.input[this.pos] <= 'z' ||
                this.input[this.pos] >= '0' && this.input[this.pos] <= '9')) {
            this.pos++;
        }
        const endIdent = this.input.substring(endStart, this.pos).toUpperCase();

        const startMatch = startIdent.match(/^([A-Z]+)([0-9]+)$/);
        const endMatch = endIdent.match(/^([A-Z]+)([0-9]+)$/);

        if (!startMatch || !endMatch) {
            throw new Error(`Invalid range reference: ${startIdent}:${endIdent}`);
        }

        const startCol = this.columnToIndex(startMatch[1]);
        const startRow = parseInt(startMatch[2], 10) - 1;
        const endCol = this.columnToIndex(endMatch[1]);
        const endRow = parseInt(endMatch[2], 10) - 1;

        return {
            type: 'rangeRef',
            startCol: Math.min(startCol, endCol),
            startRow: Math.min(startRow, endRow),
            endCol: Math.max(startCol, endCol),
            endRow: Math.max(startRow, endRow),
            address: `${startIdent}:${endIdent}`
        };
    }

    parseFunction(funcName) {
        this.pos++;

        const funcDef = this.functions[funcName];
        if (!funcDef) {
            throw new Error(`Unknown function: ${funcName}`);
        }

        const args = [];

        if (this.input[this.pos] !== ')') {
            do {
                if (funcDef.args === 'range') {
                    args.push(this.parseRangeArgument());
                } else {
                    args.push(this.parseExpression());
                }
            } while (this.pos < this.input.length && this.input[this.pos++] === ',');
            this.pos--;
        }

        if (this.input[this.pos] !== ')') {
            throw new Error(`Missing closing parenthesis for function ${funcName}`);
        }
        this.pos++;

        return {
            type: 'function',
            name: funcName,
            args,
            funcDef
        };
    }

    parseRangeArgument() {
        const char = this.input[this.pos];

        if (char >= 'A' && char <= 'Z' || char >= 'a' && char <= 'z') {
            const start = this.pos;
            while (this.pos < this.input.length && 
                   (this.input[this.pos] >= 'A' && this.input[this.pos] <= 'Z' ||
                    this.input[this.pos] >= 'a' && this.input[this.pos] <= 'z' ||
                    this.input[this.pos] >= '0' && this.input[this.pos] <= '9' ||
                    this.input[this.pos] === '_')) {
                this.pos++;
            }
            const ident = this.input.substring(start, this.pos).toUpperCase();

            if (this.pos < this.input.length && this.input[this.pos] === ':') {
                return this.parseRangeRef(ident);
            }

            if (/^[A-Z]+[0-9]+$/.test(ident)) {
                const ref = this.parseCellRef(ident);
                return {
                    type: 'rangeRef',
                    startCol: ref.col,
                    startRow: ref.row,
                    endCol: ref.col,
                    endRow: ref.row,
                    address: ref.address
                };
            }

            return { type: 'namedRange', name: ident };
        }

        return this.parseExpression();
    }

    columnToIndex(colStr) {
        let index = 0;
        for (let i = 0; i < colStr.length; i++) {
            index = index * 26 + (colStr.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
        }
        return index - 1;
    }

    indexToColumn(index) {
        let col = '';
        index++;
        while (index > 0) {
            const remainder = (index - 1) % 26;
            col = String.fromCharCode('A'.charCodeAt(0) + remainder) + col;
            index = Math.floor((index - 1) / 26);
        }
        return col;
    }

    getDependencies(ast, namedRanges = {}) {
        const deps = new Set();
        this._collectDeps(ast, deps, namedRanges);
        return Array.from(deps);
    }

    _collectDeps(node, deps, namedRanges) {
        if (!node) return;

        switch (node.type) {
            case 'cellRef':
                deps.add(`${this.indexToColumn(node.col)}${node.row + 1}`);
                break;

            case 'rangeRef':
                for (let r = node.startRow; r <= node.endRow; r++) {
                    for (let c = node.startCol; c <= node.endCol; c++) {
                        deps.add(`${this.indexToColumn(c)}${r + 1}`);
                    }
                }
                break;

            case 'namedRange':
                const range = namedRanges[node.name];
                if (range) {
                    for (let r = range.startRow; r <= range.endRow; r++) {
                        for (let c = range.startCol; c <= range.endCol; c++) {
                            deps.add(`${this.indexToColumn(c)}${r + 1}`);
                        }
                    }
                }
                break;

            case 'binary':
                this._collectDeps(node.left, deps, namedRanges);
                this._collectDeps(node.right, deps, namedRanges);
                break;

            case 'unary':
                this._collectDeps(node.operand, deps, namedRanges);
                break;

            case 'function':
                node.args.forEach(arg => this._collectDeps(arg, deps, namedRanges));
                break;
        }
    }

    formatParseTree(ast, indent = 0) {
        if (!ast) return '';

        const spaces = '  '.repeat(indent);
        let result = '';

        switch (ast.type) {
            case 'number':
                result = `${spaces}<span class="node-type">number</span> <span class="node-value">${ast.value}</span>\n`;
                break;

            case 'string':
                result = `${spaces}<span class="node-type">string</span> <span class="node-value">"${ast.value}"</span>\n`;
                break;

            case 'cellRef':
                result = `${spaces}<span class="node-type">cellRef</span> <span class="node-value">${ast.address}</span>\n`;
                break;

            case 'rangeRef':
                result = `${spaces}<span class="node-type">rangeRef</span> <span class="node-value">${ast.address}</span>\n`;
                break;

            case 'namedRange':
                result = `${spaces}<span class="node-type">namedRange</span> <span class="node-value">${ast.name}</span>\n`;
                break;

            case 'binary':
                result = `${spaces}<span class="node-type">binary</span> <span class="node-op">${ast.op}</span>\n`;
                result += this.formatParseTree(ast.left, indent + 1);
                result += this.formatParseTree(ast.right, indent + 1);
                break;

            case 'unary':
                result = `${spaces}<span class="node-type">unary</span> <span class="node-op">${ast.op}</span>\n`;
                result += this.formatParseTree(ast.operand, indent + 1);
                break;

            case 'function':
                result = `${spaces}<span class="node-type">function</span> <span class="node-value">${ast.name}</span>\n`;
                ast.args.forEach((arg, i) => {
                    result += `${spaces}  arg[${i}]:\n`;
                    result += this.formatParseTree(arg, indent + 2);
                });
                break;

            case 'error':
                result = `${spaces}<span class="node-type">error</span> <span style="color: #ea4335">${ast.error}</span>\n`;
                break;

            default:
                result = `${spaces}<span class="node-type">${ast.type}</span>\n`;
        }

        return result;
    }
}

export default FormulaParser;
