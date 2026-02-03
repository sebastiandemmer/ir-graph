document.addEventListener('DOMContentLoaded', function () {
    // A global variable to hold the Cytoscape instance
    let cy;
    // Undo-Redo instance
    let ur;
    // The ID of the currently selected graph. Initialized to null, will be set dynamically.
    let currentGraphId = null;
    // A global variable to hold the UI configuration
    let uiConfig = null;
    let connectionModeSource = null; // Track manual connection state
    const API_BASE_URL = 'http://127.0.0.1:8000/api';

    const currentGraphIdSpan = document.getElementById('current-graph-id');
    const mainGraphTitle = document.getElementById('main-graph-title');
    const graphCanvas = document.getElementById('cy');

    // --- Global Event Listeners (Attached Once) ---

    document.getElementById('btn-undo').addEventListener('click', () => {
        if (ur) {
            ur.undo();
            showToast("Undo", "info");
        }
    });

    document.getElementById('btn-redo').addEventListener('click', () => {
        if (ur) {
            ur.redo();
            showToast("Redo", "info");
        }
    });

    // Prevent default browser context menu on the graph canvas
    // Use capture phase on document to be sure we catch it
    const preventContextMenu = (e) => {
        // Check if target is inside the graph container or is a canvas
        if (e.target.closest('#cy') || e.target.tagName.toLowerCase() === 'canvas') {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    };

    // Attach to window with capture
    window.addEventListener('contextmenu', preventContextMenu, true);

    // Also attach directly to the container to be safe
    const cyContainer = document.getElementById('cy');
    if (cyContainer) {
        cyContainer.oncontextmenu = (e) => {
            e.preventDefault();
            return false;
        };
    }

    // UI Toggles
    const toggleNodeBorder = document.getElementById('toggle-node-border');
    const toggleTextBelow = document.getElementById('toggle-text-below');
    const toggleEdgeDesc = document.getElementById('toggle-edge-desc');

    // A timer for debouncing the save operation
    let saveDebounceTimer;

    // A set to keep track of nodes that have been moved since the last save.
    let movedNodes = new Set();

    // Store selected edge for modification/deletion
    let selectedEdge = null;

    // Global keyboard handler
    function handleGlobalKeyDown(e) {
        if (!ur) return;
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault(); // Prevent browser undo
                ur.undo();
                showToast("Undo", "info");
            } else if (e.key === 'y') {
                e.preventDefault(); // Prevent browser redo
                ur.redo();
                showToast("Redo", "info");
            }
        }
    }
    document.addEventListener('keydown', handleGlobalKeyDown);

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

            // Populate the node category dropdown for the sidebar form
            const nodeCategorySelector = document.getElementById('node-category');
            if (nodeCategorySelector) {
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
            if (currentGraphIdSpan) currentGraphIdSpan.textContent = '-';
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
                        category: node.category,
                        parent: node.parent
                    }
                };

                // Check for position data from the API
                if (node.position_x !== null && node.position_y !== null) {
                    nodeElement.position = { x: node.position_x, y: node.position_y };
                    hasPositionData = true;
                }
                elements.push(nodeElement);
            });

            graphData.edges.forEach((edge, index) => {
                elements.push({
                    group: 'edges',
                    data: {
                        id: `${edge.start.name}->${edge.end.name}_${index}`,
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
                    animate: false,
                    padding: 50
                },
                style: getGraphStyles(),
                wheelSensitivity: 0.2
            });

            cy.on('free', 'node', (event) => {
                movedNodes.add(event.target);
                debounceSavePositions();
            });

            cy.on('tap', 'core', () => {
                selectedEdge = null;
            });

            // Allow deleting edge with Delete key
            document.addEventListener('keydown', handleKeyDown);

            // Update ID display
            if (currentGraphIdSpan) currentGraphIdSpan.textContent = `ID: ${graphId}`;

            // --- Extension Initialization ---

            // 1. Undo-Redo
            ur = cy.undoRedo();

            // 2. Edgehandles
            const eh = cy.edgehandles({
                snap: true,
                canConnect: function (sourceNode, targetNode) {
                    return sourceNode !== targetNode; // Prevent self-loops
                },
                complete: function (sourceNode, targetNode, addedEles) {
                    console.log('Edgehandles complete:', sourceNode.id(), '->', targetNode.id());
                    // When an edge is created via UI, sync with backend
                    handleAddEdgeDirectly(sourceNode.id(), targetNode.id());
                },
                start: function (sourceNode) {
                    console.log('Edgehandles start:', sourceNode.id());
                },
                stop: function (sourceNode) {
                    console.log('Edgehandles stop:', sourceNode.id());
                },
                cancel: function (sourceNode, cancelledTargets) {
                    console.log('Edgehandles cancel:', sourceNode.id());
                }
            });

            // 3. Context Menu for Nodes
            cy.cxtmenu({
                selector: 'node',
                commands: [
                    {
                        content: '<span class="material-symbols-rounded">delete</span>',
                        select: function (ele) {
                            setTimeout(() => {
                                openConfirmModal(`Delete node "${ele.id()}" and all its connections?`, () => {
                                    deleteNode(ele.id());
                                });
                            }, 100);
                        }
                    },
                    {
                        content: '<span class="material-symbols-rounded">edit</span>',
                        select: function (ele) {
                            setTimeout(() => {
                                openEditNodeModal(ele.id(), ele.data('category'));
                            }, 100);
                        }
                    },
                    {
                        content: '<span class="material-symbols-rounded">arrow_outward</span>',
                        select: function (ele) {
                            // Start manual connection mode
                            startConnectionMode(ele);
                        }
                    },
                    {
                        content: '<span class="material-symbols-rounded">folder_open</span>',
                        select: function (ele) {
                            setTimeout(() => {
                                const selected = ele.cy().$('node:selected');
                                // If element itself is not selected but was clicked, include it?
                                // Cytoscape logic: usually click selects. But context menu might not.
                                // Let's rely on selected set if it contains at least 1. 
                                // If 0 selected, just use ele.
                                const nodesToGroup = selected.length > 0 ? selected : ele;
                                handleCreateGroup(nodesToGroup);
                            }, 100);
                        }
                    },
                    {
                        content: '<span class="material-symbols-rounded">folder_off</span>',
                        select: function (ele) {
                            if (!ele.isParent()) {
                                showToast("Not a group", "info");
                                return;
                            }
                            setTimeout(() => {
                                handleUngroup(ele);
                            }, 100);
                        },
                        disabled: (ele) => !ele.isParent()
                    }
                ],
                fillColor: 'rgba(255, 255, 255, 0.9)',
                activeFillColor: 'rgba(79, 70, 229, 0.1)',
                itemColor: '#1e293b',
                itemTextShadowColor: 'transparent',
                activeItemColor: '#4f46e5',
                indicatorSize: 24,
                separatorWidth: 3,
                spotlightPadding: 4,
                adaptativeNodeSpotlightRadius: true,
                minSpotlightRadius: 24,
                maxSpotlightRadius: 38,
                openMenuEvents: 'cxttapstart taphold',
            });

            // 4. Context Menu for Edges
            cy.cxtmenu({
                selector: 'edge',
                commands: [
                    {
                        content: '<span class="material-symbols-rounded">delete</span>',
                        select: function (ele) {
                            const edgeData = ele.data();
                            setTimeout(() => {
                                openConfirmModal(`Delete edge from ${edgeData.source} to ${edgeData.target}?`, () => {
                                    deleteEdge(edgeData.source, edgeData.target);
                                });
                            }, 100);
                        }
                    },
                    {
                        content: '<span class="material-symbols-rounded">edit</span>',
                        select: function (ele) {
                            const edgeData = ele.data();
                            setTimeout(() => {
                                openEditEdgeModal(edgeData.source, edgeData.target, edgeData.description);
                            }, 100);
                        }
                    }
                ],
                fillColor: 'rgba(255, 255, 255, 0.9)',
                activeFillColor: 'rgba(239, 68, 68, 0.1)',
                itemColor: '#1e293b',
                activeItemColor: '#ef4444',
                openMenuEvents: 'cxttapstart taphold',
            });



            // 5. Context Menu for Core (Background) - REMOVED per user request to move back to sidebar
            // But user also said "retain ability to add new nodes". 
            // Previous instruction said "move back". I will remove this to avoid duplication/clutter.
            /* 
            cy.cxtmenu({ ... selector: 'core' ... }) 
            */

            // Keyboard shortcuts for Undo/Redo
            document.removeEventListener('keydown', handleGlobalKeyDown);
            document.addEventListener('keydown', handleGlobalKeyDown);

            function handleGlobalKeyDown(e) {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'z') {
                        ur.undo();
                        showToast("Undo", "info");
                    } else if (e.key === 'y') {
                        ur.redo();
                        showToast("Redo", "info");
                    }
                }
            }

            // Listen for Undo/Redo events to persist state (positions)
            // cytoscape-undo-redo emits 'afterUndo' and 'afterRedo' on the cy instance
            cy.on('afterUndo afterRedo', () => {
                // Save positions of ALL nodes to ensure sync
                // We use a small timeout to ensure the DOM/model is fully settled if needed
                setTimeout(() => {
                    const allNodes = cy.nodes().toArray();
                    saveNodePositions(allNodes);
                }, 100);
            });

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
        const showEdgeDesc = toggleEdgeDesc.checked;

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
                selector: ':parent',
                style: {
                    'background-color': '#f0f9ff', // light blue
                    // 'background-opacity': 0.3,
                    'border-color': '#bae6fd',
                    'border-width': 2,
                    'label': 'data(name)',
                    'text-valign': 'top',
                    'text-halign': 'center',
                    'text-margin-y': -5,
                    'padding': '20px',
                    'font-weight': 'bold',
                    'font-size': '14px',
                    'color': '#0284c7'
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
                    'control-point-step-size': 40,
                    'arrow-scale': 1.2,
                    'label': showEdgeDesc ? 'data(description)' : '',
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
    /**
     * Gathers node positions and sends them to the API.
     * @param {Array} nodes - Optional array of nodes to save. If not provided, saves 'movedNodes'.
     */
    async function saveNodePositions(nodes = null) {
        if (!cy || currentGraphId === null) return;

        let nodesToProcess = [];
        if (nodes && Array.isArray(nodes) && nodes.length > 0) {
            nodesToProcess = nodes;
        } else {
            if (movedNodes.size === 0) return;
            nodesToProcess = Array.from(movedNodes);
        }

        const positions = [];
        for (const node of nodesToProcess) {
            // Guard against deleted nodes that might still be in the set/list
            if (typeof node.position !== 'function') continue;

            const pos = node.position();
            positions.push({
                name: node.id(),
                position_x: Math.floor(pos.x),
                position_y: Math.floor(pos.y)
            });
        }

        if (positions.length === 0) return;

        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/nodes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ "nodes": positions })
            });
            if (!response.ok) throw new Error('Failed to save node positions');

            console.log(`Node positions saved for ${positions.length} nodes`);
            showToast('Node positions saved!', 'success');

            // If we processed the movedNodes set (default), clear it.
            // If explicit list, we typically don't need to clear movedNodes, 
            // but effectively those nodes are 'saved', so valid to remove them from set too.
            if (!nodes) {
                movedNodes.clear();
            } else {
                // Remove processed nodes from movedNodes set to avoid double save
                nodesToProcess.forEach(n => movedNodes.delete(n));
            }
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

    async function handleKeyDown(event) {
        if (event.key === 'Escape') {
            cancelConnectionMode();
        }
        if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEdge && currentGraphId !== null) {
            const edgeData = selectedEdge.data();
            openConfirmModal(`Delete edge from ${edgeData.source} to ${edgeData.target}?`, () => {
                deleteEdge(edgeData.source, edgeData.target);
            });
        }
    }

    async function deleteEdge(start, end) {
        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/edges?start_node=${start}&end_node=${end}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete edge');
            showToast('Edge deleted!', 'success');
            initializeGraph(currentGraphId);
            selectedEdge = null;
        } catch (error) {
            console.error(error);
            showToast('Error deleting edge.', 'error');
        }
    }

    async function deleteNode(nodeName) {
        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/nodes?node_name=${nodeName}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete node');
            showToast(`Node "${nodeName}" deleted!`, 'success');
            initializeGraph(currentGraphId);
        } catch (error) {
            console.error(error);
            showToast('Error deleting node.', 'error');
        }
    }

    async function updateNode(oldName, newName, newCategory, newParent = undefined) {
        try {
            const payload = {
                name: newName,
                category: newCategory
            };
            if (newParent !== undefined) {
                payload.parent = newParent;
            }

            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/nodes/${oldName}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Failed to update node');
            showToast(`Node updated!`, 'success');
            initializeGraph(currentGraphId);
        } catch (error) {
            console.error(error);
            showToast('Error updating node. Name might already exist.', 'error');
        }
    }

    async function handleCreateGroup(selectedNodes) {
        const groupName = prompt("Enter name for the new group:");
        if (!groupName) return;

        try {
            // 1. Create the group node
            // Check if it exists first? valid since addNewNode might throw/toast error
            // We'll try to add it. Category 'Group' is suggested.
            await addNewNode(groupName, 'Group');

            // 2. Move nodes into group
            // We do this sequentially for now.
            for (const node of selectedNodes) {
                await updateNode(node.id(), node.id(), node.data('category'), groupName);
            }

            showToast(`Group "${groupName}" created with ${selectedNodes.length} nodes`, 'success');
            // initializeGraph is called by updateNode, but multiple calls might cause flicker.
            // Ideally we'd have a bulk update endpoint, but for now this works.
        } catch (error) {
            console.error('Group creation failed:', error);
            showToast('Failed to create group', 'error');
        }
    }

    async function handleUngroup(groupNode) {
        if (!groupNode.isParent()) return;

        const children = groupNode.children();
        const parentOfGroup = groupNode.parent();
        const newParentId = parentOfGroup.length > 0 ? parentOfGroup.id() : "";
        // If nested, move children to grandparent. If top-level, move to root ("").

        try {
            // 1. Move children out
            for (const child of children) {
                await updateNode(child.id(), child.id(), child.data('category'), newParentId);
            }
            // 2. Delete the group node
            await deleteNode(groupNode.id());
            showToast('Group dissolved', 'success');
        } catch (error) {
            console.error('Ungroup failed:', error);
            showToast('Failed to ungroup', 'error');
        }
    }

    async function updateEdgeDescription(source, target, description) {
        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/edges`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_node: source,
                    end_node: target,
                    description: description
                })
            });
            if (!response.ok) throw new Error('Failed to update edge');
            showToast('Edge description updated!', 'success');
            initializeGraph(currentGraphId);
        } catch (error) {
            console.error(error);
            showToast('Error updating edge.', 'error');
        }
    }

    async function addNewNode(nodeName, nodeCategory) {
        if (currentGraphId === null) {
            showToast('No graph selected.', 'error');
            return;
        }
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
            initializeGraph(currentGraphId);
        } catch (error) {
            console.error(error);
            showToast('Error adding node. Already exists?', 'error');
        }
    }

    async function handleAddEdgeDirectly(startNode, endNode) {
        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/edges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start_node: startNode, end_node: endNode, description: "" })
            });
            if (!response.ok) throw new Error('Failed to add edge');

            showToast(`Edge added!`, 'success');
            // No need to re-initialize the whole graph if we just added one, 
            // but for simplicity and to ensure sync:
            initializeGraph(currentGraphId);
        } catch (error) {
            console.error(error);
            showToast('Error adding edge.', 'error');
            // If it failed on backend, remove it from UI
            initializeGraph(currentGraphId);
        }
    }

    function startConnectionMode(sourceNode) {
        if (connectionModeSource) cancelConnectionMode(); // Reset if active

        connectionModeSource = sourceNode;
        const cyInst = sourceNode.cy();

        // Visual feedback on source
        sourceNode.addClass('eh-source');

        // Create ghost node and edge
        const ghostNode = cyInst.add({
            group: 'nodes',
            data: { id: 'conn-ghost-node' },
            position: { ...sourceNode.position() }, // Copy position to avoid reference update
            style: {
                'width': 1,
                'height': 1,
                'opacity': 0,
                'events': 'no'
            }
        });

        const ghostEdge = cyInst.add({
            group: 'edges',
            data: {
                id: 'conn-ghost-edge',
                source: sourceNode.id(),
                target: ghostNode.id()
            },
            style: {
                'line-color': '#9dbaea',
                'line-style': 'dashed',
                'target-arrow-shape': 'triangle',
                'events': 'no'
            }
        });

        // Event handler for moving ghost
        const moveHandler = (e) => {
            ghostNode.position(e.position);
        };

        // Event handler for selecting target
        const tapHandler = (e) => {
            const target = e.target;
            if (target === cyInst || target === sourceNode) {
                // Clicked background or self -> Cancel
                cancelConnectionMode();
            } else if (target.isNode() && target.id() !== 'conn-ghost-node') {
                // Clicked target -> Create Edge
                const targetNode = target;
                if (sourceNode.id() !== targetNode.id()) {
                    handleAddEdgeDirectly(sourceNode.id(), targetNode.id());
                    cancelConnectionMode();
                }
            }
        };

        // Attach listeners 
        cyInst.on('mousemove', moveHandler);
        cyInst.on('tap', tapHandler);

        // Store cleanup function on the source node object temporarily (or global)
        connectionModeSource.cleanup = () => {
            cyInst.removeListener('mousemove', moveHandler);
            cyInst.removeListener('tap', tapHandler);
            // safe remove
            if (ghostNode && !ghostNode.removed()) cyInst.remove(ghostNode);
            if (ghostEdge && !ghostEdge.removed()) cyInst.remove(ghostEdge);
            sourceNode.removeClass('eh-source');
            connectionModeSource = null;
        };

        showToast('Select target node to connect', 'info');
    }

    function cancelConnectionMode() {
        if (connectionModeSource && connectionModeSource.cleanup) {
            connectionModeSource.cleanup();
        }
    }

    async function handleAddNode(event) {
        event.preventDefault();
        const nodeName = document.getElementById('node-name').value;
        const nodeCategory = document.getElementById('node-category').value;
        await addNewNode(nodeName, nodeCategory);
        document.getElementById('node-name').value = ''; // Reset input
    }

    async function handleDeleteGraph() {
        if (currentGraphId === null) return;
        if (!confirm('Are you sure you want to delete this ENTIRE graph? This cannot be undone.')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete graph');

            showToast('Graph deleted!', 'success');
            await fetchAndPopulateGraphSelector();
        } catch (error) {
            console.error(error);
            showToast('Error deleting graph.', 'error');
        }
    }

    // Modal Handling
    function openEditNodeModal(nodeName, nodeCategory) {
        const modal = document.getElementById('edit-node-modal');
        const inputName = document.getElementById('edit-node-name');
        const inputOriginalName = document.getElementById('edit-node-original-name');
        const selectCategory = document.getElementById('edit-node-category');

        inputName.value = nodeName;
        inputOriginalName.value = nodeName;

        // Populate categories
        selectCategory.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = 'Default';
        defaultOption.textContent = 'Default';
        selectCategory.appendChild(defaultOption);

        if (uiConfig && uiConfig.node_categories) {
            uiConfig.node_categories.forEach(category => {
                if (category.name !== 'Default') {
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.textContent = category.name;
                    selectCategory.appendChild(option);
                }
            });
        }

        selectCategory.value = nodeCategory || 'Default';

        modal.style.display = 'flex';
    }

    function closeEditNodeModal() {
        const modal = document.getElementById('edit-node-modal');
        modal.style.display = 'none';
    }

    async function handleEditNodeSubmit(event) {
        event.preventDefault();
        const oldName = document.getElementById('edit-node-original-name').value;
        const newName = document.getElementById('edit-node-name').value;
        const newCategory = document.getElementById('edit-node-category').value;

        if (newName && (newName !== oldName || newCategory)) { // If changed
            await updateNode(oldName, newName, newCategory);
        }
        closeEditNodeModal();
    }

    // Generic Confirm Modal
    let confirmCallback = null;
    function openConfirmModal(message, callback) {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-modal-message');
        msgEl.textContent = message;
        confirmCallback = callback;
        modal.style.display = 'flex';
    }

    function closeConfirmModal() {
        const modal = document.getElementById('confirm-modal');
        modal.style.display = 'none';
        confirmCallback = null;
    }

    // Edge Edit Modal
    function openEditEdgeModal(source, target, description) {
        const modal = document.getElementById('edit-edge-modal');
        document.getElementById('edit-edge-source').value = source;
        document.getElementById('edit-edge-target').value = target;
        document.getElementById('edit-edge-description').value = description || '';
        modal.style.display = 'flex';
    }

    function closeEditEdgeModal() {
        const modal = document.getElementById('edit-edge-modal');
        modal.style.display = 'none';
    }

    async function handleEditEdgeSubmit(event) {
        event.preventDefault();
        const source = document.getElementById('edit-edge-source').value;
        const target = document.getElementById('edit-edge-target').value;
        const description = document.getElementById('edit-edge-description').value;

        await updateEdgeDescription(source, target, description);
        closeEditEdgeModal();
    }

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
    // Attach event listeners
    const addNodeForm = document.getElementById('add-node-form');
    if (addNodeForm) addNodeForm.addEventListener('submit', handleAddNode);
    document.getElementById('edit-node-form').addEventListener('submit', handleEditNodeSubmit);
    document.getElementById('cancel-edit-node').addEventListener('click', closeEditNodeModal);

    document.getElementById('edit-edge-form').addEventListener('submit', handleEditEdgeSubmit);
    document.getElementById('cancel-edit-edge').addEventListener('click', closeEditEdgeModal);

    document.getElementById('cancel-confirm').addEventListener('click', closeConfirmModal);
    document.getElementById('ok-confirm').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeConfirmModal();
    });

    document.getElementById('create-graph-form').addEventListener('submit', handleCreateGraph);
    document.getElementById('save-graphs-form').addEventListener('submit', handleSaveGraphs);
    document.getElementById('export-graph-png-form').addEventListener('submit', handleExportPng);
    document.getElementById('delete-graph-btn').addEventListener('click', () => {
        if (currentGraphId === null) return;
        openConfirmModal('Are you sure you want to delete this ENTIRE graph? This cannot be undone.', async () => {
            // Logic from handleDeleteGraph (which we should arguably refactor, but for now just call API)
            try {
                const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('Failed to delete graph');
                showToast('Graph deleted!', 'success');
                await fetchAndPopulateGraphSelector();
            } catch (error) {
                console.error(error);
                showToast('Error deleting graph.', 'error');
            }
        });
    });

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
    toggleEdgeDesc.addEventListener('change', () => {
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
