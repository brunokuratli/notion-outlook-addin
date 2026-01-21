/* global Office */

// State
let notionToken = null;
let databases = [];
let pages = [];
let currentEmail = null;
let attachments = [];

// DOM Elements
const elements = {};

// Initialize when Office is ready
Office.onReady((info) => {
    if (info.host === Office.HostType.Outlook) {
        initializeApp();
    }
});

function initializeApp() {
    // Cache DOM elements
    elements.setupSection = document.getElementById('setup-section');
    elements.mainSection = document.getElementById('main-section');
    elements.notionToken = document.getElementById('notion-token');
    elements.saveTokenBtn = document.getElementById('save-token-btn');
    elements.emailSubject = document.getElementById('email-subject');
    elements.emailFrom = document.getElementById('email-from');
    elements.emailDate = document.getElementById('email-date');
    elements.databaseSelect = document.getElementById('database-select');
    elements.parentPageSelect = document.getElementById('parent-page-select');
    elements.refreshDbsBtn = document.getElementById('refresh-dbs-btn');
    elements.includeBody = document.getElementById('include-body');
    elements.includeAttachments = document.getElementById('include-attachments');
    elements.includeHtml = document.getElementById('include-html');
    elements.attachmentsSection = document.getElementById('attachments-section');
    elements.attachmentCount = document.getElementById('attachment-count');
    elements.attachmentsList = document.getElementById('attachments-list');
    elements.sendToNotionBtn = document.getElementById('send-to-notion-btn');
    elements.status = document.getElementById('status');
    elements.settingsBtn = document.getElementById('settings-btn');

    // Event Listeners
    elements.saveTokenBtn.addEventListener('click', saveToken);
    elements.refreshDbsBtn.addEventListener('click', loadDatabases);
    elements.sendToNotionBtn.addEventListener('click', sendToNotion);
    elements.settingsBtn.addEventListener('click', showSettings);
    elements.includeAttachments.addEventListener('change', toggleAttachmentsList);

    // Check for saved token
    notionToken = localStorage.getItem('notion_token');

    if (notionToken) {
        showMainSection();
        loadEmailData();
        loadDatabases();
    } else {
        showSetupSection();
    }
}

// Section Management
function showSetupSection() {
    elements.setupSection.classList.remove('hidden');
    elements.mainSection.classList.add('hidden');
}

function showMainSection() {
    elements.setupSection.classList.add('hidden');
    elements.mainSection.classList.remove('hidden');
}

function showSettings() {
    elements.notionToken.value = notionToken || '';
    showSetupSection();
}

// Token Management
async function saveToken() {
    const token = elements.notionToken.value.trim();

    if (!token) {
        showStatus('Bitte gib einen Token ein', 'error');
        return;
    }

    if (!token.startsWith('secret_') && !token.startsWith('ntn_')) {
        showStatus('Ungültiges Token-Format', 'error');
        return;
    }

    // Test the token
    showStatus('Prüfe Token...', 'loading');

    try {
        // Temporarily set the token for testing
        notionToken = token;
        const response = await notionRequest('/users/me');
        if (response.ok) {
            localStorage.setItem('notion_token', token);
            showStatus('Token gespeichert!', 'success');

            setTimeout(() => {
                showMainSection();
                loadEmailData();
                loadDatabases();
            }, 1000);
        } else {
            notionToken = null; // Reset on failure
            showStatus('Ungültiger Token', 'error');
        }
    } catch (error) {
        notionToken = null; // Reset on error
        showStatus('Verbindungsfehler: ' + error.message, 'error');
    }
}

// Notion API Requests - uses Netlify Function as CORS proxy
async function notionRequest(endpoint, method = 'GET', body = null) {
    // Use the Netlify function proxy to avoid CORS issues
    const baseUrl = window.location.origin;
    const proxyUrl = `${baseUrl}/api/notion-proxy?endpoint=${encodeURIComponent(endpoint)}`;

    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(proxyUrl, options);
    const data = await response.json();

    return { ok: response.ok, status: response.status, data };
}

// Load Databases from Notion
async function loadDatabases() {
    showStatus('Lade Datenbanken...', 'loading');

    try {
        const response = await notionRequest('/search', 'POST', {
            filter: { property: 'object', value: 'database' },
            page_size: 100
        });

        if (response.ok) {
            databases = response.data.results;
            updateDatabaseSelect();

            // Also load pages for parent selection
            await loadPages();

            hideStatus();
        } else {
            showStatus('Fehler beim Laden: ' + (response.data.message || 'Unbekannt'), 'error');
        }
    } catch (error) {
        showStatus('Netzwerkfehler: ' + error.message, 'error');
    }
}

