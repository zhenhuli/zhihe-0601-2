class UndoRedoManager {
    constructor(maxHistory = 20) {
        this.maxHistory = maxHistory;
        this.undoStack = [];
        this.redoStack = [];
        this.currentTransaction = null;
        this.isUndoing = false;
        this.isRedoing = false;
        this.listeners = new Map();
    }

    startTransaction(label) {
        if (this.currentTransaction) {
            throw new Error('Transaction already in progress');
        }
        this.currentTransaction = {
            label,
            actions: [],
            timestamp: Date.now()
        };
    }

    endTransaction() {
        if (!this.currentTransaction) {
            throw new Error('No transaction in progress');
        }

        if (this.currentTransaction.actions.length > 0) {
            this._pushToUndoStack(this.currentTransaction);
            this.redoStack = [];
            this._notify('stateChanged', this.getState());
        }

        this.currentTransaction = null;
    }

    cancelTransaction() {
        this.currentTransaction = null;
    }

    execute(action) {
        if (!action || typeof action.do !== 'function' || typeof action.undo !== 'function') {
            throw new Error('Action must have do() and undo() functions');
        }

        if (this.currentTransaction) {
            this.currentTransaction.actions.push(action);
            return action.do();
        }

        const result = action.do();

        const entry = {
            label: action.label || 'Action',
            actions: [action],
            timestamp: Date.now()
        };

        this._pushToUndoStack(entry);
        this.redoStack = [];
        this._notify('stateChanged', this.getState());

        return result;
    }

    _pushToUndoStack(entry) {
        this.undoStack.push(entry);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
    }

    async undo() {
        if (this.isUndoing || this.isRedoing) {
            throw new Error('Another operation in progress');
        }

        if (this.undoStack.length === 0) {
            return null;
        }

        this.isUndoing = true;
        this._notify('beforeUndo', null);

        try {
            const entry = this.undoStack.pop();

            for (let i = entry.actions.length - 1; i >= 0; i--) {
                const action = entry.actions[i];
                if (typeof action.undo === 'function') {
                    await this._executeWithPossiblePromise(() => action.undo());
                }
            }

            this.redoStack.push(entry);
            this._notify('stateChanged', this.getState());
            this._notify('afterUndo', entry);

            return entry;
        } finally {
            this.isUndoing = false;
        }
    }

    async redo() {
        if (this.isUndoing || this.isRedoing) {
            throw new Error('Another operation in progress');
        }

        if (this.redoStack.length === 0) {
            return null;
        }

        this.isRedoing = true;
        this._notify('beforeRedo', null);

        try {
            const entry = this.redoStack.pop();

            for (const action of entry.actions) {
                if (typeof action.do === 'function') {
                    await this._executeWithPossiblePromise(() => action.do());
                }
            }

            this._pushToUndoStack(entry);
            this._notify('stateChanged', this.getState());
            this._notify('afterRedo', entry);

            return entry;
        } finally {
            this.isRedoing = false;
        }
    }

    async _executeWithPossiblePromise(fn) {
        const result = fn();
        if (result && typeof result.then === 'function') {
            await result;
        }
    }

    canUndo() {
        return this.undoStack.length > 0 && !this.isUndoing && !this.isRedoing;
    }

    canRedo() {
        return this.redoStack.length > 0 && !this.isUndoing && !this.isRedoing;
    }

    getUndoCount() {
        return this.undoStack.length;
    }

    getRedoCount() {
        return this.redoStack.length;
    }

    getUndoLabel() {
        if (this.undoStack.length === 0) return null;
        return this.undoStack[this.undoStack.length - 1].label;
    }

    getRedoLabel() {
        if (this.redoStack.length === 0) return null;
        return this.redoStack[this.redoStack.length - 1].label;
    }

    getUndoHistory() {
        return [...this.undoStack].reverse().map(entry => ({
            label: entry.label,
            timestamp: entry.timestamp,
            actionCount: entry.actions.length
        }));
    }

    getRedoHistory() {
        return [...this.redoStack].map(entry => ({
            label: entry.label,
            timestamp: entry.timestamp,
            actionCount: entry.actions.length
        }));
    }

    getState() {
        return {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            undoCount: this.getUndoCount(),
            redoCount: this.getRedoCount(),
            undoLabel: this.getUndoLabel(),
            redoLabel: this.getRedoLabel(),
            maxHistory: this.maxHistory
        };
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this.currentTransaction = null;
        this.isUndoing = false;
        this.isRedoing = false;
        this._notify('stateChanged', this.getState());
        this._notify('cleared', null);
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

    createCellEditAction(address, oldValue, newValue, applyChange) {
        return {
            label: `编辑 ${address}`,
            do: () => applyChange(address, newValue),
            undo: () => applyChange(address, oldValue)
        };
    }

    createBatchEditAction(changes, applyChange) {
        return {
            label: `批量编辑 ${changes.length} 个单元格`,
            do: () => {
                changes.forEach(change => applyChange(change.address, change.newValue));
            },
            undo: () => {
                changes.forEach(change => applyChange(change.address, change.oldValue));
            }
        };
    }

    createGroupAction(group, type, createGroup, removeGroup) {
        return {
            label: `创建${type === 'row' ? '行' : '列'}分组`,
            do: () => createGroup(group),
            undo: () => removeGroup(group.id)
        };
    }

    createUngroupAction(group, removeGroup, restoreGroup) {
        return {
            label: `删除${group.type === 'row' ? '行' : '列'}分组`,
            do: () => removeGroup(group.id),
            undo: () => restoreGroup(group)
        };
    }

    createNamedRangeAction(range, addRange, removeRange) {
        return {
            label: `创建命名区域 "${range.name}"`,
            do: () => addRange(range),
            undo: () => removeRange(range.name)
        };
    }

    createRemoveNamedRangeAction(range, removeRange, restoreRange) {
        return {
            label: `删除命名区域 "${range.name}"`,
            do: () => removeRange(range.name),
            undo: () => restoreRange(range)
        };
    }

    createFormatAction(address, oldFormat, newFormat, applyFormat) {
        return {
            label: `设置 ${address} 格式`,
            do: () => applyFormat(address, newFormat),
            undo: () => applyFormat(address, oldFormat)
        };
    }

    serialize() {
        return {
            maxHistory: this.maxHistory,
            undoStack: this.undoStack.map(entry => ({
                label: entry.label,
                timestamp: entry.timestamp,
                actionCount: entry.actions.length
            })),
            redoStack: this.redoStack.map(entry => ({
                label: entry.label,
                timestamp: entry.timestamp,
                actionCount: entry.actions.length
            }))
        };
    }
}

export default UndoRedoManager;
