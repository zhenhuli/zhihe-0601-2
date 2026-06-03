import FormulaParser from './formulaParser.js';
import DependencyGraph from './dependencyGraph.js';
import WorkerCalculator from './workerCalculator.js';
import GroupManager from './groupManager.js';
import NamedRangeManager from './namedRangeManager.js';
import UndoRedoManager from './undoRedo.js';
import GridRenderer from './gridRenderer.js';

class SpreadsheetApp {
    constructor() {
        this.parser = new FormulaParser();
        this.dependencyGraph = new DependencyGraph();
        this.calculator = new WorkerCalculator();
        this.groupManager = new GroupManager();
        this.namedRangeManager = new NamedRangeManager();
        this.undoRedo = new UndoRedoManager(20);
        this.grid = null;

        this.isCalculating = false;
        this.pendingRecalculation = false;
        this.autoSaveInterval = null;
        this.isSaving = false;
        this.needsSave = false;
        this.selectedNamedRange = null;

        this._init();
    }

    async _init() {
        this._initGrid();
        this._bindEvents();
        this._initCalculatorListeners();
        this._initUndoRedoListeners();
        this._initGroupListeners();
        this._initNamedRangeListeners();

        await this._initDatabase();
        await this._loadFromStorage();

        this._startAutoSave();
        this._updateUI();
        this._updateStatus('就绪');
    }

    _initGrid() {
        const container = document.getElementById('grid-container');
        this.grid = new GridRenderer(container, {
            rows: 10,
            cols: 10,
            parser: this.parser,
            groupManager: this.groupManager
        });
    }

    _bindEvents() {
        this.grid.on('cellValueChanged', (data) => this._handleCellValueChanged(data));
        this.grid.on('cellSelected', (data) => this._handleCellSelected(data));
        this.grid.on('selectionChanged', () => this._updateFormulaBar());
        this.grid.on('cellsCleared', (changes) => this._handleCellsCleared(changes));
        this.grid.on('editingStarted', (data) => this._handleEditingStarted(data));

        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());
        document.getElementById('btn-save').addEventListener('click', () => this._manualSave());

        document.getElementById('btn-group-rows').addEventListener('click', () => this._createRowGroup());
        document.getElementById('btn-group-cols').addEventListener('click', () => this._createColGroup());
        document.getElementById('btn-ungroup').addEventListener('click', () => this._ungroupSelected());

        document.getElementById('btn-add-range').addEventListener('click', () => this._addNamedRange());
        document.getElementById('btn-delete-range').addEventListener('click', () => this._deleteSelectedRange());

        document.getElementById('cell-format').addEventListener('change', (e) => this._changeCellFormat(e.target.value));

