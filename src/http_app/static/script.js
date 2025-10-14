document.addEventListener('DOMContentLoaded', function() {
    // A global variable to hold the Cytoscape instance
    let cy;
    // For now, we are hardcoding the graph ID we want to view and edit.
    let currentGraphId = 0;
    const API_BASE_URL = 'http://127.0.0.1:8000/api';

    const statusMessageEl = document.getElementById('status-message');

    // A timer for debouncing the save operation
    let saveDebounceTimer;

    // A set to keep track of nodes that have been moved since the last save.
    let movedNodes = new Set();
    /**
     * Shows a status message to the user.
     * @param {string} message - The message to display.
     * @param {('success'|'error')} type - The type of message.
     */
    function showStatusMessage(message, type) {
        statusMessageEl.textContent = message;
        statusMessageEl.className = type;
        setTimeout(() => {
            statusMessageEl.textContent = '';
            statusMessageEl.className = '';
        }, 3000);
    }

    /**
     * Fetches graph data and initializes or updates the Cytoscape instance.
     * @param {number} graphId - The ID of the graph to fetch.
     */
    async function initializeGraph(graphId) {
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
                        target: edge.end.name
                    }
                });
            });

            // Initialize Cytoscape
            cy = cytoscape({
                container: document.getElementById('cy'),
                elements: elements,
                layout: { 
                    name: hasPositionData ? 'preset' : 'cose', 
                    idealEdgeLength: 100, 
                    nodeOverlap: 20 
                },
                style: [
                    {
                        selector: 'node',
                        style: {
                            'label': 'data(name)',
                            'color': '#333',
                            'text-valign': 'bottom',
                            'text-halign': 'center',
                            'text-margin-y': '5px',
                            'font-weight': 'bold',
                            'background-color': '#fff', // A fallback color
                            'background-opacity': 0, // Makes the node invisible to show the image
                            'width': '50px', // Set a default size
                            'height': '50px'
                        }
                    },
                    // Style for 'Computer' nodes
                    {
                        selector: "node[category = 'Computer']",
                        style: {
                            'background-image': '/static/assets/computer.svg',
                            'background-fit': 'contain'
                        }
                    },
                    // Style for 'Server' nodes
                    {
                        selector: "node[category = 'Server']",
                        style: {
                            'background-image': '/static/assets/server.svg',
                            'width': '60px', 
                            'height': '60px',
                            'background-fit': 'cover'
                        }
                    },
                    // Style for 'User' nodes
                    {
                        selector: "node[category = 'User']",
                        style: {
                            'background-image': '/static/assets/user.svg',
                            'background-fit': 'contain'
                        }
                    },
                    { 
                        selector: "node[category = 'Default']",
                        style: 
                            { 
                                'background-color': '#0074D9',
                                'label': 'data(name)',
                                'color': '#fff',
                                'text-outline-width': 2,
                                'text-outline-color': '#0074D9' }},
                    // General edge style
                    {
                        selector: 'edge',
                        style: {
                            'width': 3,
                            'line-color': '#ccc',
                            'target-arrow-color': '#ccc',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier'
                        }
                    }
                    // { selector: 'node', style: { 'background-color': '#0074D9', 'label': 'data(name)', 'color': '#fff', 'text-outline-width': 2, 'text-outline-color': '#0074D9' }},
                    // { selector: 'edge', style: { 'width': 3, 'line-color': '#ddd', 'target-arrow-color': '#ddd', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' }}
                ]
            });

            cy.on('free', 'node', (event) => {
                movedNodes.add(event.target);
                debounceSavePositions();
            });

        } catch (error) {
            console.error('Failed to fetch or process graph data:', error);
            const container = document.getElementById('cy');
            container.innerHTML = `<p style="color: red; text-align: center; padding: 20px;"><strong>Error:</strong> Could not load graph data. <br> Please ensure the API is running at <code>${API_BASE_URL}</code>.</p>`;
        }
    }

    /**
     * Gathers all node positions and sends them to the API.
     */

    async function saveNodePositions() {
        // Don't do anything if the instance isn't ready or no nodes were moved.
        if (!cy || movedNodes.size === 0) return;

        // Create an array of position data from the movedNodes Set.
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
                body: JSON.stringify({"nodes":positions})
            });
            if (!response.ok) throw new Error('Failed to save node positions');
            
            console.log(`Node positions saved for: ${positions.map(p => p.name).join(', ')}`);
            showStatusMessage('Node positions saved!', 'success');

            // Clear the set after a successful save.
            movedNodes.clear();
        } catch (error) {
            console.error(error);
            showStatusMessage('Error saving node positions.', 'error');
        }
    }

    /**
     * Debounces the save function to prevent too many API calls.
     */
    function debounceSavePositions() {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(saveNodePositions, 1000); // Wait 1 second after the last move
    }


    /**
     * Handles the form submission for creating a new graph.
     */
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
            showStatusMessage(`Graph "${graphName}" created successfully!`, 'success');
            event.target.reset(); // Clear the form
        } catch (error) {
            console.error(error);
            showStatusMessage('Error creating graph.', 'error');
        }
    }

    /**
     * Handles the form submission for adding a new node.
     */
    async function handleAddNode(event) {
        event.preventDefault();
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
            showStatusMessage(`Node "${nodeName}" added successfully!`, 'success');
            event.target.reset(); // Clear the form
            initializeGraph(currentGraphId); // Refresh the graph view
        } catch (error) {
            console.error(error);
            showStatusMessage('Error adding node. Does it already exist?', 'error');
        }
    }
    
    /**
     * Handles the form submission for adding a new edge.
     */
    async function handleAddEdge(event) {
        event.preventDefault();
        const startNode = document.getElementById('start-node').value;
        const endNode = document.getElementById('end-node').value;
        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/edges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start_node: startNode, end_node: endNode })
            });
            if (!response.ok) throw new Error('Failed to add edge');
            showStatusMessage(`Edge from "${startNode}" to "${endNode}" added!`, 'success');
            event.target.reset(); // Clear the form
            initializeGraph(currentGraphId); // Refresh the graph view
        } catch (error) {
            console.error(error);
            showStatusMessage('Error adding edge. Do both nodes exist?', 'error');
        }
    }
    
    /**
     * Handles the form submission for saving graphs.
     */
    async function handleSaveGraphs(event) {
        event.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throw new Error('Failed to save to JSON');
            showStatusMessage(`Saved to JSON!`, 'success');
            event.target.reset(); // Clear the form
        } catch (error) {
            console.error(error);
            showStatusMessage('Error saving graphs to JSON', 'error');
        }
    }

    function handleExportPng() {
        if (!cy) {
            showStatusMessage('Graph not initialized yet.', 'error');
            return;
        }
        // cy.png() returns a base64 encoded PNG of the current view
        const png64 = cy.png({ output: 'base64' });

        // Create a temporary link element to trigger the download
        const link = document.createElement('a');
        link.href = 'data:image/png;base64,' + png64;
        link.download = `graph-${currentGraphId}.png`; // e.g., graph-0.png

        // Programmatically click the link to start the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- Initial Setup ---
    // Load the initial graph
    initializeGraph(currentGraphId);

    // Attach event listeners to the forms
    document.getElementById('create-graph-form').addEventListener('submit', handleCreateGraph);
    document.getElementById('add-node-form').addEventListener('submit', handleAddNode);
    document.getElementById('add-edge-form').addEventListener('submit', handleAddEdge);
    document.getElementById('save-graphs-form').addEventListener('submit', handleSaveGraphs);
    document.getElementById('export-graph-png-form').addEventListener('submit', handleExportPng);
});