async function loadPages() {
    try {
        const response = await notionRequest('/search', 'POST', {
            filter: { property: 'object', value: 'page' },
            page_size: 50
        });

        if (response.ok) {
            pages = response.data.results;
            updateParentPageSelect();
        }
    } catch (error) {
        console.error('Error loading pages:', error);
    }
}

function updateDatabaseSelect() {
    elements.databaseSelect.innerHTML = '<option value="">Datenbank wählen...</option>';

    databases.forEach(db => {
        const title = getDatabaseTitle(db);
        const option = document.createElement('option');
        option.value = db.id;
        option.textContent = title;
        elements.databaseSelect.appendChild(option);
    });
}

function updateParentPageSelect() {
    elements.parentPageSelect.innerHTML = '<option value="">Seite wählen (optional)...</option>';

    pages.forEach(page => {
        const title = getPageTitle(page);
        if (title) {
            const option = document.createElement('option');
            option.value = page.id;
            option.textContent = title;
            elements.parentPageSelect.appendChild(option);
        }
    });
}

function getDatabaseTitle(db) {
    if (db.title && db.title.length > 0) {
        return db.title.map(t => t.plain_text).join('');
    }
    return 'Unbenannte Datenbank';
}

function getPageTitle(page) {
    const props = page.properties;
    for (const key of Object.keys(props)) {
        if (props[key].type === 'title' && props[key].title.length > 0) {
            return props[key].title.map(t => t.plain_text).join('');
        }
    }
    return null;
}

// Load Email Data from Outlook
function loadEmailData() {
    const item = Office.context.mailbox.item;

    if (!item) {
        showStatus('Keine E-Mail ausgewählt', 'error');
        return;
    }

    const emailDate = item.dateTimeCreated ? new Date(item.dateTimeCreated) : null;
    currentEmail = {
        subject: item.subject,
        from: item.from ? item.from.displayName + ' <' + item.from.emailAddress + '>' : 'Unbekannt',
        dateTime: emailDate ? emailDate.toLocaleString('de-DE') : '',
        dateTimeISO: emailDate ? emailDate.toISOString() : null
    };

    elements.emailSubject.textContent = currentEmail.subject || '(Kein Betreff)';
    elements.emailFrom.textContent = 'Von: ' + currentEmail.from;
    elements.emailDate.textContent = currentEmail.dateTime;

    // Load email body
    item.body.getAsync(Office.CoercionType.Text, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
            currentEmail.bodyText = result.value;
        }
    });

    item.body.getAsync(Office.CoercionType.Html, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
            currentEmail.bodyHtml = result.value;
        }
    });

    // Load attachments
    loadAttachments(item);
}

function loadAttachments(item) {
    attachments = [];

    if (item.attachments && item.attachments.length > 0) {
        elements.attachmentsSection.classList.remove('hidden');
        elements.attachmentCount.textContent = item.attachments.length;
        elements.attachmentsList.innerHTML = '';

        item.attachments.forEach((att, index) => {
            attachments.push({
                id: att.id,
                name: att.name,
                size: att.size,
                contentType: att.contentType,
                isInline: att.isInline
            });

            const li = document.createElement('li');
            li.innerHTML = `
                <input type="checkbox" id="att-${index}" checked>
                <span class="attachment-name">${escapeHtml(att.name)}</span>
                <span class="attachment-size">${formatFileSize(att.size)}</span>
            `;
            elements.attachmentsList.appendChild(li);
        });
    } else {
        elements.attachmentsSection.classList.add('hidden');
    }
}

function toggleAttachmentsList() {
    const show = elements.includeAttachments.checked && attachments.length > 0;
    if (show) {
        elements.attachmentsSection.classList.remove('hidden');
    } else {
        elements.attachmentsSection.classList.add('hidden');
    }
}

// Send to Notion
async function sendToNotion() {
    const databaseId = elements.databaseSelect.value;
    const parentPageId = elements.parentPageSelect.value;

    if (!databaseId && !parentPageId) {
        showStatus('Bitte wähle eine Datenbank oder Elternseite', 'error');
        return;
    }

    showStatus('Sende zu Notion...', 'loading');
    elements.sendToNotionBtn.disabled = true;

    try {
        let pageContent = buildPageContent();
        let result;

        if (databaseId) {
            // Create page in database
            result = await createDatabasePage(databaseId, pageContent);
        } else {
            // Create page under parent page
            result = await createChildPage(parentPageId, pageContent);
        }

        if (result.ok) {
            // Handle attachments if selected
            if (elements.includeAttachments.checked && attachments.length > 0) {
                await uploadAttachments(result.data.id);
            }

            showStatus('Erfolgreich zu Notion gesendet!', 'success');

            // Open in Notion (optional)
            if (result.data.url) {
                setTimeout(() => {
                    if (confirm('In Notion öffnen?')) {
                        window.open(result.data.url, '_blank');
                    }
                }, 1500);
            }
        } else {
            showStatus('Fehler: ' + (result.data.message || 'Unbekannt'), 'error');
        }
    } catch (error) {
        showStatus('Fehler: ' + error.message, 'error');
    } finally {
        elements.sendToNotionBtn.disabled = false;
    }
}

