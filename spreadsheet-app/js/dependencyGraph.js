class DependencyGraph {
    constructor() {
        this.adjacencyList = new Map();
        this.reverseAdjacencyList = new Map();
    }

    addNode(node) {
        if (!this.adjacencyList.has(node)) {
            this.adjacencyList.set(node, new Set());
            this.reverseAdjacencyList.set(node, new Set());
        }
    }

    removeNode(node) {
        const dependents = this.reverseAdjacencyList.get(node) || new Set();
        dependents.forEach(dep => {
            const deps = this.adjacencyList.get(dep);
            if (deps) deps.delete(node);
        });

        const dependencies = this.adjacencyList.get(node) || new Set();
        dependencies.forEach(dep => {
            const reverseDeps = this.reverseAdjacencyList.get(dep);
            if (reverseDeps) reverseDeps.delete(node);
        });

        this.adjacencyList.delete(node);
        this.reverseAdjacencyList.delete(node);
    }

    addDependency(from, to) {
        this.addNode(from);
        this.addNode(to);

        this.adjacencyList.get(from).add(to);
        this.reverseAdjacencyList.get(to).add(from);
    }

    removeDependency(from, to) {
        const fromDeps = this.adjacencyList.get(from);
        if (fromDeps) fromDeps.delete(to);

        const toReverseDeps = this.reverseAdjacencyList.get(to);
        if (toReverseDeps) toReverseDeps.delete(from);
    }

    updateDependencies(node, newDependencies) {
        this.addNode(node);

        const oldDependencies = this.adjacencyList.get(node) || new Set();

        oldDependencies.forEach(dep => {
            if (!newDependencies.includes(dep)) {
                this.removeDependency(node, dep);
            }
        });

        newDependencies.forEach(dep => {
            if (!oldDependencies.has(dep)) {
                this.addDependency(node, dep);
            }
        });
    }

    getDependencies(node) {
        return Array.from(this.adjacencyList.get(node) || []);
    }

    getDependents(node) {
        return Array.from(this.reverseAdjacencyList.get(node) || []);
    }

    getAllDependents(node) {
        const visited = new Set();
        const result = [];
        const stack = [node];

        while (stack.length > 0) {
            const current = stack.pop();
            const dependents = this.getDependents(current);

            for (const dep of dependents) {
                if (!visited.has(dep)) {
                    visited.add(dep);
                    result.push(dep);
                    stack.push(dep);
                }
            }
        }

        return result;
    }

    detectCycle() {
        const visited = new Set();
        const recStack = new Set();
        const cyclePath = [];

        const dfs = (node) => {
            visited.add(node);
            recStack.add(node);
            cyclePath.push(node);

            const dependencies = this.getDependencies(node);
            for (const dep of dependencies) {
                if (!visited.has(dep)) {
                    if (dfs(dep)) {
                        return true;
                    }
                } else if (recStack.has(dep)) {
                    cyclePath.push(dep);
                    return true;
                }
            }

            recStack.delete(node);
            cyclePath.pop();
            return false;
        };

        for (const node of this.adjacencyList.keys()) {
            if (!visited.has(node)) {
                cyclePath.length = 0;
                if (dfs(node)) {
                    const cycleStart = cyclePath.indexOf(cyclePath[cyclePath.length - 1]);
                    return {
                        hasCycle: true,
                        cycle: cyclePath.slice(cycleStart)
                    };
                }
            }
        }

        return { hasCycle: false, cycle: [] };
    }

    detectCycleForNode(node) {
        const visited = new Set();
        const recStack = new Set();
        const cyclePath = [];

        const dfs = (current) => {
            visited.add(current);
            recStack.add(current);
            cyclePath.push(current);

            const dependencies = this.getDependencies(current);
            for (const dep of dependencies) {
                if (dep === node || recStack.has(dep)) {
                    cyclePath.push(dep);
                    return true;
                }
                if (!visited.has(dep)) {
                    if (dfs(dep)) {
                        return true;
                    }
                }
            }

            recStack.delete(current);
            cyclePath.pop();
            return false;
        };

        if (dfs(node)) {
            const cycleStart = cyclePath.indexOf(cyclePath[cyclePath.length - 1]);
            return {
                hasCycle: true,
                cycle: cyclePath.slice(cycleStart)
            };
        }

        return { hasCycle: false, cycle: [] };
    }

    topologicalSort() {
        const inDegree = new Map();
        const queue = [];
        const result = [];

        for (const node of this.adjacencyList.keys()) {
            inDegree.set(node, this.getDependencies(node).length);
            if (inDegree.get(node) === 0) {
                queue.push(node);
            }
        }

        while (queue.length > 0) {
            const node = queue.shift();
            result.push(node);

            const dependents = this.getDependents(node);
            for (const dep of dependents) {
                inDegree.set(dep, inDegree.get(dep) - 1);
                if (inDegree.get(dep) === 0) {
                    queue.push(dep);
                }
            }
        }

        if (result.length !== this.adjacencyList.size) {
            const cycle = this.detectCycle();
            throw new Error(`Cycle detected: ${cycle.cycle ? cycle.cycle.join(' -> ') : 'unknown'}`);
        }

        return result;
    }

    getCalculationOrder(changedNodes) {
        const affectedNodes = new Set();
        const queue = [...changedNodes];

        for (const node of changedNodes) {
            affectedNodes.add(node);
        }

        while (queue.length > 0) {
            const node = queue.shift();
            const dependents = this.getDependents(node);

            for (const dep of dependents) {
                if (!affectedNodes.has(dep)) {
                    affectedNodes.add(dep);
                    queue.push(dep);
                }
            }
        }

        const subGraph = new DependencyGraph();
        for (const node of affectedNodes) {
            subGraph.addNode(node);
            const deps = this.getDependencies(node);
            for (const dep of deps) {
                if (affectedNodes.has(dep) || changedNodes.includes(dep)) {
                    subGraph.addDependency(node, dep);
                }
            }
        }

        try {
            return subGraph.topologicalSort();
        } catch (e) {
            const cycleInfo = this.detectCycle();
            throw new Error(`Circular reference detected: ${cycleInfo.cycle ? cycleInfo.cycle.join(' -> ') : 'unknown'}`);
        }
    }

    clear() {
        this.adjacencyList.clear();
        this.reverseAdjacencyList.clear();
    }

    serialize() {
        const data = {
            adjacencyList: {},
            reverseAdjacencyList: {}
        };

        for (const [key, value] of this.adjacencyList.entries()) {
            data.adjacencyList[key] = Array.from(value);
        }

        for (const [key, value] of this.reverseAdjacencyList.entries()) {
            data.reverseAdjacencyList[key] = Array.from(value);
        }

        return data;
    }

    deserialize(data) {
        this.clear();

        if (data.adjacencyList) {
            for (const [key, value] of Object.entries(data.adjacencyList)) {
                this.adjacencyList.set(key, new Set(value));
            }
        }

        if (data.reverseAdjacencyList) {
            for (const [key, value] of Object.entries(data.reverseAdjacencyList)) {
                this.reverseAdjacencyList.set(key, new Set(value));
            }
        }
    }

    toString() {
        let result = 'Dependencies (node -> depends on):\n';
        for (const [node, deps] of this.adjacencyList.entries()) {
            result += `  ${node} -> [${Array.from(deps).join(', ')}]\n`;
        }
        result += '\nReverse (node -> is depended by):\n';
        for (const [node, deps] of this.reverseAdjacencyList.entries()) {
            result += `  ${node} -> [${Array.from(deps).join(', ')}]\n`;
        }
        return result;
    }
}

export default DependencyGraph;
