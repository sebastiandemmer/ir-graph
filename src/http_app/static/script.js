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
    const API_BASE_URL = '/api';

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
    const toggleEdgeDesc = document.getElementById('toggle-edge-desc');
    const edgeModeSelect = document.getElementById('edge-mode-select');

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
    // ── Custom Category Picker ───────────────────────────────────────────────

    /**
     * Build and wire a custom icon+text category picker.
     * @param {string} pickerId  - id of the .cat-picker container div
     * @param {string} inputId   - id of the hidden <input> that holds the value
     * @param {Array}  categories - [{name, icon?}, ...] from uiConfig
     * @param {string} selected  - initially selected category name
     */
    function buildCategoryPicker(pickerId, inputId, categories, selected = 'Default') {
        const picker = document.getElementById(pickerId);
        const hiddenInput = document.getElementById(inputId);
        const trigger = picker.querySelector('.cat-picker-trigger');
        const dropdown = picker.querySelector('.cat-picker-dropdown');

        // Build the option list
        dropdown.innerHTML = '';
        categories.forEach(cat => {
            const opt = document.createElement('div');
            opt.className = 'cat-picker-option' + (cat.name === selected ? ' selected' : '');
            opt.dataset.value = cat.name;
            opt.setAttribute('role', 'option');

            if (cat.icon) {
                const img = document.createElement('img');
                img.src = cat.icon;
                img.alt = '';
                opt.appendChild(img);
            } else {
                const placeholder = document.createElement('span');
                placeholder.className = 'cat-no-icon material-symbols-rounded';
                placeholder.textContent = 'category';
                opt.appendChild(placeholder);
            }

            const label = document.createElement('span');
            label.textContent = cat.name;
            opt.appendChild(label);

            opt.addEventListener('click', () => {
                selectPickerValue(picker, hiddenInput, trigger, cat);
                closePicker(picker, trigger);
            });

            dropdown.appendChild(opt);
        });

        // Set initial selected value
        const initialCat = categories.find(c => c.name === selected) || categories[0];
        if (initialCat) selectPickerValue(picker, hiddenInput, trigger, initialCat, true);

        // Toggle open/close on trigger click
        trigger.onclick = (e) => {
            e.stopPropagation();
            const isOpen = picker.classList.toggle('open');
            trigger.setAttribute('aria-expanded', String(isOpen));
        };
    }

    function selectPickerValue(picker, hiddenInput, trigger, cat, silent = false) {
        hiddenInput.value = cat.name;

        // Update trigger display
        // Remove old icon/img/placeholder (first child of trigger)
        const existingIcon = trigger.querySelector('.cat-picker-icon, .cat-picker-placeholder-icon');
        if (existingIcon) existingIcon.remove();

        if (cat.icon) {
            const img = document.createElement('img');
            img.src = cat.icon;
            img.alt = '';
            img.className = 'cat-picker-icon';
            trigger.insertBefore(img, trigger.firstChild);
        } else {
            const span = document.createElement('span');
            span.className = 'material-symbols-rounded cat-picker-placeholder-icon';
            span.textContent = 'category';
            trigger.insertBefore(span, trigger.firstChild);
        }

        trigger.querySelector('.cat-picker-label').textContent = cat.name;

        // Mark selected in dropdown
        picker.querySelectorAll('.cat-picker-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.value === cat.name);
        });
    }

    function closePicker(picker, trigger) {
        picker.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
    }

    // Close any open picker when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.cat-picker.open').forEach(p => {
            p.classList.remove('open');
            p.querySelector('.cat-picker-trigger')?.setAttribute('aria-expanded', 'false');
        });
    });

    // ── UI Config / Category Fetch ───────────────────────────────────────────

    async function fetchUiConfig() {
        try {
            const response = await fetch(`${API_BASE_URL}/config`);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            uiConfig = await response.json();

            // Populate the category picker for the Add Node form
            if (uiConfig.node_categories) {
                buildCategoryPicker('cat-picker-add', 'node-category', uiConfig.node_categories, 'Default');
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

            // Setup UI Toggles from graph config
            if (edgeModeSelect && graphData.edge_mode) {
                edgeModeSelect.value = graphData.edge_mode;
            }
            if (toggleNodeBorder && graphData.show_node_borders !== undefined) {
                toggleNodeBorder.checked = graphData.show_node_borders === true;
            }
            if (toggleEdgeDesc && graphData.show_edge_descriptions !== undefined) {
                toggleEdgeDesc.checked = graphData.show_edge_descriptions === true;
            }

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
                        parent: node.parent,
                        description: node.description
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
                        description: edge.description,
                        style: edge.style
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
                // 'wheelSensitivity': 0.2 generates a warning about mainstream mice unless needed, we can remove it or set it larger to suppress warning but removing is safer.
                wheelSensitivity: undefined // Fall back to default
            });

            cy.on('free', 'node', (event) => {
                movedNodes.add(event.target);
                debounceSavePositions();
            });

            cy.on('tap', (event) => {
                if (event.target === cy) {
                    selectedEdge = null;
                }
            });

            // Allow deleting edge with Delete key
            document.addEventListener('keydown', handleKeyDown);

            // Update ID display
            if (currentGraphIdSpan) currentGraphIdSpan.textContent = `ID: ${graphId}`;

            // --- Extension Initialization ---
            // 1. Undo-Redo
            ur = cy.undoRedo();

            // 4. Context Menu Initialization (edge editing extension injects its commands here)
            if (cy.contextMenus) {
                cy.contextMenus({
                    menuItems: []
                });
            }



            // 5. Context Menu for Core (Background) - REMOVED per user request to move back to sidebar
            // But user also said "retain ability to add new nodes". 
            // Previous instruction said "move back". I will remove this to avoid duplication/clutter.
            /* 
            cy.cxtmenu({ ... selector: 'core' ... }) 
            */


            // Initialize Edge Editing
            if (cy.edgeEditing) {
                cy.edgeEditing({
                    undoable: true,
                    enableCreateAnchorOnDrag: true
                });
            }

            // 2. Edgehandles
            const eh = cy.edgehandles({
                snap: true,
                canConnect: function (sourceNode, targetNode) {
                    return true; // Allow multiple and self-loops
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
                activeFillColor: 'rgba(132, 94, 194, 0.1)',
                itemColor: '#4b4453',
                itemTextShadowColor: 'transparent',
                activeItemColor: '#845ec2',
                indicatorSize: 24,
                separatorWidth: 3,
                spotlightPadding: 4,
                adaptativeNodeSpotlightRadius: true,
                minSpotlightRadius: 24,
                maxSpotlightRadius: 38,
                openMenuEvents: 'cxttapstart taphold',
            });

            // 5. Context Menu for Edges
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
                                openEditEdgeModal(edgeData.source, edgeData.target, edgeData.description, edgeData.style);
                            }, 100);
                        }
                    }
                ],
                fillColor: 'rgba(255, 255, 255, 0.9)',
                activeFillColor: 'rgba(255, 128, 102, 0.1)',
                itemColor: '#4b4453',
                itemTextShadowColor: 'transparent',
                activeItemColor: '#ff8066',
                indicatorSize: 24,
                separatorWidth: 3,
                spotlightPadding: 4,
                openMenuEvents: 'cxttapstart taphold',
            });

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
        const showEdgeDesc = toggleEdgeDesc.checked;
        const edgeMode = edgeModeSelect ? edgeModeSelect.value : 'bezier';
        // Taxi distances
        const isTaxi = edgeMode === 'taxi' || edgeMode === 'round-taxi';

        // Base styles
        const styles = [
            {
                selector: 'node',
                style: {
                    'label': function (ele) {
                        const name = ele.data('name');
                        const description = ele.data('description');
                        return description ? `${name}\n${description}` : name;
                    },
                    'color': '#4b4453',
                    'shape': 'round-rectangle',
                    'text-valign': function (ele) {
                        return ele.data('category') === 'Default' ? 'center' : 'bottom';
                    },
                    'text-halign': 'center',
                    'text-margin-y': function (ele) {
                        return ele.data('category') === 'Default' ? '0px' : '8px';
                    },
                    'width': function (ele) {
                        if (ele.data('category') !== 'Default') return 40;
                        
                        const defaultCanvas = document.createElement('canvas');
                        const ctx = defaultCanvas.getContext('2d');
                        ctx.font = '600 12px Inter, system-ui, sans-serif';
                        
                        const name = ele.data('name') || '';
                        const desc = ele.data('description') || '';
                        const text = desc ? `${name}\n${desc}` : name;
                        
                        const lines = text.split('\n');
                        let maxWidth = 40;
                        lines.forEach(l => {
                            let w = ctx.measureText(l).width;
                            if (w > maxWidth) maxWidth = w;
                        });
                        return Math.min(maxWidth, 150);
                    },
                    'height': function (ele) {
                        if (ele.data('category') !== 'Default') return 40;
                        
                        const defaultCanvas = document.createElement('canvas');
                        const ctx = defaultCanvas.getContext('2d');
                        ctx.font = '600 12px Inter, system-ui, sans-serif';
                        
                        const name = ele.data('name') || '';
                        const desc = ele.data('description') || '';
                        const text = desc ? `${name}\n${desc}` : name;
                        
                        const lines = text.split('\n');
                        let virtualLines = 0;
                        lines.forEach(l => {
                            let w = ctx.measureText(l).width;
                            virtualLines += Math.max(1, Math.ceil(w / 150));
                        });
                        return Math.max(30, virtualLines * 16); // 16px line-height estimate
                    },
                    'font-family': 'Inter, system-ui, sans-serif',
                    'font-weight': '600',
                    'font-size': '12px',
                    'background-color': '#ffffff',
                    'border-width': showBorder ? 2 : 0, // Toggle border
                    'border-color': '#b0a8b9',
                    'padding': '12px',
                    'text-wrap': 'wrap',
                    'text-max-width': '150px',
                    'text-justification': 'center'
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 2,
                    'border-color': '#845ec2',
                    'background-color': '#f9f8fa'
                }
            },
            {
                selector: ':parent',
                style: {
                    'background-color': '#f9f8fa',
                    // 'background-opacity': 0.3,
                    'border-color': '#b0a8b9',
                    'border-width': 2,
                    'label': 'data(name)',
                    'text-valign': 'top',
                    'text-halign': 'center',
                    'text-margin-y': -5,
                    'padding': '20px',
                    'font-weight': 'bold',
                    'font-size': '14px',
                    'color': '#4b4453'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#b0a8b9',
                    'line-style': function (ele) {
                        const s = ele.data('style');
                        return (s === 'dotted') ? 'dotted' : 'solid';
                    },
                    'target-arrow-color': '#b0a8b9',
                    'target-arrow-shape': 'triangle',
                    'curve-style': function (ele) {
                        // Force bezier for self-loops to ensure they render
                        if (ele.source().id() === ele.target().id()) return 'bezier';
                        if (edgeMode === 'bezier') return 'unbundled-bezier';
                        return edgeMode;
                    },
                    'taxi-direction': 'auto',
                    'taxi-turn': edgeMode === 'round-taxi' ? 20 : '50%',
                    'taxi-turn-min-distance': edgeMode === 'round-taxi' ? 5 : 10,
                    'taxi-radius': edgeMode === 'round-taxi' ? 10 : 0,
                    'arrow-scale': 1.2,
                    'label': showEdgeDesc ? 'data(description)' : '',
                    'text-rotation': 'autorotate',
                    'text-margin-y': -10,
                    'font-size': '10px',
                    'color': '#4b4453',
                    'text-background-opacity': 1,
                    'text-background-color': '#ffffff',
                    'text-background-padding': '3px',
                    'text-background-shape': 'round-rectangle',
                    'z-index': 10
                }
            },
            {
                selector: 'edge:selected',
                style: {
                    'line-color': '#845ec2',
                    'target-arrow-color': '#845ec2'
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

        if (edgeMode === 'bezier') {
            styles.push({
                selector: 'edge',
                style: {
                    'control-point-step-size': 40,
                    'control-point-distances': function (ele) {
                        const source = ele.source();
                        const target = ele.target();
                        const parallelEdges = ele.cy().edges().filter(e =>
                            (e.source().id() === source.id() && e.target().id() === target.id()) ||
                            (e.source().id() === target.id() && e.target().id() === source.id())
                        );
                        const total = parallelEdges.length;
                        
                        if (total <= 1) {
                            return [30];
                        }

                        const sortedEdges = parallelEdges.toArray().sort((a, b) => a.id().localeCompare(b.id()));
                        const index = sortedEdges.indexOf(ele);
                        const step = 40;
                        return [(index - (total - 1) / 2) * step];
                    },
                    'control-point-weights': [0.5]
                }
            });
        }

        if (edgeMode === 'unbundled-bezier') {
            styles.push({
                selector: 'edge',
                style: {
                    'control-point-distances': [40, -40],
                    'control-point-weights': [0.250, 0.75]
                }
            });
        }

        return styles;
    }

    /**
     * Fetches the list of graphs and populates the graph selector dropdown.
     */
    async function fetchAndPopulateGraphSelector(targetIndex = 0) {
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

                let targetId = (targetIndex !== undefined && targetIndex !== null && targetIndex < graphsList.length) ? targetIndex : 0;
                currentGraphId = targetId;
                graphSelector.value = currentGraphId;
                mainGraphTitle.textContent = graphsList[targetId].name || `Graph ${targetId}`;
                initializeGraph(currentGraphId);
                history.replaceState(null, '', `?graph=${currentGraphId}`);
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

    async function updateNode(oldName, newName, newCategory, newParent = undefined, newDescription = undefined) {
        try {
            const payload = {
                name: newName,
                category: newCategory
            };
            if (newParent !== undefined) {
                payload.parent = newParent;
            }
            if (newDescription !== undefined) {
                payload.description = newDescription;
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

    async function updateEdgeAttributes(source, target, description, style) {
        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/edges`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_node: source,
                    end_node: target,
                    description: description,
                    style: style
                })
            });
            if (!response.ok) throw new Error('Failed to update edge');
            showToast('Edge updated!', 'success');

            // Update local cytoscape instance directly to reflect changes
            // Find edge between source and target
            const edge = cy.edges().filter(e => e.data('source') === source && e.data('target') === target);
            if (edge.length > 0) {
                if (description !== undefined) edge.data('description', description);
                if (style !== undefined) edge.data('style', style);
            }

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

        // Calculate position
        let position_x = 0;
        let position_y = 0;

        if (cy) {
            const pan = cy.pan();
            const zoom = cy.zoom();
            const w = cy.width();
            const h = cy.height();

            // Center of the viewport in model coordinates
            const centerX = (w / 2 - pan.x) / zoom;
            const centerY = (h / 2 - pan.y) / zoom;

            // Add random offset (-50 to +50)
            position_x = Math.round(centerX + (Math.random() * 100 - 50));
            position_y = Math.round(centerY + (Math.random() * 100 - 50));
        }

        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/nodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nodeName,
                    category: nodeCategory,
                    position_x: position_x,
                    position_y: position_y
                })
            });
            if (!response.ok) throw new Error('Failed to add node');

            showToast(`Node "${nodeName}" added!`, 'success');
            await initializeGraph(currentGraphId);

            // Auto-select the new node
            if (cy) {
                const newNode = cy.$id(nodeName);
                if (newNode.length > 0) {
                    newNode.select();
                    // Optional: Center on the new node if it was somehow off-screen, 
                    // though we calculated it to be in center.
                }
            }

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
        const inputDescription = document.getElementById('edit-node-description');

        inputName.value = nodeName;
        inputOriginalName.value = nodeName;

        // Fetch current description from cytoscape node
        const node = cy.$id(nodeName);
        if (node.length > 0) {
            inputDescription.value = node.data('description') || '';
        } else {
            inputDescription.value = '';
        }

        // Populate category picker and pre-select current category
        if (uiConfig && uiConfig.node_categories) {
            buildCategoryPicker('cat-picker-edit', 'edit-node-category', uiConfig.node_categories, nodeCategory || 'Default');
        }

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
        const newDescription = document.getElementById('edit-node-description').value;

        // Always update if submit is clicked to ensure description is saved even if name/category unchanged
        // But to be efficient, we check. 
        // Actually, checking previous description is hard without storing it. 
        // Let's just always update for now.
        await updateNode(oldName, newName, newCategory, undefined, newDescription);

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
    function openEditEdgeModal(source, target, description, style) {
        const modal = document.getElementById('edit-edge-modal');
        document.getElementById('edit-edge-source').value = source;
        document.getElementById('edit-edge-target').value = target;
        document.getElementById('edit-edge-description').value = description || '';
        document.getElementById('edit-edge-style').value = style || 'solid';
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
        const style = document.getElementById('edit-edge-style').value;

        await updateEdgeAttributes(source, target, description, style);
        closeEditEdgeModal();
    }

    // Rename Graph Modal
    function openRenameGraphModal() {
        if (currentGraphId === null) return;
        const modal = document.getElementById('rename-graph-modal');
        const inputName = document.getElementById('rename-graph-name');
        inputName.value = mainGraphTitle.textContent.trim();
        modal.style.display = 'flex';
    }

    function closeRenameGraphModal() {
        const modal = document.getElementById('rename-graph-modal');
        modal.style.display = 'none';
    }

    async function handleRenameGraphSubmit(event) {
        event.preventDefault();
        if (currentGraphId === null) return;

        const currentName = mainGraphTitle.textContent.trim();
        const newName = document.getElementById('rename-graph-name').value;
        if (!newName || newName === currentName) {
            closeRenameGraphModal();
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });
            if (!response.ok) throw new Error('Failed to rename graph');
            showToast('Graph renamed!', 'success');
            await fetchAndPopulateGraphSelector(currentGraphId);
            closeRenameGraphModal();
        } catch (error) {
            console.error(error);
            showToast('Error renaming graph.', 'error');
        }
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
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const graphName = mainGraphTitle.textContent.trim() || `graph-${currentGraphId}`;
        link.download = `${graphName}_${timestamp}.png`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Exporting PNG...', 'info');
    }

    // --- JSON Export / Import ---

    async function handleExportGraph() {
        if (currentGraphId === null) {
            showToast('No graph selected to export.', 'error');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/export`);
            if (!response.ok) throw new Error('Export request failed');

            const blob = await response.blob();
            const graphName = mainGraphTitle.textContent.trim() || `graph-${currentGraphId}`;
            const filename = response.headers.get('Content-Disposition')
                ?.match(/filename="?([^"]+)"?/)?.[1]
                || `${graphName.replace(/\s+/g, '_')}_graph.json`;

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('Graph exported as JSON!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error exporting graph.', 'error');
        }
    }

    async function handleImportGraph(file) {
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);

            if (!parsed.graph) {
                showToast('Invalid JSON: missing "graph" key.', 'error');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/graphs/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ graph: parsed.graph })
            });
            if (!response.ok) throw new Error('Import request failed');

            const data = await response.json();
            showToast(`Graph "${parsed.graph.name}" imported!`, 'success');
            await fetchAndPopulateGraphSelector(data.new_graph_id);
        } catch (error) {
            console.error(error);
            showToast('Error importing graph. Check file format.', 'error');
        } finally {
            // Reset the file input so the same file can be re-selected
            const fileInput = document.getElementById('import-graph-json-input');
            if (fileInput) fileInput.value = '';
        }
    }

    // --- Initial Setup ---
    async function main() {
        await fetchUiConfig();
        const urlParams = new URLSearchParams(window.location.search);
        let initialGraphId = 0;
        if (urlParams.has('graph')) {
            initialGraphId = parseInt(urlParams.get('graph'), 10);
            if (isNaN(initialGraphId)) initialGraphId = 0;
        }
        await fetchAndPopulateGraphSelector(initialGraphId);
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

    document.getElementById('rename-graph-form').addEventListener('submit', handleRenameGraphSubmit);
    document.getElementById('cancel-rename-graph').addEventListener('click', closeRenameGraphModal);

    document.getElementById('create-graph-form').addEventListener('submit', handleCreateGraph);
    document.getElementById('save-graphs-form').addEventListener('submit', handleSaveGraphs);
    document.getElementById('export-graph-png-form').addEventListener('submit', handleExportPng);
    document.getElementById('rename-graph-btn').addEventListener('click', openRenameGraphModal);

    document.getElementById('duplicate-graph-btn').addEventListener('click', async () => {
        if (currentGraphId === null) return;
        try {
            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}/duplicate`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to duplicate graph');
            showToast('Graph duplicated!', 'success');
            const data = await response.json();
            await fetchAndPopulateGraphSelector(data.new_graph_id);
        } catch (error) {
            console.error(error);
            showToast('Error duplicating graph.', 'error');
        }
    });

    // Export JSON
    document.getElementById('export-graph-json-btn').addEventListener('click', handleExportGraph);

    // Import JSON — button triggers the hidden file input
    document.getElementById('import-graph-json-btn').addEventListener('click', () => {
        document.getElementById('import-graph-json-input').click();
    });
    document.getElementById('import-graph-json-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImportGraph(file);
    });

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

    // Update view settings on backend
    async function updateGraphSettings() {
        if (currentGraphId === null) return;
        try {
            const body = {};
            if (edgeModeSelect) body.edge_mode = edgeModeSelect.value;
            if (toggleNodeBorder) body.show_node_borders = toggleNodeBorder.checked;
            if (toggleEdgeDesc) body.show_edge_descriptions = toggleEdgeDesc.checked;

            const response = await fetch(`${API_BASE_URL}/graphs/${currentGraphId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.ok) throw new Error('Failed to update settings');
        } catch (error) {
            console.error('Failed to update graph settings:', error);
            showToast('Failed to save settings', 'error');
        }
    }

    // View Option Toggles
    toggleNodeBorder.addEventListener('change', () => {
        if (cy) {
            cy.style(getGraphStyles());
            updateGraphSettings();
        }
    });
    toggleEdgeDesc.addEventListener('change', () => {
        if (cy) {
            cy.style(getGraphStyles());
            updateGraphSettings();
        }
    });

    if (edgeModeSelect) {
        edgeModeSelect.addEventListener('change', () => {
            if (cy) {
                // The edge-editing extension sets inline styles (like curve-style and control-points) to edges when interacted with. 
                // We must remove these inline styles so the global stylesheet can take over again when changing modes.
                cy.edges().removeStyle();
                cy.style(getGraphStyles()).update();
                updateGraphSettings();
            }
        });
    }

    document.getElementById('graph-selector').addEventListener('change', (event) => {
        currentGraphId = parseInt(event.target.value, 10);
        const selectedOption = event.target.options[event.target.selectedIndex];
        mainGraphTitle.textContent = selectedOption.textContent;
        initializeGraph(currentGraphId);
        history.pushState(null, '', `?graph=${currentGraphId}`);
    });

    window.addEventListener('popstate', () => {
        const urlParams = new URLSearchParams(window.location.search);
        let graphId = 0;
        if (urlParams.has('graph')) {
            graphId = parseInt(urlParams.get('graph'), 10);
            if (isNaN(graphId)) graphId = 0;
        }
        const graphSelector = document.getElementById('graph-selector');
        if (graphSelector && graphSelector.options && graphSelector.options.length > graphId) {
            currentGraphId = graphId;
            graphSelector.value = currentGraphId;
            const selectedOption = graphSelector.options[graphSelector.selectedIndex];
            mainGraphTitle.textContent = selectedOption.textContent;
            initializeGraph(currentGraphId);
        }
    });

    main();
});
