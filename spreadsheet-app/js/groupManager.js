class GroupManager {
    constructor() {
        this.rowGroups = [];
        this.colGroups = [];
        this.nextGroupId = 1;
        this.listeners = new Map();
    }

    createGroup(type, start, end, parentId = null) {
        if (start >= end) {
            throw new Error('Start must be less than end');
        }

        if (type !== 'row' && type !== 'col') {
            throw new Error('Type must be "row" or "col"');
        }

        const groups = type === 'row' ? this.rowGroups : this.colGroups;

        const parent = parentId ? this._findGroupById(parentId, groups) : null;
        if (parentId && !parent) {
            throw new Error('Parent group not found');
        }

        if (parent) {
            if (start < parent.start || end > parent.end) {
                throw new Error('Child group must be within parent bounds');
            }
        }

        const existingGroup = this._findOverlappingGroup(type, start, end);
        if (existingGroup && existingGroup.id !== parentId) {
            const canNest = start > existingGroup.start && end < existingGroup.end;
            if (!canNest) {
                throw new Error('Group overlaps with existing group');
            }
        }

        const group = {
            id: this.nextGroupId++,
            type,
            start,
            end,
            collapsed: false,
            parentId,
            children: [],
            hiddenItems: new Set()
        };

        if (parent) {
            group.level = parent.level + 1;
            parent.children.push(group);
        } else {
            group.level = 0;
            groups.push(group);
        }

        for (let i = start; i <= end; i++) {
            group.hiddenItems.add(i);
        }

        this._sortGroups(groups);
        this._notify('groupCreated', group);

        return group;
    }

    removeGroup(groupId) {
        const group = this.findGroupById(groupId);
        if (!group) {
            throw new Error('Group not found');
        }

        const groups = group.type === 'row' ? this.rowGroups : this.colGroups;

        const removeRecursive = (g, parentChildren) => {
            g.children.forEach(child => removeRecursive(child, g.children));
            const index = parentChildren.indexOf(g);
            if (index !== -1) {
                parentChildren.splice(index, 1);
            }
            if (g.collapsed) {
                this._notify('itemsVisibilityChanged', {
                    type: g.type,
                    items: Array.from(g.hiddenItems),
                    visible: true
                });
            }
        };

        if (group.parentId) {
            const parent = this.findGroupById(group.parentId);
            if (parent) {
                removeRecursive(group, parent.children);
            }
        } else {
            removeRecursive(group, groups);
        }

        this._notify('groupRemoved', groupId);
        return true;
    }

    toggleGroup(groupId) {
        const group = this.findGroupById(groupId);
        if (!group) {
            throw new Error('Group not found');
        }

        group.collapsed = !group.collapsed;

        if (group.collapsed) {
            this._collapseGroup(group);
        } else {
            this._expandGroup(group);
        }

        this._notify('groupToggled', group);
        return group.collapsed;
    }

    _collapseGroup(group) {
        const itemsToHide = [];
        for (let i = group.start; i <= group.end; i++) {
            if (!this._isHiddenByAncestor(i, group) && !this._isContainedInCollapsedChild(i, group)) {
                itemsToHide.push(i);
            }
        }

        if (itemsToHide.length > 0) {
            this._notify('itemsVisibilityChanged', {
                type: group.type,
                items: itemsToHide,
                visible: false
            });
        }
    }

    _expandGroup(group) {
        const itemsToShow = [];
        for (let i = group.start; i <= group.end; i++) {
            if (!this._isHiddenByAncestor(i, group) && !this._isHiddenByCollapsedChild(i, group)) {
                itemsToShow.push(i);
            }
        }

        if (itemsToShow.length > 0) {
            this._notify('itemsVisibilityChanged', {
                type: group.type,
                items: itemsToShow,
                visible: true
            });
        }

        group.children.forEach(child => {
            if (child.collapsed) {
                this._collapseGroup(child);
            }
        });
    }

    _isHiddenByAncestor(index, group) {
        let parentId = group.parentId;
        while (parentId) {
            const parent = this.findGroupById(parentId);
            if (parent && parent.collapsed && parent.hiddenItems.has(index)) {
                return true;
            }
            parentId = parent ? parent.parentId : null;
        }
        return false;
    }

    _isContainedInCollapsedChild(index, parentGroup) {
        const check = (group) => {
            if (group.collapsed && group.hiddenItems.has(index)) {
                return true;
            }
            return group.children.some(check);
        };
        return parentGroup.children.some(check);
    }

    _isHiddenByCollapsedChild(index, parentGroup) {
        const check = (group) => {
            if (group.collapsed && group.hiddenItems.has(index)) {
                return true;
            }
            return group.children.some(check);
        };
        return parentGroup.children.some(check);
    }

    isItemHidden(type, index) {
        const groups = type === 'row' ? this.rowGroups : this.colGroups;

        const check = (group) => {
            if (group.collapsed && group.hiddenItems.has(index)) {
                return true;
            }
            return group.children.some(check);
        };

        return groups.some(check);
    }

    getHiddenItems(type) {
        const hidden = new Set();
        const groups = type === 'row' ? this.rowGroups : this.colGroups;

        const collect = (group) => {
            if (group.collapsed) {
                for (let i = group.start; i <= group.end; i++) {
                    if (!this._isHiddenByAncestor(i, group)) {
                        hidden.add(i);
                    }
                }
            }
            group.children.forEach(collect);
        };

        groups.forEach(collect);
        return Array.from(hidden);
    }

    getVisibleItems(type, maxIndex) {
        const hidden = new Set(this.getHiddenItems(type));
        const visible = [];
        for (let i = 0; i <= maxIndex; i++) {
            if (!hidden.has(i)) {
                visible.push(i);
            }
        }
        return visible;
    }

    findGroupById(groupId) {
        const find = (groups) => {
            for (const group of groups) {
                if (group.id === groupId) return group;
                const found = find(group.children);
                if (found) return found;
            }
            return null;
        };

        return find(this.rowGroups) || find(this.colGroups) || null;
    }

    _findGroupById(groupId, groups) {
        for (const group of groups) {
            if (group.id === groupId) return group;
            const found = this._findGroupById(groupId, group.children);
            if (found) return found;
        }
        return null;
    }

    _findOverlappingGroup(type, start, end) {
        const groups = type === 'row' ? this.rowGroups : this.colGroups;

        const find = (groupList) => {
            for (const group of groupList) {
                const overlaps = !(end < group.start || start > group.end);
                if (overlaps) return group;
                const found = find(group.children);
                if (found) return found;
            }
            return null;
        };

        return find(groups);
    }

    getGroupsForItem(type, index) {
        const groups = type === 'row' ? this.rowGroups : this.colGroups;
        const result = [];

        const find = (groupList) => {
            for (const group of groupList) {
                if (index >= group.start && index <= group.end) {
                    result.push(group);
                }
                find(group.children);
            }
        };

        find(groups);
        return result;
    }

    getGroupSummaryLine(group) {
        return group.type === 'row' ? group.end + 1 : group.end + 1;
    }

    getAllGroups(type) {
        const groups = type === 'row' ? this.rowGroups : this.colGroups;
        const result = [];

        const collect = (groupList) => {
            for (const group of groupList) {
                result.push(group);
                collect(group.children);
            }
        };

        collect(groups);
        return result;
    }

    _sortGroups(groups) {
        groups.sort((a, b) => a.start - b.start);
        groups.forEach(group => this._sortGroups(group.children));
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

    clear() {
        this.rowGroups = [];
        this.colGroups = [];
        this.nextGroupId = 1;
        this._notify('cleared', null);
    }

    restoreGroup(groupData) {
        const groups = groupData.type === 'row' ? this.rowGroups : this.colGroups;

        const restore = (data, parentId, parentChildren) => {
            const group = {
                id: data.id,
                type: data.type,
                start: data.start,
                end: data.end,
                collapsed: data.collapsed,
                parentId,
                level: data.level || 0,
                children: [],
                hiddenItems: new Set()
            };

            for (let i = group.start; i <= group.end; i++) {
                group.hiddenItems.add(i);
            }

            parentChildren.push(group);

            if (data.children) {
                data.children.forEach(child => restore(child, group.id, group.children));
            }

            if (group.collapsed) {
                this._collapseGroup(group);
            }

            return group;
        };

        let parentChildren = groups;
        if (groupData.parentId) {
            const parent = this.findGroupById(groupData.parentId);
            if (!parent) {
                throw new Error(`Parent group with id ${groupData.parentId} not found`);
            }
            parentChildren = parent.children;
        }

        const restoredGroup = restore(groupData, groupData.parentId, parentChildren);

        if (groupData.id >= this.nextGroupId) {
            this.nextGroupId = groupData.id + 1;
        }

        this._sortGroups(groups);
        this._notify('groupCreated', restoredGroup);

        return restoredGroup;
    }

    serialize() {
        const serializeGroups = (groups) => {
            return groups.map(group => ({
                id: group.id,
                type: group.type,
                start: group.start,
                end: group.end,
                collapsed: group.collapsed,
                parentId: group.parentId,
                level: group.level,
                children: serializeGroups(group.children)
            }));
        };

        return {
            rowGroups: serializeGroups(this.rowGroups),
            colGroups: serializeGroups(this.colGroups),
            nextGroupId: this.nextGroupId
        };
    }

    deserialize(data) {
        this.clear();

        if (!data) return;

        const deserializeGroups = (groupsData, parentId = null) => {
            return groupsData.map(groupData => {
                const group = {
                    id: groupData.id,
                    type: groupData.type,
                    start: groupData.start,
                    end: groupData.end,
                    collapsed: groupData.collapsed,
                    parentId,
                    level: groupData.level || 0,
                    children: [],
                    hiddenItems: new Set()
                };

                for (let i = group.start; i <= group.end; i++) {
                    group.hiddenItems.add(i);
                }

                group.children = deserializeGroups(groupData.children || [], group.id);
                return group;
            });
        };

        if (data.rowGroups) {
            this.rowGroups = deserializeGroups(data.rowGroups);
        }
        if (data.colGroups) {
            this.colGroups = deserializeGroups(data.colGroups);
        }
        if (data.nextGroupId) {
            this.nextGroupId = data.nextGroupId;
        }
    }
}

export default GroupManager;