        const formulaBar = document.getElementById('formula-bar');
        formulaBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._applyFormulaBarValue();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this._cancelFormulaBar();
            }
        });

        document.getElementById('modal-confirm').addEventListener('click', () => this._handleModalConfirm());
        document.getElementById('modal-cancel').addEventListener('click', () => this._hideModal());

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this._manualSave();
            }
        });
    }

    _initCalculatorListeners() {
        this.calculator.on('calculating', (isCalculating) => {
            this.isCalculating = isCalculating;
            const statusEl = document.getElementById('calc-status');
            statusEl.className = isCalculating ? 'calculating' : 'idle';
            statusEl.textContent = isCalculating ? '计算状态: 计算中...' : '计算状态: 空闲';
        });

        this.calculator.on('progress', (progress) => {
            this._updateStatus(`计算中... ${progress.current}/${progress.total}`);
        });
    }

    _initUndoRedoListeners() {
        this.undoRedo.on('stateChanged', () => {
            this._updateUndoRedoButtons();
        });
    }

    _initGroupListeners() {
        this.groupManager.on('groupCreated', () => {
            this._renderGroupsList();
            this._markDirty();
        });

        this.groupManager.on('groupRemoved', () => {
            this._renderGroupsList();
            this._markDirty();
        });

        this.groupManager.on('groupToggled', () => {
            this._renderGroupsList();
            this._markDirty();
        });
    }

    _initNamedRangeListeners() {
        this.namedRangeManager.on('rangeAdded', () => {
            this._renderNamedRangesList();
            this._markDirty();
        });

        this.namedRangeManager.on('rangeRemoved', () => {
            this._renderNamedRangesList();
            this._markDirty();
        });

        this.namedRangeManager.on('rangeUpdated', () => {
            this._renderNamedRangesList();
            this._markDirty();
            this._recalculateAll();
        });

        this.namedRangeManager.on('rangeRenamed', () => {
            this._renderNamedRangesList();
            this._markDirty();
            this._rebuildDependencyGraph();
            this._recalculateAll();
        });
    }

    _handleCellValueChanged({ address, oldValue, newValue }) {
        const action = this.undoRedo.createCellEditAction(
            address,
            oldValue,
            newValue,
            (addr, val) => this._applyCellValue(addr, val)
        );

        this.undoRedo.execute(action);
        this._markDirty();
    }

    _handleCellsCleared(changes) {
        const undoRedoChanges = changes.map(c => ({
            address: c.address,
            oldValue: c.oldValue,
            newValue: c.newValue
        }));

        const action = this.undoRedo.createBatchEditAction(
            undoRedoChanges,
            (addr, val) => this._applyCellValue(addr, val)
        );

        this.undoRedo.execute(action);
        this._markDirty();
    }

    _applyCellValue(address, value) {
        this.grid.setCellValue(address, value);
        this._processCellChange(address);
    }

    async _processCellChange(address) {
        const cellData = this.grid.getCellData(address);

        if (!cellData || !cellData.parsed) return;

        if (cellData.parsed.type === 'formula') {
            const deps = this.parser.getDependencies(cellData.parsed.ast, this.namedRangeManager.serialize());

            this.dependencyGraph.updateDependencies(address, deps);

            const cycleCheck = this.dependencyGraph.detectCycleForNode(address);
            if (cycleCheck.hasCycle) {
                this.grid.setCellCalculatedValue(address, null, `#CIRCULAR! ${cycleCheck.cycle.join(' -> ')}`);
                this.dependencyGraph.removeNode(address);
                return;
            }
        } else {
            this.dependencyGraph.removeNode(address);
        }

        await this._queueRecalculation(address);
    }

    async _queueRecalculation(changedAddress) {
        if (this.isCalculating) {
            this.pendingRecalculation = true;
            return;
        }

        try {
            const calcOrder = this.dependencyGraph.getCalculationOrder([changedAddress]);
            const cellsData = this.grid.getAllCellsData();
            const namedRanges = this.namedRangeManager.serialize();

            const results = await this.calculator.evaluateBatch(calcOrder, cellsData, namedRanges);

            results.forEach((result, address) => {
                this.grid.setCellCalculatedValue(address, result.value, result.error);
            });

            if (this.pendingRecalculation) {
                this.pendingRecalculation = false;
                await this._queueRecalculation(changedAddress);
            }
        } catch (e) {
            this._updateStatus(`错误: ${e.message}`);
            console.error('Calculation error:', e);
        }

        this._updateParseTree();
    }

    async _recalculateAll() {
        const cellsData = this.grid.getAllCellsData();
        const formulaCells = [];

        for (const [address, cell] of Object.entries(cellsData)) {
            if (cell.parsed && cell.parsed.type === 'formula') {
                formulaCells.push(address);
            }
        }

        if (formulaCells.length === 0) return;

        try {
            const calcOrder = this.dependencyGraph.getCalculationOrder([]);
            const orderedCells = calcOrder.filter(addr => formulaCells.includes(addr));

            if (orderedCells.length === 0) {
                for (const address of formulaCells) {
                    await this._processCellChange(address);
                }
                return;
            }

            const namedRanges = this.namedRangeManager.serialize();
            const results = await this.calculator.evaluateBatch(orderedCells, cellsData, namedRanges);

            results.forEach((result, address) => {
                this.grid.setCellCalculatedValue(address, result.value, result.error);
            });
        } catch (e) {
            this._updateStatus(`错误: ${e.message}`);
        }
    }

    _rebuildDependencyGraph() {
        this.dependencyGraph.clear();
        const cellsData = this.grid.getAllCellsData();
        const namedRanges = this.namedRangeManager.serialize();

        for (const [address, cell] of Object.entries(cellsData)) {
            if (cell.parsed && cell.parsed.type === 'formula') {
                const deps = this.parser.getDependencies(cell.parsed.ast, namedRanges);
                this.dependencyGraph.updateDependencies(address, deps);
            }
        }
    }

    _handleCellSelected({ row, col, address }) {
        document.getElementById('cell-address').textContent = address;
        this._updateFormulaBar();
        this._updateParseTree();

        const format = this.grid.getCellFormat(address);
        document.getElementById('cell-format').value = format;

        this._deselectNamedRange();
    }

    _handleEditingStarted({ address }) {
        const cellData = this.grid.getCellData(address);
        const formulaBar = document.getElementById('formula-bar');
        formulaBar.value = cellData && cellData.rawValue !== undefined ? cellData.rawValue : '';
    }

    _updateFormulaBar() {
        const selection = this.grid.getSelection();
        const address = `${this._indexToColumn(selection.startCol)}${selection.startRow + 1}`;
        const cellData = this.grid.getCellData(address);

        const formulaBar = document.getElementById('formula-bar');
        if (!this.grid.editingCell) {
            formulaBar.value = cellData && cellData.rawValue !== undefined ? cellData.rawValue : '';
        }
    }

    _applyFormulaBarValue() {
        const formulaBar = document.getElementById('formula-bar');
        const value = formulaBar.value;

        const selection = this.grid.getSelection();
        const address = `${this._indexToColumn(selection.startCol)}${selection.startRow + 1}`;

        const oldValue = this.grid.getCellData(address)?.rawValue;

        if (this.grid.editingCell) {
            this.grid.finishEditing(false);
        } else {
            if (value !== oldValue) {
                const action = this.undoRedo.createCellEditAction(
                    address,
                    oldValue,
                    value,
                    (addr, val) => this._applyCellValue(addr, val)
                );
                this.undoRedo.execute(action);
                this._markDirty();
            }
        }

        this.grid.focus();
    }

    _cancelFormulaBar() {
        this._updateFormulaBar();
        this.grid.focus();
    }

    _updateParseTree() {
        const selection = this.grid.getSelection();
        const address = `${this._indexToColumn(selection.startCol)}${selection.startRow + 1}`;
        const cellData = this.grid.getCellData(address);

        const parseTreeEl = document.getElementById('parse-tree');

        if (!cellData || !cellData.parsed || cellData.parsed.type !== 'formula') {
            parseTreeEl.innerHTML = '<p class="hint">选择一个包含公式的单元格查看解析树</p>';
            return;
        }

        let html = '';
        html += `<div><strong>${cellData.rawValue}</strong></div>\n`;
        html += `<div style="margin-top: 8px;">`;

        if (cellData.parsed.ast) {
            html += this.parser.formatParseTree(cellData.parsed.ast);
        } else {
            html += '<p style="color: #ea4335">公式解析失败</p>';
        }

        html += `</div>`;
        html += `<div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e0e0e0;">`;
        html += `<strong>依赖项:</strong> `;

        try {
            const deps = this.parser.getDependencies(cellData.parsed.ast, this.namedRangeManager.serialize());
            html += deps.length > 0 ? deps.join(', ') : '无';
        } catch (e) {
            html += `<span style="color: #ea4335">${e.message}</span>`;
        }

        html += `</div>`;

        parseTreeEl.innerHTML = html;
    }

    _createRowGroup() {
        const selection = this.grid.getSelection();
        if (selection.startRow === selection.endRow) {
            alert('请选择至少2行来创建分组');
            return;
        }

        try {
            const groupData = {
                type: 'row',
                start: selection.startRow,
                end: selection.endRow,
                collapsed: false,
                parentId: null,
                level: 0,
                children: []
            };

            const action = this.undoRedo.createGroupAction(
                groupData,
                'row',
                (g) => this._restoreGroup(g),
                (id) => this.groupManager.removeGroup(id)
            );

            this.undoRedo.execute(action);
        } catch (e) {
            alert(`创建分组失败: ${e.message}`);
        }
    }

    _createColGroup() {
        const selection = this.grid.getSelection();
        if (selection.startCol === selection.endCol) {
            alert('请选择至少2列来创建分组');
            return;
        }

        try {
            const groupData = {
                type: 'col',
                start: selection.startCol,
                end: selection.endCol,
                collapsed: false,
                parentId: null,
                level: 0,
                children: []
            };

            const action = this.undoRedo.createGroupAction(
                groupData,
                'col',
                (g) => this._restoreGroup(g),
                (id) => this.groupManager.removeGroup(id)
            );

            this.undoRedo.execute(action);
        } catch (e) {
            alert(`创建分组失败: ${e.message}`);
        }
    }

    _restoreGroup(group) {
        this.groupManager.restoreGroup(group);
        this._renderGroupsList();
        this.grid.render();
    }

    _ungroupSelected() {
        const selection = this.grid.getSelection();
        const rowGroups = this.groupManager.getAllGroups('row');
        const colGroups = this.groupManager.getAllGroups('col');

        let foundGroup = null;

        for (const group of rowGroups) {
            if (selection.startRow >= group.start && selection.endRow <= group.end) {
                if (!foundGroup || (group.end - group.start) < (foundGroup.end - foundGroup.start)) {
                    foundGroup = group;
                }
            }
        }

        for (const group of colGroups) {
            if (selection.startCol >= group.start && selection.endCol <= group.end) {
                if (!foundGroup || (group.end - group.start) < (foundGroup.end - foundGroup.start)) {
                    foundGroup = group;
                }
            }
        }

        if (!foundGroup) {
            alert('请选择包含分组的区域');
            return;
        }

        try {
            const group = { ...foundGroup };

            const action = this.undoRedo.createUngroupAction(
                group,
                (id) => this.groupManager.removeGroup(id),
                (g) => this._restoreGroup(g)
            );

            this.undoRedo.execute(action);
        } catch (e) {
            alert(`取消分组失败: ${e.message}`);
        }
    }

    _renderGroupsList() {
        const container = document.getElementById('groups-list');
        const rowGroups = this.groupManager.getAllGroups('row');
        const colGroups = this.groupManager.getAllGroups('col');

        let html = '';

        const renderGroup = (group, indent = 0) => {
            const indentStyle = `padding-left: ${indent * 16}px`;
            const typeLabel = group.type === 'row' ? '行' : '列';
            const startLabel = group.type === 'row' ? group.start + 1 : this._indexToColumn(group.start);
            const endLabel = group.type === 'row' ? group.end + 1 : this._indexToColumn(group.end);
            const collapsedLabel = group.collapsed ? '已折叠' : '已展开';

            html += `<div class="group-item" data-group-id="${group.id}" style="${indentStyle}">
                <div class="group-info">
                    <span>${typeLabel}分组 ${startLabel}-${endLabel}</span>
                    <span class="group-type">${collapsedLabel}</span>
                </div>
                <div class="group-actions">
                    <button data-toggle="${group.id}">${group.collapsed ? '展开' : '折叠'}</button>
                    <button data-remove="${group.id}">删除</button>
                </div>
            </div>`;

            group.children.forEach(child => renderGroup(child, indent + 1));
        };

        if (rowGroups.length === 0 && colGroups.length === 0) {
            html = '<p style="color: #9aa0a6; font-size: 12px; padding: 8px;">暂无分组</p>';
        } else {
            rowGroups.forEach(g => renderGroup(g));
            colGroups.forEach(g => renderGroup(g));
        }

        container.innerHTML = html;

        container.querySelectorAll('[data-toggle]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.groupManager.toggleGroup(parseInt(btn.dataset.toggle, 10));
            });
        });

        container.querySelectorAll('[data-remove]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = parseInt(btn.dataset.remove, 10);
                const group = this.groupManager.findGroupById(groupId);
                if (group) {
                    const groupCopy = { ...group };
                    const action = this.undoRedo.createUngroupAction(
                        groupCopy,
                        (id) => this.groupManager.removeGroup(id),
                        (g) => this._restoreGroup(g)
                    );
                    this.undoRedo.execute(action);
                }
            });
        });
    }

    _addNamedRange() {
        const selection = this.grid.getSelection();

        if (selection.startRow === selection.endRow && selection.startCol === selection.endCol) {
            alert('请选择至少2个单元格来创建命名区域');
            return;
        }

        this._showModal('创建命名区域', '请输入区域名称:', (name) => {
            if (!name || !name.trim()) {
                alert('请输入有效的名称');
                return false;
            }

            try {
                const nameTrimmed = name.trim().toUpperCase();

                if (!/^[A-Z_][A-Z0-9_]*$/.test(nameTrimmed)) {
                    throw new Error('Invalid name. Must start with letter or underscore, contain only letters, numbers, and underscores.');
                }

                if (this.namedRangeManager.functions.has(nameTrimmed)) {
                    throw new Error(`Name "${nameTrimmed}" is reserved for a function.`);
                }

                if (/^[A-Z]+[0-9]+$/.test(nameTrimmed)) {
                    throw new Error(`Name "${nameTrimmed}" conflicts with cell address format.`);
                }

                if (this.namedRangeManager.hasRange(nameTrimmed)) {
                    throw new Error(`Named range "${nameTrimmed}" already exists.`);
                }

                const rangeData = {
                    name: nameTrimmed,
                    startRow: Math.min(selection.startRow, selection.endRow),
                    startCol: Math.min(selection.startCol, selection.endCol),
                    endRow: Math.max(selection.startRow, selection.endRow),
                    endCol: Math.max(selection.startCol, selection.endCol),
                    createdAt: Date.now()
                };

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

                rangeData.address = `${parser.indexToColumn(rangeData.startCol)}${rangeData.startRow + 1}:${parser.indexToColumn(rangeData.endCol)}${rangeData.endRow + 1}`;
                rangeData.cellCount = (rangeData.endRow - rangeData.startRow + 1) * (rangeData.endCol - rangeData.startCol + 1);

                const action = this.undoRedo.createNamedRangeAction(
                    rangeData,
                    (r) => this._restoreNamedRange(r),
                    (n) => this.namedRangeManager.removeRange(n)
                );

                this.undoRedo.execute(action);

                this._rebuildDependencyGraph();
                this._recalculateAll();

                return true;
            } catch (e) {
                alert(`创建命名区域失败: ${e.message}`);
                return false;
            }
        });
    }

    _restoreNamedRange(range) {
        this.namedRangeManager.restoreRange(range);
        this._renderNamedRangesList();
    }

    _deleteSelectedRange() {
        if (!this.selectedNamedRange) {
            alert('请先选择要删除的命名区域');
            return;
        }

        const range = this.namedRangeManager.getRange(this.selectedNamedRange);
        if (!range) return;

        if (!confirm(`确定要删除命名区域 "${range.name}" 吗?`)) {
            return;
        }

        const rangeCopy = { ...range };
        const action = this.undoRedo.createRemoveNamedRangeAction(
            rangeCopy,
            (n) => this.namedRangeManager.removeRange(n),
            (r) => this._restoreNamedRange(r)
        );

        this.undoRedo.execute(action);

        this.selectedNamedRange = null;
        this._rebuildDependencyGraph();
        this._recalculateAll();
    }

    _renderNamedRangesList() {
        const container = document.getElementById('named-ranges-list');
        const ranges = this.namedRangeManager.getAllRanges();

        if (ranges.length === 0) {
            container.innerHTML = '<p style="color: #9aa0a6; font-size: 12px; padding: 8px;">暂无命名区域</p>';
            return;
        }

        let html = '';
        ranges.forEach(range => {
            const selected = this.selectedNamedRange === range.name ? 'selected' : '';
            html += `<div class="named-range-item ${selected}" data-range="${range.name}">
                <div class="range-name">${range.name}</div>
                <div class="range-def">${range.address} (${range.cellCount} 个单元格)</div>
            </div>`;
        });

        container.innerHTML = html;

        container.querySelectorAll('.named-range-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectedNamedRange = item.dataset.range;
                this._renderNamedRangesList();

                const range = this.namedRangeManager.getRange(this.selectedNamedRange);
                if (range) {
                    this.grid.setSelection(range.startRow, range.startCol, range.endRow, range.endCol);
                }
            });

            item.addEventListener('dblclick', () => {
                const oldName = item.dataset.range;
                this._showModal('重命名区域', '请输入新名称:', (newName) => {
                    try {
                        this.namedRangeManager.renameRange(oldName, newName);
                        return true;
                    } catch (e) {
                        alert(`重命名失败: ${e.message}`);
                        return false;
                    }
                });
            });
        });
    }

    _deselectNamedRange() {
        this.selectedNamedRange = null;
        this._renderNamedRangesList();
    }

    _changeCellFormat(format) {
        const selection = this.grid.getSelection();
        const cells = this.grid.getSelectedCells();

        if (cells.length === 0) return;

        const firstAddress = cells[0].address;
        const oldFormat = this.grid.getCellFormat(firstAddress);

        if (cells.length === 1) {
            const action = this.undoRedo.createFormatAction(
                firstAddress,
                oldFormat,
                format,
                (addr, fmt) => this.grid.setCellFormat(addr, fmt)
            );
            this.undoRedo.execute(action);
        } else {
            this.undoRedo.startTransaction(`设置 ${cells.length} 个单元格格式`);
            cells.forEach(cell => {
                const cellOldFormat = this.grid.getCellFormat(cell.address);
                const action = this.undoRedo.createFormatAction(
                    cell.address,
                    cellOldFormat,
                    format,
                    (addr, fmt) => this.grid.setCellFormat(addr, fmt)
                );
                this.undoRedo.execute(action);
            });
            this.undoRedo.endTransaction();
        }

        this._markDirty();
    }

    async undo() {
        if (!this.undoRedo.canUndo()) return;

        try {
            this.grid.cancelEditing();
            await this.undoRedo.undo();
            this._rebuildDependencyGraph();
            this._updateParseTree();
            this._markDirty();
        } catch (e) {
            console.error('Undo error:', e);
        }
    }

    async redo() {
        if (!this.undoRedo.canRedo()) return;

        try {
            this.grid.cancelEditing();
            await this.undoRedo.redo();
            this._rebuildDependencyGraph();
            this._updateParseTree();
            this._markDirty();
        } catch (e) {
            console.error('Redo error:', e);
        }
    }

    _updateUndoRedoButtons() {
        const state = this.undoRedo.getState();
        document.getElementById('btn-undo').disabled = !state.canUndo;
        document.getElementById('btn-redo').disabled = !state.canRedo;
        document.getElementById('btn-undo').title = state.undoLabel ? `撤销: ${state.undoLabel} (Ctrl+Z)` : '撤销 (Ctrl+Z)';
        document.getElementById('btn-redo').title = state.redoLabel ? `重做: ${state.redoLabel} (Ctrl+Y)` : '重做 (Ctrl+Y)';
    }

    async _initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SpreadsheetDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('spreadsheet')) {
                    db.createObjectStore('spreadsheet', { keyPath: 'id' });
                }
            };
        });
    }

    async _saveToStorage() {
        if (!this.db) return;

        this.isSaving = true;
        this._updateSaveStatus('saving');

        try {
            const data = {
                id: 'main',
                timestamp: Date.now(),
                cells: this.grid.getAllCellsData(),
                groups: this.groupManager.serialize(),
                namedRanges: this.namedRangeManager.serialize(),
                dependencyGraph: this.dependencyGraph.serialize()
            };

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['spreadsheet'], 'readwrite');
                const store = transaction.objectStore('spreadsheet');
                const request = store.put(data);

                request.onsuccess = () => {
                    this.isSaving = false;
                    this.needsSave = false;
                    this._updateSaveStatus('saved');
                    resolve();
                };

                request.onerror = () => {
                    this.isSaving = false;
                    this._updateSaveStatus('error');
                    reject(request.error);
                };
            });
        } catch (e) {
            this.isSaving = false;
            this._updateSaveStatus('error');
            console.error('Save error:', e);
        }
    }

    async _loadFromStorage() {
        if (!this.db) return;

        try {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['spreadsheet'], 'readonly');
                const store = transaction.objectStore('spreadsheet');
                const request = store.get('main');

                request.onsuccess = () => {
                    const data = request.result;
                    if (data) {
                        this.grid.setAllCellsData(data.cells || {});
                        this.groupManager.deserialize(data.groups);
                        this.namedRangeManager.deserialize(data.namedRanges);
                        this.dependencyGraph.deserialize(data.dependencyGraph);

                        this._renderGroupsList();
                        this._renderNamedRangesList();

                        this.grid.render();
                        this._recalculateAll();
                    }
                    resolve();
                };

                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error('Load error:', e);
        }
    }

    _startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (this.needsSave && !this.isSaving) {
                this._saveToStorage();
            }
        }, 10000);
    }

    async _manualSave() {
        if (!this.isSaving) {
            await this._saveToStorage();
        }
    }

    _markDirty() {
        this.needsSave = true;
        this._updateSaveStatus('saving');
    }

    _updateSaveStatus(status) {
        const statusEl = document.getElementById('save-status');
        statusEl.className = `save-status ${status}`;

        switch (status) {
            case 'saving':
                statusEl.textContent = '保存中...';
                break;
            case 'saved':
                statusEl.textContent = '已保存 ✓';
                break;
            case 'error':
                statusEl.textContent = '保存失败';
                break;
            default:
                statusEl.textContent = '已保存';
        }
    }

    _showModal(title, placeholder, onConfirm) {
        const overlay = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const inputEl = document.getElementById('modal-input');

        titleEl.textContent = title;
        inputEl.placeholder = placeholder;
        inputEl.value = '';

        overlay.classList.remove('hidden');
        inputEl.focus();

        this._modalCallback = onConfirm;
    }

    _handleModalConfirm() {
        const input = document.getElementById('modal-input');
        const value = input.value;

        if (this._modalCallback) {
            const result = this._modalCallback(value);
            if (result !== false) {
                this._hideModal();
            }
        }
    }

    _hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        this._modalCallback = null;
    }

    _updateStatus(text) {
        document.getElementById('status-text').textContent = text;
    }

    _updateUI() {
        this._updateUndoRedoButtons();
        this._renderGroupsList();
        this._renderNamedRangesList();
        this.grid.render();
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
}

document.addEventListener('DOMContentLoaded', () => {
    new SpreadsheetApp();
});
