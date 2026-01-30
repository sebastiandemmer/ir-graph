document.addEventListener('DOMContentLoaded', function () {
    // A global variable to hold the Cytoscape instance
    let cy;
    // The ID of the currently selected graph. Initialized to null, will be set dynamically.
    let currentGraphId = null;
    // A global variable to hold the UI configuration
    let uiConfig = null;
    const API_BASE_URL = 'http://127.0.0.1:8000/api';

    const currentGraphIdSpan = document.getElementById('current-graph-id');
    const mainGraphTitle = document.getElementById('main-graph-title');
    const graphCanvas = document.getElementById('cy');

    // UI Toggles
    const toggleNodeBorder = document.getElementById('toggle-node-border');
    const toggleTextBelow = document.getElementById('toggle-text-below');

    // A timer for debouncing the save operation
    let saveDebounceTimer;

    // A set to keep track of nodes that have been moved since the last save.
    let movedNodes = new Set();

    /**
     * Shows a toast notification.
     * @param {string} message - The message to display.
     * @param {('success'|'error'|'info')} type - The type of message.
     */
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Icon based on type
        let iconName = 'info';
        if (type === 'success') iconName = 'check_circle';
        if (type === 'error') iconName = 'error';

        toast.innerHTML = `
            <span class="material-symbols-rounded toast-icon">${iconName}</span>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Fetches UI configuration and populates relevant UI elements.
     */
    async function fetchUiConfig() {
        try {
            const response = await fetch(`${API_BASE_URL}/config`);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            uiConfig = await response.json();

            // Populate the node category dropdown
            const nodeCategorySelector = document.getElementById('node-category');
            nodeCategorySelector.innerHTML = ''; // Clear existing options

            // Default option
            const defaultOption = document.createElement('option');
            defaultOption.value = 'Default';
            defaultOption.textContent = 'Default';
            nodeCategorySelector.appendChild(defaultOption);

            if (uiConfig.node_categories) {
                uiConfig.node_categories.forEach(category => {
                    if (category.name !== 'Default') {
                        const option = document.createElement('option');
                        option.value = category.name;
                        option.textContent = category.name;
                        nodeCategorySelector.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to fetch UI config:', error);
            showToast('Error loading UI configuration.', 'error');
        }
    }

    /**
     * Fetches graph data and initializes or updates the Cytoscape instance.
     * @param {number} graphId - The ID of the graph to fetch.
     */
    async function initializeGraph(graphId) {
        if (graphId === null || graphId === undefined) {
            if (cy) {
                cy.destroy();
                cy = null;
            }
            graphCanvas.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-rounded">hub</span>
                    <p>Select or create a graph to begin</p>
                </div>
            `;
            currentGraphIdSpan.textContent = '-';
            mainGraphTitle.textContent = 'Select a Graph';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${graphId}`);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const graphData = await response.json();

            const elements = [];
            let hasPositionData = false;

            // Transform nodes for Cytoscape
            graphData.nodes.forEach(node => {
                const nodeElement = {
                    group: 'nodes',
                    data: {
                        id: node.name,
                        name: node.name,
                        category: node.category
                    }
                };

                // Check for position data from the API
                if (node.position_x !== null && node.position_y !== null) {
                    nodeElement.position = { x: node.position_x, y: node.position_y };
                    hasPositionData = true;
                }
                elements.push(nodeElement);
            });

            graphData.edges.forEach(edge => {
                elements.push({
                    group: 'edges',
                    data: {
                        id: `${edge.start.name}->${edge.end.name}`,
                        source: edge.start.name,
                        target: edge.end.name,
                        description: edge.description
                    }
                });
            });

            // If cy already exists, destroy it before re-initializing
            if (cy) {
                cy.destroy();
            }

            // Clear empty state
            graphCanvas.innerHTML = '';

            // Initialize Cytoscape
            cy = cytoscape({
                container: graphCanvas,
                elements: elements,
                layout: {
                    name: hasPositionData ? 'preset' : 'cose',
                    componentSpacing: 100,
                    nodeOverlap: 20,
                    animate: true,
                    animationDuration: 500,
                    padding: 50
                },
                style: getGraphStyles(),
                wheelSensitivity: 0.2
            });

            cy.on('free', 'node', (event) => {
                movedNodes.add(event.target);
                debounceSavePositions();
            });

            // Update ID display
            currentGraphIdSpan.textContent = graphId;

        } catch (error) {
            console.error('Failed to fetch or process graph data:', error);
            graphCanvas.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-rounded" style="color: var(--danger)">error</span>
                    <p>Could not load graph data</p>
                    <small>Ensure the API is running at <code>${API_BASE_URL}</code></small>
                </div>
            `;
            currentGraphIdSpan.textContent = 'Err';
            mainGraphTitle.textContent = 'Error Loading Graph';
            showToast('Failed to load graph data', 'error');
            if (cy) {
                cy.destroy();
                cy = null;
            }
        }
    }

    /**
     * Generates the Cytoscape stylesheet based on current UI toggles and config.
     * @returns {Array} The Cytoscape style array.
     */
    function getGraphStyles() {
        const showBorder = toggleNodeBorder.checked;
        const textBelow = toggleTextBelow.checked;

        // Base styles
        const styles = [
            {
                selector: 'node',
                style: {
                    'label': 'data(name)',
                    'color': '#1e293b', // slate-800
                    'shape': 'round-rectangle',
                    'text-valign': textBelow ? 'bottom' : 'center',
                    'text-halign': 'center',
                    'text-margin-y': textBelow ? '8px' : '0px',
                    'font-family': 'Inter, system-ui, sans-serif',
                    'font-weight': '600',
                    'font-size': '12px',
                    'background-color': '#ffffff',
                    'border-width': showBorder ? 2 : 0, // Toggle border
                    'border-color': '#94a3b8', // slate-400
                    'width': 'label',
                    'height': 'label',
                    'padding': '12px',
                    'shadow-blur': 4,
                    'shadow-color': 'rgba(0,0,0,0.1)',
                    'shadow-offset-y': 2,
                    'text-wrap': 'wrap',
                    'text-max-width': '100px'
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 2,
                    'border-color': '#4f46e5', // indigo-600
                    'background-color': '#eff6ff' // blue-50
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#cbd5e1', // slate-300
                    'target-arrow-color': '#cbd5e1',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'arrow-scale': 1.2,
                    'label': 'data(description)',
                    'text-rotation': 'autorotate',
                    'text-margin-y': -10,
                    'font-size': '10px',
                    'color': '#64748b'
                }
            },
            {
                selector: 'edge:selected',
                style: {
                    'line-color': '#4f46e5',
                    'target-arrow-color': '#4f46e5'
                }
            }
        ];

        // Dynamically add styles for each node category from the config
        if (uiConfig && uiConfig.node_categories) {
            uiConfig.node_categories.forEach(category => {
                const selector = `node[category = '${category.name}']`;
                if (category.icon) {
                    styles.push({
                        selector: selector,
                        style: {
                            'background-image': category.icon,
                            'background-fit': 'contain',
                            'background-opacity': 0
                        }
                    });
                }
            });
        }
        return styles;
    }

    /**
     * Fetches the list of graphs and populates the graph selector dropdown.
     */
    async function fetchAndPopulateGraphSelector() {
        const graphSelector = document.getElementById('graph-selector');
        graphSelector.innerHTML = '';

        try {
            const response = await fetch(`${API_BASE_URL}/graphs/`);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const graphsList = await response.json();

            if (graphsList.length > 0) {
                graphsList.forEach((graph, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = graph.name || `Graph ${index}`;
                    graphSelector.appendChild(option);
                });
                // Set currentGraphId to the first graph's ID (index 0)
                currentGraphId = 0;
                graphSelector.value = currentGraphId;
                mainGraphTitle.textContent = graphsList[0].name || `Graph 0`;
                initializeGraph(currentGraphId);
            } else {
                currentGraphId = null;
                initializeGraph(null);
            }
        } catch (error) {
            console.error('Failed to fetch graphs for selector:', error);
            showToast('Error loading graph list.', 'error');
            currentGraphId = null;
            initializeGraph(null);
        }
    }

    /**
     * Gathers all node positions and sends them to the API.
     */
    async function saveNodePositions() {
        if (!cy || movedNodes.size === 0 || currentGraphId === null) return;

        const positions = [];
        for (const node of movedNodes) {
            const pos = node.position();
            positions.push({
                name: node.id(),
                position_x: Math.floor(pos.x),
                position_y: Math.floor(pos.y)
            });
        }

        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/nodes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ "nodes": positions })
            });
            if (!response.ok) throw new Error('Failed to save node positions');

            console.log(`Node positions saved for: ${positions.map(p => p.name).join(', ')}`);
            showToast('Node positions saved!', 'success');

            movedNodes.clear();
        } catch (error) {
            console.error(error);
            showToast('Error saving node positions.', 'error');
        }
    }

    function debounceSavePositions() {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(saveNodePositions, 1000);
    }

    // --- Form Handlers ---

    async function handleCreateGraph(event) {
        event.preventDefault();
        const graphName = document.getElementById('graph-name').value;
        try {
            const response = await fetch(`${API_BASE_URL}/graphs/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: graphName })
            });
            if (!response.ok) throw new Error('Failed to create graph');

            showToast(`Graph "${graphName}" created!`, 'success');
            event.target.reset();
            await fetchAndPopulateGraphSelector();

            // Auto-select the new graph (simplification: just re-fetching selects the first one, 
            // but we could improve this to select the last added)
        } catch (error) {
            console.error(error);
            showToast('Error creating graph.', 'error');
        }
    }

    async function handleAddNode(event) {
        event.preventDefault();
        if (currentGraphId === null) {
            showToast('No graph selected.', 'error');
            return;
        }
        const nodeName = document.getElementById('node-name').value;
        const nodeCategory = document.getElementById('node-category').value;
        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/nodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nodeName,
                    category: nodeCategory
                })
            });
            if (!response.ok) throw new Error('Failed to add node');

            showToast(`Node "${nodeName}" added!`, 'success');
            event.target.reset();
            initializeGraph(currentGraphId);
        } catch (error) {
            console.error(error);
            showToast('Error adding node. Already exists?', 'error');
        }
    }

    async function handleAddEdge(event) {
        event.preventDefault();
        if (currentGraphId === null) {
            showToast('No graph selected.', 'error');
            return;
        }
        const startNode = document.getElementById('start-node').value;
        const endNode = document.getElementById('end-node').value;
        const description = document.getElementById('edge-description').value;
        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/edges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start_node: startNode, end_node: endNode, description: description })
            });
            if (!response.ok) throw new Error('Failed to add edge');

            showToast(`Edge added!`, 'success');
            event.target.reset();
            initializeGraph(currentGraphId);
        } catch (error) {
            console.error(error);
            showToast('Error adding edge. Check node names.', 'error');
        }
    }

    async function handleSaveGraphs(event) {
        event.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/utils/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throw new Error('Failed to save to JSON');
            showToast(`Saved to file system!`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Error saving to disk.', 'error');
        }
    }

    function handleExportPng(event) {
        event.preventDefault();
        if (!cy) {
            showToast('Graph not prepared.', 'error');
            return;
        }

        const png64 = cy.png({ output: 'base64', bg: '#ffffff' });

        const link = document.createElement('a');
        link.href = 'data:image/png;base64,' + png64;
        link.download = `graph-${currentGraphId}.png`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Exporting PNG...', 'info');
    }

    // --- Initial Setup ---
    async function main() {
        await fetchUiConfig();
        await fetchAndPopulateGraphSelector();
    }

    // Attach event listeners
    document.getElementById('create-graph-form').addEventListener('submit', handleCreateGraph);
    document.getElementById('add-node-form').addEventListener('submit', handleAddNode);
    document.getElementById('add-edge-form').addEventListener('submit', handleAddEdge);
    document.getElementById('save-graphs-form').addEventListener('submit', handleSaveGraphs);
    document.getElementById('export-graph-png-form').addEventListener('submit', handleExportPng);

    // View Option Toggles
    toggleNodeBorder.addEventListener('change', () => {
        if (cy) {
            cy.style(getGraphStyles());
        }
    });
    toggleTextBelow.addEventListener('change', () => {
        if (cy) {
            cy.style(getGraphStyles());
        }
    });

    document.getElementById('graph-selector').addEventListener('change', (event) => {
        currentGraphId = parseInt(event.target.value, 10);
        const selectedOption = event.target.options[event.target.selectedIndex];
        mainGraphTitle.textContent = selectedOption.textContent;
        initializeGraph(currentGraphId);
    });

    main();
});