function buildPageContent() {
    const includeBody = elements.includeBody.checked;
    const useHtml = elements.includeHtml.checked;

    let children = [];

    // Add email metadata as callout
    children.push({
        object: 'block',
        type: 'callout',
        callout: {
            icon: { type: 'emoji', emoji: '📧' },
            rich_text: [{
                type: 'text',
                text: { content: `Von: ${currentEmail.from}\nDatum: ${currentEmail.dateTime}` }
            }]
        }
    });

    children.push({
        object: 'block',
        type: 'divider',
        divider: {}
    });

    // Add body content
    if (includeBody && currentEmail.bodyText) {
        const bodyText = currentEmail.bodyText.trim();

        // Split into chunks of max 2000 characters (Notion limit)
        const chunks = splitTextIntoChunks(bodyText, 2000);

        chunks.forEach(chunk => {
            children.push({
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{
                        type: 'text',
                        text: { content: chunk }
                    }]
                }
            });
        });
    }

    return children;
}

async function createDatabasePage(databaseId, children) {
    // First, get database schema to find properties
    const dbResponse = await notionRequest(`/databases/${databaseId}`);

    if (!dbResponse.ok) {
        return dbResponse;
    }

    const dbProperties = dbResponse.data.properties;
    let titleProperty = 'Name'; // Default

    // Find the title property and other properties
    const availableProps = {};
    for (const [key, value] of Object.entries(dbProperties)) {
        if (value.type === 'title') {
            titleProperty = key;
        }
        availableProps[key.toLowerCase()] = { name: key, type: value.type };
    }

    // Build properties object
    const pageProperties = {
        [titleProperty]: {
            title: [{
                text: { content: currentEmail.subject || '(Kein Betreff)' }
            }]
        }
    };

    // Add From property if available
    if (availableProps['from']) {
        pageProperties[availableProps['from'].name] = {
            rich_text: [{
                text: { content: currentEmail.from || '' }
            }]
        };
    }

    // Add Date property if available
    if (availableProps['date'] && currentEmail.dateTimeISO) {
        pageProperties[availableProps['date'].name] = {
            date: {
                start: currentEmail.dateTimeISO
            }
        };
    }

    // Add Status property if available (set to "Neu")
    if (availableProps['status'] && availableProps['status'].type === 'select') {
        pageProperties[availableProps['status'].name] = {
            select: { name: 'Neu' }
        };
    }

    // Add Has Attachments property if available
    if (availableProps['has attachments'] && availableProps['has attachments'].type === 'checkbox') {
        pageProperties[availableProps['has attachments'].name] = {
            checkbox: attachments.length > 0
        };
    }

    const pageData = {
        parent: { database_id: databaseId },
        properties: pageProperties,
        children: children
    };

    return await notionRequest('/pages', 'POST', pageData);
}

async function createChildPage(parentPageId, children) {
    const pageData = {
        parent: { page_id: parentPageId },
        properties: {
            title: {
                title: [{
                    text: { content: currentEmail.subject || '(Kein Betreff)' }
                }]
            }
        },
        children: children
    };

    return await notionRequest('/pages', 'POST', pageData);
}

