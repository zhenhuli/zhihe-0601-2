class GridRenderer {
    constructor(container, options = {}) {
        this.container = container;
        this.rows = options.rows || 10;
        this.cols = options.cols || 10;
        this.cells = {};
        this.cellFormats = {};
        this.selection = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
        this.editingCell = null;
        this.listeners = new Map();
        this.parser = options.parser;
        this.groupManager = options.groupManager;

        this._init();
    }

    _init() {
        this._buildGrid();
        this._bindEvents();

        if (this.groupManager) {
            this.groupManager.on('itemsVisibilityChanged', (data) => {
                this._updateVisibility(data);
            });
            this.groupManager.on('groupCreated', () => this._updateGroupIndicators());
            this.groupManager.on('groupRemoved', () => {
                this.render();
                this._updateGroupIndicators();
            });
            this.groupManager.on('groupToggled', () => this._updateGroupIndicators());
        }
    }

    _buildGrid() {
        this.container.innerHTML = '';

        this.table = document.createElement('table');
        this.table.className = 'spreadsheet-grid';
        this.table.tabIndex = 0;

        const colGroup = document.createElement('colgroup');
        for (let c = 0; c <= this.cols; c++) {
            const col = document.createElement('col');
            col.dataset.colIndex = c === 0 ? -1 : c - 1;
            colGroup.appendChild(col);
        }
        this.table.appendChild(colGroup);

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        const cornerCell = document.createElement('th');
        cornerCell.className = 'corner';
        headerRow.appendChild(cornerCell);

        for (let c = 0; c < this.cols; c++) {
            const th = document.createElement('th');
            th.textContent = this._indexToColumn(c);
            th.dataset.colIndex = c;
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        this.table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (let r = 0; r < this.rows; r++) {
            const tr = document.createElement('tr');
            tr.dataset.rowIndex = r;

            const rowHeader = document.createElement('th');
            rowHeader.className = 'row-header';
            rowHeader.textContent = r + 1;
            rowHeader.dataset.rowIndex = r;
            tr.appendChild(rowHeader);

            for (let c = 0; c < this.cols; c++) {
                const td = document.createElement('td');
                td.dataset.row = r;
                td.dataset.col = c;
                td.dataset.address = `${this._indexToColumn(c)}${r + 1}`;
                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        }
        this.table.appendChild(tbody);

        this.container.appendChild(this.table);
    }

    _bindEvents() {
        this.table.addEventListener('click', (e) => this._handleClick(e));
        this.table.addEventListener('dblclick', (e) => this._handleDoubleClick(e));
        this.table.addEventListener('mousedown', (e) => this._handleMouseDown(e));
        this.table.addEventListener('contextmenu', (e) => e.preventDefault());

        document.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this._handleMouseUp(e));

        this.table.addEventListener('keydown', (e) => this._handleKeyDown(e));
    }

    _handleClick(e) {
        const cell = e.target.closest('td');
        if (!cell || e.target.closest('.group-toggle')) return;

        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);

        this.setSelection(row, col, row, col);
        this._notify('cellSelected', { row, col, address: cell.dataset.address });
    }

    _handleDoubleClick(e) {
        const cell = e.target.closest('td');
        if (!cell) return;

        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        this.startEditing(row, col);
    }

    _handleMouseDown(e) {
        const cell = e.target.closest('td');
        const header = e.target.closest('th');

        if (e.target.closest('.group-toggle')) return;

        if (cell) {
            const row = parseInt(cell.dataset.row, 10);
            const col = parseInt(cell.dataset.col, 10);
            this._isDragging = true;
            this._dragStart = { row, col };
            this.setSelection(row, col, row, col);
        } else if (header) {
            if (header.dataset.rowIndex !== undefined) {
                const row = parseInt(header.dataset.rowIndex, 10);
                this._isDragging = true;
                this._dragStart = { row, col: 0 };
                this.setSelection(row, 0, row, this.cols - 1);
            } else if (header.dataset.colIndex !== undefined && !header.classList.contains('corner')) {
                const col = parseInt(header.dataset.colIndex, 10);
                this._isDragging = true;
                this._dragStart = { row: 0, col };
                this.setSelection(0, col, this.rows - 1, col);
            }
        }
    }

    _handleMouseMove(e) {
        if (!this._isDragging) return;

        const cell = e.target.closest('td');
        if (!cell) return;

        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);

        const startRow = Math.min(this._dragStart.row, row);
        const startCol = Math.min(this._dragStart.col, col);
        const endRow = Math.max(this._dragStart.row, row);
        const endCol = Math.max(this._dragStart.col, col);

        this.setSelection(startRow, startCol, endRow, endCol);
    }

    _handleMouseUp(e) {
        if (this._isDragging) {
            this._isDragging = false;
            this._notify('selectionChanged', this.selection);
        }
    }

    _handleKeyDown(e) {
        if (this.editingCell) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.finishEditing(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelEditing();
            }
            return;
        }

        const { startRow, startCol } = this.selection;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.setSelection(Math.max(0, startRow - 1), startCol);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.setSelection(Math.min(this.rows - 1, startRow + 1), startCol);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.setSelection(startRow, Math.max(0, startCol - 1));
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.setSelection(startRow, Math.min(this.cols - 1, startCol + 1));
                break;
            case 'Enter':
                e.preventDefault();
                this.startEditing(startRow, startCol);
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                this._clearSelection();
                break;
            case 'F2':
                e.preventDefault();
                this.startEditing(startRow, startCol);
                break;
        }
    }

    setSelection(startRow, startCol, endRow = startRow, endCol = startCol) {
        this.selection = { startRow, startCol, endRow, endCol };

        this.table.querySelectorAll('td.selected').forEach(td => {
            td.classList.remove('selected', 'selection-range');
        });

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const td = this._getCellElement(r, c);
                if (td) {
                    td.classList.add('selected');
                    if (r !== startRow || c !== startCol) {
                        td.classList.add('selection-range');
                    }
                }
            }
        }

        this._notify('selectionChanged', this.selection);
    }

    getSelection() {
        return { ...this.selection };
    }

    getSelectedCells() {
        const cells = [];
        for (let r = this.selection.startRow; r <= this.selection.endRow; r++) {
            for (let c = this.selection.startCol; c <= this.selection.endCol; c++) {
                cells.push({ row: r, col: c, address: `${this._indexToColumn(c)}${r + 1}` });
            }
        }
        return cells;
    }

    startEditing(row, col) {
        if (this.editingCell) {
            this.finishEditing(false);
        }

        const cell = this._getCellElement(row, col);
        if (!cell) return;

        this.editingCell = { row, col, address: `${this._indexToColumn(col)}${row + 1}` };

        const cellData = this.cells[this.editingCell.address] || {};
        const editValue = cellData.rawValue !== undefined ? cellData.rawValue : '';

        cell.classList.add('editing');
        cell.innerHTML = `<input type="text" value="${this._escapeHtml(String(editValue))}" />`;

        const input = cell.querySelector('input');
        input.focus();
        input.select();

        this._notify('editingStarted', this.editingCell);
    }

    finishEditing(moveDown = false) {
        if (!this.editingCell) return;

        const editingCell = { ...this.editingCell };
        const cell = this._getCellElement(editingCell.row, editingCell.col);
        const input = cell ? cell.querySelector('input') : null;

        let valueChanged = false;
        let changeNotification = null;

        if (input) {
            const value = input.value;
            cell.classList.remove('editing');
            cell.innerHTML = '';

            const address = editingCell.address;
            const oldValue = this.cells[address] ? this.cells[address].rawValue : undefined;

            if (value !== oldValue) {
                this.setCellValue(address, value);
                changeNotification = {
                    address,
                    oldValue,
                    newValue: value
                };
                valueChanged = true;
            }
        } else if (cell) {
            cell.classList.remove('editing');
            cell.innerHTML = '';
        }

        this.editingCell = null;

        if (changeNotification) {
            this.updateCell(changeNotification.address);
            this._notify('cellValueChanged', changeNotification);
        } else {
            this.updateCell(editingCell.address);
        }

        if (moveDown && editingCell.row < this.rows - 1) {
            this.setSelection(editingCell.row + 1, editingCell.col);
        }

        this._notify('editingFinished', editingCell);
    }

    cancelEditing() {
        if (!this.editingCell) return;

        const editingCell = { ...this.editingCell };
        const cell = this._getCellElement(editingCell.row, editingCell.col);
        cell.classList.remove('editing');
        cell.innerHTML = '';

        this.editingCell = null;
        this.updateCell(editingCell.address);

        this._notify('editingCancelled', null);
    }

    setCellValue(address, value) {
        const parsed = this.parser ? this.parser.parse(value) : { type: 'value', value };

        const oldCell = this.cells[address] || {};

        this.cells[address] = {
            rawValue: value,
            parsed: parsed,
            value: parsed.type === 'value' ? this._parseValue(value) : null,
            error: parsed.type === 'error' ? parsed.error : null,
            format: oldCell.format || 'default'
        };

        this.updateCell(address);
    }

    setCellData(address, data) {
        this.cells[address] = { ...data };
        this.updateCell(address);
    }

    getCellValue(address) {
        const cell = this.cells[address];
        if (!cell) return null;
        return cell.value;
    }

    getCellData(address) {
        return this.cells[address] || null;
    }

    getCellFormat(address) {
        const cell = this.cells[address];
        return cell ? cell.format : 'default';
    }

    setCellFormat(address, format) {
        if (!this.cells[address]) {
            this.cells[address] = { rawValue: '', parsed: { type: 'value', value: '' }, value: null, format };
        } else {
            this.cells[address].format = format;
        }
        this.updateCell(address);
    }

    setCellCalculatedValue(address, value, error = null) {
        if (!this.cells[address]) {
            this.cells[address] = {};
        }
        this.cells[address].value = value;
        this.cells[address].error = error;
        this.updateCell(address);
    }

    updateCell(address) {
        const match = address.match(/^([A-Z]+)([0-9]+)$/);
        if (!match) return;

        const col = this._columnToIndex(match[1]);
        const row = parseInt(match[2], 10) - 1;

        const cell = this._getCellElement(row, col);
        if (!cell) return;

        if (this.editingCell && this.editingCell.address === address) {
            return;
        }

        const cellData = this.cells[address];
        cell.classList.remove('error', 'formula', 'text-left');

        if (!cellData) {
            cell.textContent = '';
            return;
        }

        if (cellData.error) {
            cell.textContent = cellData.error;
            cell.classList.add('error');
            return;
        }

        const displayValue = this._formatValue(cellData.value, cellData.format);
        cell.textContent = displayValue;

        if (cellData.parsed && cellData.parsed.type === 'formula') {
            cell.classList.add('formula');
        }

        if (typeof cellData.value === 'string') {
            cell.classList.add('text-left');
        }
    }

    render() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const address = `${this._indexToColumn(c)}${r + 1}`;
                this.updateCell(address);
            }
        }

        this._updateGroupIndicators();
    }

    _clearSelection() {
        const cells = this.getSelectedCells();
        const changes = [];

        cells.forEach(({ address }) => {
            const oldValue = this.cells[address] ? this.cells[address].rawValue : undefined;
            if (oldValue !== undefined && oldValue !== '') {
                changes.push({ address, oldValue, newValue: '' });
                this.setCellValue(address, '');
            }
        });

        if (changes.length > 0) {
            this._notify('cellsCleared', changes);
        }
    }

    _formatValue(value, format = 'default') {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        if (typeof value === 'string') {
            return value;
        }

        if (typeof value !== 'number') {
            return String(value);
        }

        switch (format) {
            case 'number':
                return value.toFixed(2);
            case 'percent':
                return (value * 100).toFixed(2) + '%';
            case 'currency':
                return '¥' + value.toFixed(2);
            default:
                if (Math.abs(value) >= 1e10 || (Math.abs(value) < 0.0001 && value !== 0)) {
                    return value.toExponential(4);
                }
                const str = value.toString();
                if (str.length > 12) {
                    return value.toFixed(4);
                }
                return str;
        }
    }

    _parseValue(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const num = parseFloat(value);
        if (!isNaN(num) && String(num) === value.trim()) {
            return num;
        }

        return value;
    }

    _updateVisibility(data) {
        const { type, items, visible } = data;

        if (type === 'row') {
            items.forEach(index => {
                const tr = this.table.querySelector(`tr[data-row-index="${index}"]`);
                if (tr) {
                    tr.classList.toggle('hidden', !visible);
                }
            });
        } else if (type === 'col') {
            const cols = this.table.querySelectorAll('col');
            items.forEach(index => {
                if (cols[index + 1]) {
                    cols[index + 1].classList.toggle('hidden', !visible);
                }
                const ths = this.table.querySelectorAll(`th[data-col-index="${index}"]`);
                ths.forEach(th => th.classList.toggle('hidden', !visible));
                const tds = this.table.querySelectorAll(`td[data-col="${index}"]`);
                tds.forEach(td => td.classList.toggle('hidden', !visible));
            });
        }
    }

    _updateGroupIndicators() {
        this.table.querySelectorAll('.group-toggle').forEach(el => el.remove());
        this.table.querySelectorAll('.group-toggle-col').forEach(el => el.remove());

        if (!this.groupManager) return;

        const rowGroups = this.groupManager.getAllGroups('row');
        const colGroups = this.groupManager.getAllGroups('col');

        rowGroups.forEach(group => {
            const headerRow = this.table.querySelector(`tr[data-row-index="${group.end}"] th.row-header`);
            if (headerRow) {
                headerRow.style.position = 'relative';
                const toggle = document.createElement('button');
                toggle.className = `group-toggle ${group.collapsed ? 'collapsed' : 'expanded'}`;
                toggle.style.left = `${-16 - group.level * 12}px`;
                toggle.title = group.collapsed ? '展开' : '折叠';
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.groupManager.toggleGroup(group.id);
                });
                headerRow.appendChild(toggle);
            }
        });

        colGroups.forEach(group => {
            const headerCol = this.table.querySelector(`th[data-col-index="${group.end}"]`);
            if (headerCol) {
                headerCol.style.position = 'relative';
                const toggle = document.createElement('button');
                toggle.className = `group-toggle group-toggle-col ${group.collapsed ? 'collapsed' : 'expanded'}`;
                toggle.style.position = 'absolute';
                toggle.style.top = `${-16 - group.level * 12}px`;
                toggle.style.left = '50%';
                toggle.style.transform = 'translateX(-50%)';
                toggle.title = group.collapsed ? '展开' : '折叠';
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.groupManager.toggleGroup(group.id);
                });
                headerCol.appendChild(toggle);
            }
        });
    }

    _getCellElement(row, col) {
        return this.table.querySelector(`td[data-row="${row}"][data-col="${col}"]`);
    }

    _indexToColumn(index) {
        let col = '';
        index++;
        while (index > 0) {
            const remainder = (index - 1) % 26;
            col = String.fromCharCode('A'.charCodeAt(0) + remainder) + col;
            index = Math.floor((index - 1) / 26);
        }
        return col;
    }

    _columnToIndex(colStr) {
        let index = 0;
        for (let i = 0; i < colStr.length; i++) {
            index = index * 26 + (colStr.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
        }
        return index - 1;
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    getAllCellsData() {
        const data = {};
        for (const [address, cell] of Object.entries(this.cells)) {
            data[address] = { ...cell };
        }
        return data;
    }

    setAllCellsData(data) {
        this.cells = {};
        for (const [address, cellData] of Object.entries(data || {})) {
            this.cells[address] = { ...cellData };
        }
        this.render();
    }

    clearAll() {
        this.cells = {};
        this.cellFormats = {};
        this.editingCell = null;
        this.selection = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
        this.render();
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

    focus() {
        this.table.focus();
    }
}

export default GridRenderer;
