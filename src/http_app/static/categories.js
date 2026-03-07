/**
 * categories.js — Category Manager frontend logic
 * Standalone: no dependency on script.js
 */

document.addEventListener('DOMContentLoaded', () => {
    const API = '/api/categories';

    // ── Toast ───────────────────────────────────────────────────────────────

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        let iconName = 'info';
        if (type === 'success') iconName = 'check_circle';
        if (type === 'error') iconName = 'error';
        toast.innerHTML = `
            <span class="material-symbols-rounded toast-icon">${iconName}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => { if (container.contains(toast)) container.removeChild(toast); }, 300);
        }, 3000);
    }

    // ── Confirm Modal ────────────────────────────────────────────────────────

    let _confirmCallback = null;

    function openConfirm(message, callback) {
        document.getElementById('confirm-message').textContent = message;
        _confirmCallback = callback;
        document.getElementById('confirm-modal').style.display = 'flex';
    }

    function closeConfirm() {
        document.getElementById('confirm-modal').style.display = 'none';
        _confirmCallback = null;
    }

    document.getElementById('cancel-confirm').addEventListener('click', closeConfirm);
    document.getElementById('ok-confirm').addEventListener('click', () => {
        if (_confirmCallback) _confirmCallback();
        closeConfirm();
    });

    // ── Edit Modal ───────────────────────────────────────────────────────────

    function openEditModal(cat) {
        document.getElementById('edit-original-name').value = cat.name;
        document.getElementById('edit-category-name').value = cat.name;
        document.getElementById('edit-icon-filename').textContent = '';
        document.getElementById('edit-icon-file').value = '';

        const wrap = document.getElementById('edit-current-icon-wrap');
        const nameSpan = document.getElementById('edit-current-icon-name');
        if (cat.icon) {
            wrap.innerHTML = `<img src="${cat.icon}" alt="${cat.name} icon">`;
            nameSpan.textContent = cat.icon.split('/').pop();
        } else {
            wrap.innerHTML = `<div class="no-icon-placeholder"><span class="material-symbols-rounded">hide_image</span></div>`;
            nameSpan.textContent = 'No icon';
        }

        // Disable name field for protected categories
        const nameInput = document.getElementById('edit-category-name');
        nameInput.disabled = cat.name === 'Default';

        document.getElementById('edit-modal').style.display = 'flex';
    }

    function closeEditModal() {
        document.getElementById('edit-modal').style.display = 'none';
    }

    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    // Close on overlay click
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('edit-modal')) closeEditModal();
    });
    document.getElementById('confirm-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('confirm-modal')) closeConfirm();
    });

    // ── File input label updates ─────────────────────────────────────────────

    document.getElementById('add-icon-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        document.getElementById('add-icon-filename').textContent = file ? file.name : '';
    });

    document.getElementById('edit-icon-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        document.getElementById('edit-icon-filename').textContent = file ? file.name : '';
    });

    // Drag-over styling for dropzones
    document.querySelectorAll('.icon-dropzone').forEach(zone => {
        zone.addEventListener('dragover', () => zone.classList.add('drag-over'));
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', () => zone.classList.remove('drag-over'));
    });

    // ── API helpers ──────────────────────────────────────────────────────────

    async function uploadIcon(categoryName, file) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API}/${encodeURIComponent(categoryName)}/icon`, {
            method: 'POST',
            body: fd,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Icon upload failed');
        }
        return (await res.json()).icon;
    }

    // ── Render ───────────────────────────────────────────────────────────────

    function renderGrid(categories) {
        const grid = document.getElementById('category-grid');
        const badge = document.getElementById('cat-count-badge');
        badge.textContent = categories.length;

        if (categories.length === 0) {
            grid.innerHTML = `
                <div class="cm-empty">
                    <span class="material-symbols-rounded">category</span>
                    No categories yet. Add one above.
                </div>`;
            return;
        }

        grid.innerHTML = '';
        categories.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.dataset.name = cat.name;

            const isProtected = cat.name === 'Default';

            const iconHtml = cat.icon
                ? `<img src="${cat.icon}" alt="${cat.name}">`
                : `<span class="material-symbols-rounded no-icon">hide_image</span>`;

            card.innerHTML = `
                ${isProtected ? '<span class="protected-badge">built-in</span>' : ''}
                <div class="cat-icon-wrapper">${iconHtml}</div>
                <div class="cat-name">${cat.name}</div>
                <div class="cat-actions">
                    <button class="btn btn-outline btn-edit" data-name="${cat.name}" title="Edit">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="btn btn-danger btn-delete" data-name="${cat.name}" title="Delete"
                        ${isProtected ? 'disabled' : ''} style="${isProtected ? 'opacity:0.35;cursor:not-allowed' : ''}">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
            `;

            grid.appendChild(card);
        });

        // Wire edit buttons
        grid.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                const cat = categories.find(c => c.name === name);
                if (cat) openEditModal(cat);
            });
        });

        // Wire delete buttons
        grid.querySelectorAll('.btn-delete').forEach(btn => {
            if (btn.disabled) return;
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                openConfirm(`Delete category "${name}"? This cannot be undone.`, async () => {
                    await handleDelete(name);
                });
            });
        });
    }

    // ── Fetch & Render ───────────────────────────────────────────────────────

    async function fetchAndRender() {
        try {
            const res = await fetch(API);
            if (!res.ok) throw new Error('Failed to load categories');
            const cats = await res.json();
            renderGrid(cats);
        } catch (err) {
            console.error(err);
            showToast('Failed to load categories.', 'error');
        }
    }

    // ── Create ───────────────────────────────────────────────────────────────

    document.getElementById('add-category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-category-name').value.trim();
        const fileInput = document.getElementById('add-icon-file');
        if (!name) return;

        try {
            // 1. Create the category
            const res = await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });

            if (res.status === 409) {
                showToast(`Category "${name}" already exists.`, 'error');
                return;
            }
            if (!res.ok) throw new Error('Create failed');

            // 2. Upload icon if provided
            const file = fileInput.files[0];
            if (file) {
                try {
                    await uploadIcon(name, file);
                } catch (uploadErr) {
                    showToast(`Category created but icon upload failed: ${uploadErr.message}`, 'error');
                }
            }

            showToast(`Category "${name}" created!`, 'success');
            e.target.reset();
            document.getElementById('add-icon-filename').textContent = '';
            await fetchAndRender();
        } catch (err) {
            console.error(err);
            showToast('Error creating category.', 'error');
        }
    });

    // ── Update ───────────────────────────────────────────────────────────────

    document.getElementById('edit-category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalName = document.getElementById('edit-original-name').value;
        const newName = document.getElementById('edit-category-name').value.trim();
        const fileInput = document.getElementById('edit-icon-file');
        const file = fileInput.files[0];

        try {
            let iconUrl = undefined;

            // 1. Upload new icon first (old name still valid)
            if (file) {
                try {
                    iconUrl = await uploadIcon(originalName, file);
                } catch (uploadErr) {
                    showToast(`Icon upload failed: ${uploadErr.message}`, 'error');
                    return;
                }
            }

            // 2. PATCH name (and possibly icon URL if we changed it via PATCH)
            const patchBody = {};
            if (newName && newName !== originalName) patchBody.name = newName;
            if (iconUrl !== undefined) patchBody.icon = iconUrl;

            if (Object.keys(patchBody).length > 0) {
                const res = await fetch(`${API}/${encodeURIComponent(originalName)}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchBody),
                });
                if (res.status === 409) {
                    showToast(`Name "${newName}" already exists.`, 'error');
                    return;
                }
                if (res.status === 400) {
                    const err = await res.json().catch(() => ({}));
                    showToast(err.detail || 'Cannot update this category.', 'error');
                    return;
                }
                if (!res.ok) throw new Error('Update failed');
            }

            showToast('Category updated!', 'success');
            closeEditModal();
            await fetchAndRender();
        } catch (err) {
            console.error(err);
            showToast('Error updating category.', 'error');
        }
    });

    // ── Delete ───────────────────────────────────────────────────────────────

    async function handleDelete(name) {
        try {
            const res = await fetch(`${API}/${encodeURIComponent(name)}`, { method: 'DELETE' });
            if (res.status === 400) {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || 'Cannot delete this category.', 'error');
                return;
            }
            if (!res.ok) throw new Error('Delete failed');
            showToast(`Category "${name}" deleted.`, 'success');
            await fetchAndRender();
        } catch (err) {
            console.error(err);
            showToast('Error deleting category.', 'error');
        }
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    fetchAndRender();
});