async function uploadAttachments(pageId) {
    const item = Office.context.mailbox.item;

    const selectedAttachments = [];
    attachments.forEach((att, index) => {
        const checkbox = document.getElementById(`att-${index}`);
        if (checkbox && checkbox.checked) {
            selectedAttachments.push(att);
        }
    });

    if (selectedAttachments.length === 0) return;

    // Add a section for attachments
    await notionRequest(`/blocks/${pageId}/children`, 'PATCH', {
        children: [{
            object: 'block',
            type: 'heading_2',
            heading_2: {
                rich_text: [{ type: 'text', text: { content: 'Anhänge' } }]
            }
        }]
    });

    // Get attachment content and upload directly to Notion
    for (const att of selectedAttachments) {
        try {
            showStatus(`Lade ${att.name} hoch...`, 'loading');
            const content = await getAttachmentContent(item, att.id);

            // Upload file directly to Notion via our proxy
            const uploadResult = await uploadFileToNotion(att.name, content, att.contentType, pageId);

            if (uploadResult.success && uploadResult.file_id) {
                // Check if it's an image
                const isImage = att.contentType && att.contentType.startsWith('image/');

                if (isImage) {
                    // Add as image block with Notion file reference
                    await notionRequest(`/blocks/${pageId}/children`, 'PATCH', {
                        children: [{
                            object: 'block',
                            type: 'image',
                            image: {
                                type: 'file',
                                file: {
                                    file_id: uploadResult.file_id
                                }
                            }
                        }]
                    });
                } else {
                    // Add as file block with Notion file reference
                    await notionRequest(`/blocks/${pageId}/children`, 'PATCH', {
                        children: [{
                            object: 'block',
                            type: 'file',
                            file: {
                                type: 'file',
                                file: {
                                    file_id: uploadResult.file_id
                                },
                                name: att.name
                            }
                        }]
                    });
                }

                // Add file info as caption
                await notionRequest(`/blocks/${pageId}/children`, 'PATCH', {
                    children: [{
                        object: 'block',
                        type: 'callout',
                        callout: {
                            icon: { type: 'emoji', emoji: '📎' },
                            rich_text: [{
                                type: 'text',
                                text: {
                                    content: `${att.name} (${formatFileSize(att.size)})`
                                }
                            }]
                        }
                    }]
                });

                // If it's a text-based file, also include content inline
                if (isTextFile(att.contentType)) {
                    try {
                        const textContent = atob(content);
                        const chunks = splitTextIntoChunks(textContent, 2000);

                        for (const chunk of chunks) {
                            await notionRequest(`/blocks/${pageId}/children`, 'PATCH', {
                                children: [{
                                    object: 'block',
                                    type: 'code',
                                    code: {
                                        language: getCodeLanguage(att.name),
                                        rich_text: [{ type: 'text', text: { content: chunk } }]
                                    }
                                }]
                            });
                        }
                    } catch (e) {
                        console.error('Error decoding text content:', e);
                    }
                }
            } else {
                // Fallback: show file info if upload failed
                const errorMsg = uploadResult.details?.message || uploadResult.error || 'Unbekannter Fehler';
                await notionRequest(`/blocks/${pageId}/children`, 'PATCH', {
                    children: [{
                        object: 'block',
                        type: 'callout',
                        callout: {
                            icon: { type: 'emoji', emoji: '⚠️' },
                            rich_text: [{
                                type: 'text',
                                text: {
                                    content: `${att.name} (${formatFileSize(att.size)}) - Upload fehlgeschlagen: ${errorMsg}`
                                }
                            }]
                        }
                    }]
                });
            }
        } catch (error) {
            console.error('Error processing attachment:', att.name, error);
            // Add error note to Notion
            await notionRequest(`/blocks/${pageId}/children`, 'PATCH', {
                children: [{
                    object: 'block',
                    type: 'callout',
                    callout: {
                        icon: { type: 'emoji', emoji: '❌' },
                        rich_text: [{
                            type: 'text',
                            text: {
                                content: `Fehler bei ${att.name}: ${error.message}`
                            }
                        }]
                    }
                }]
            });
        }
    }
}

async function uploadFileToNotion(filename, base64Content, contentType, pageId) {
    const baseUrl = window.location.origin;
    const uploadUrl = `${baseUrl}/api/notion-file-upload`;

    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${notionToken}`,
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
                filename: filename,
                content: base64Content,
                contentType: contentType,
                pageId: pageId
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
    }
}

function getAttachmentContent(item, attachmentId) {
    return new Promise((resolve, reject) => {
        item.getAttachmentContentAsync(attachmentId, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve(result.value.content);
            } else {
                reject(new Error(result.error.message));
            }
        });
    });
}

// Utility Functions
function showStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = `status ${type}`;
    elements.status.classList.remove('hidden');
}

function hideStatus() {
    elements.status.classList.add('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function splitTextIntoChunks(text, maxLength) {
    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }

        // Find a good break point
        let breakPoint = remaining.lastIndexOf('\n', maxLength);
        if (breakPoint === -1 || breakPoint < maxLength / 2) {
            breakPoint = remaining.lastIndexOf(' ', maxLength);
        }
        if (breakPoint === -1 || breakPoint < maxLength / 2) {
            breakPoint = maxLength;
        }

        chunks.push(remaining.substring(0, breakPoint));
        remaining = remaining.substring(breakPoint).trim();
    }

    return chunks;
}

function isTextFile(contentType) {
    return contentType && (
        contentType.startsWith('text/') ||
        contentType.includes('json') ||
        contentType.includes('xml') ||
        contentType.includes('javascript')
    );
}

function getCodeLanguage(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const langMap = {
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'json': 'json',
        'xml': 'xml',
        'html': 'html',
        'css': 'css',
        'md': 'markdown',
        'txt': 'plain text'
    };
    return langMap[ext] || 'plain text';
}
