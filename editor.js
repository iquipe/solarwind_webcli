window.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT REFERENCES ---
    const editingFilenameSpan = document.getElementById('editing-filename');
    const editorTextarea = document.getElementById('editor-textarea');
    const editorSaveBtn = document.getElementById('editor-save-btn');
    const editorCancelBtn = document.getElementById('editor-cancel-btn');

    let currentFile = null;

    /**
     * This function is called by the main terminal window (`script.js`)
     * to populate the editor with the file's name and content.
     * @param {string} filename The name of the file being edited.
     * @param {string} content The current content of the file.
     */
    window.initializeEditor = (filename, content) => {
        currentFile = filename;
        editingFilenameSpan.textContent = filename;
        document.title = `Editing - ${filename}`; // Update the window title
        editorTextarea.value = content;
        editorTextarea.focus();
    };

    /**
     * Event listener for the "Save & Close" button.
     */
    editorSaveBtn.addEventListener('click', () => {
        // Check if the opener window still exists
        if (window.opener && !window.opener.closed) {
            const newContent = editorTextarea.value;
            // Call the globally defined function on the main window to pass the data back
            window.opener.handleEditorSave(currentFile, newContent);
        }
        window.close();
    });

    /**
     * Event listener for the "Cancel" button.
     */
    editorCancelBtn.addEventListener('click', () => {
        window.close();
    });

    /**
     * Add keyboard shortcuts (Ctrl+S for Save, Escape for Cancel).
     */
    window.addEventListener('keydown', (e) => {
        // Ctrl+S or Cmd+S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            editorSaveBtn.click();
        }
        // Escape key to cancel
        if (e.key === 'Escape') {
            e.preventDefault();
            editorCancelBtn.click();
        }
    });
});