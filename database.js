// --- DATABASE MODE MODULE ---

const DBMode = {
    activeDB: null, // Holds the name of the current database file

    /**
     * Handles a command string entered while in DB mode.
     * @param {string} commandString The full command string from the input.
     * @returns {object} An object indicating the result of the command, used by script.js to manage state.
     */
    handleCommand: async function(commandString) {
        const printOutput = window.printOutput;
        const trimmedCommand = commandString.trim();
        
        // Handle multi-word and special syntax commands first
        const jsonReadMatch = trimmedCommand.match(/^json\s*<-\s*read\s*<-\s*(.*)$/i);
        if (jsonReadMatch) {
            const tableName = jsonReadMatch[1];
            const currentPrompt = this.activeDB ? `$db>${this.activeDB}>` : '$db>';
            printOutput(`${currentPrompt} ${commandString}`, 'command');
            if (!this.activeDB) { printOutput("No active database. Use 'start <- <filename.sqlite>' to begin.", "error"); return { status: 'continue' }; }
            if (!tableName) { printOutput("Usage: json <- read <- <table_name>", "error"); return { status: 'continue' }; }
            await this.executeDbSession('sql-execute', this.activeDB, `SELECT * FROM ${tableName};`, false);
            return { status: 'continue' };
        }

        const dropViewMatch = trimmedCommand.match(/^drop\s+view\s*<-\s*(.*)$/i);
        if (dropViewMatch) {
            const viewName = dropViewMatch[1];
            const currentPrompt = this.activeDB ? `$db>${this.activeDB}>` : '$db>';
            printOutput(`${currentPrompt} ${commandString}`, 'command');
            if (!this.activeDB) { printOutput("No active database. Use 'start <- <filename.sqlite>' to begin.", "error"); return { status: 'continue' }; }
            if (!viewName) { printOutput("Usage: drop view <- <view_name>", "error"); return { status: 'continue' }; }
            if (confirm(`ARE YOU SURE you want to permanently delete the view '${viewName}'?\nThis action cannot be undone.`)) {
                await this.executeDbSession('sql-execute', this.activeDB, `DROP VIEW ${viewName};`);
            } else {
                printOutput("Delete operation cancelled by user.");
            }
            return { status: 'continue' };
        }
        
        const backupMatch = trimmedCommand.match(/^backup\s*<-\s*([\w\.\-]+)\s*->\s*([\w\.\-]+)$/i);
        if (backupMatch) {
             const [_, sourceDb, destDb] = backupMatch;
             printOutput(`$db> ${commandString}`, 'command');
             await this.executeBackupDbCommand(sourceDb, destDb);
             return { status: 'continue' };
        }

        const lowerTrimmedCommand = trimmedCommand.toLowerCase();
        if (lowerTrimmedCommand === 'list db' || lowerTrimmedCommand === 'list tbl' || lowerTrimmedCommand === 'list view' || lowerTrimmedCommand === 'list views' || lowerTrimmedCommand === 'upload sql') {
            const currentPrompt = this.activeDB ? `$db>${this.activeDB}>` : '$db>';
            printOutput(`${currentPrompt} ${lowerTrimmedCommand}`, 'command');
            if (lowerTrimmedCommand === 'list db') await this.executeListDbCommand();
            if (lowerTrimmedCommand === 'list tbl') await this.executeListTblCommand();
            if (lowerTrimmedCommand === 'list view' || lowerTrimmedCommand === 'list views') await this.executeListViewsCommand();
            if (lowerTrimmedCommand === 'upload sql') await this.executeUploadSqlCommand();
            return { status: 'continue' };
        }
        
        const commandMatch = commandString.trim().match(/^(\w+)\s*(?:<-\s*(.*))?$/is);
        if (!commandMatch) {
            printOutput("Invalid DB command syntax.", "error");
            return { status: 'continue' };
        }

        const [_, command, params] = commandMatch;
        const lowerCmd = command.toLowerCase();
        const currentPrompt = this.activeDB ? `$db>${this.activeDB}>` : '$db>';
        printOutput(`${currentPrompt} ${commandString}`, 'command');

        if (['delete', 'del', 'drop'].includes(lowerCmd)) {
            if (!params) { printOutput(`Usage: ${lowerCmd} <- <table_name> OR ${lowerCmd} <- <database.sqlite>`, "error"); return { status: 'continue' }; }
            if (params.endsWith('.sqlite')) {
                await this.executeDeleteDbCommand(params);
            } else {
                if (!this.activeDB) { printOutput("No active database. Use 'start' to begin.", "error"); return { status: 'continue' }; }
                if (confirm(`ARE YOU SURE you want to permanently delete the table '${params}'?\nThis action cannot be undone.`)) {
                    await this.executeDbSession('sql-execute', this.activeDB, `DROP TABLE ${params};`);
                } else {
                    printOutput("Delete operation cancelled by user.");
                }
            }
            return { status: 'continue' };
        }

        if (lowerCmd === 'exit' || lowerCmd === 'close') {
            this.activeDB = null;
            return { status: 'exit' }; 
        }

        if (lowerCmd === 'quit') {
            if (!this.activeDB) { printOutput("No active database session to quit.", "error"); return { status: 'continue' }; }
            const oldDbName = this.activeDB;
            this.activeDB = null;
            printOutput(`Session with '${oldDbName}' closed.`);
            return { status: 'promptChange', newPrompt: '$db>' };
        }

        if (lowerCmd === 'start') {
            if (!params) { printOutput("Usage: start <- <filename.sqlite>", "error"); return { status: 'continue' }; }
            if (!params.endsWith('.sqlite')) { printOutput("Error: Database filename must end with .sqlite", "error"); return { status: 'continue' }; }
            const success = await this.executeDbSession('start', params, null);
            if (success) { this.activeDB = params; return { status: 'promptChange', newPrompt: `$db>${this.activeDB}>` }; }
            return { status: 'continue' };
        }

        if (lowerCmd === 'read') {
            if (!this.activeDB) { printOutput("No active database. Use 'start' to begin.", "error"); return { status: 'continue' }; }
            if (!params) { printOutput("Usage: read <- <table_or_view_name>", "error"); return { status: 'continue' }; }
            await this.executeDbSession('sql-execute', this.activeDB, `SELECT * FROM ${params};`);
            return { status: 'continue' };
        }

        if (['q', 'qry', 'query'].includes(lowerCmd)) {
            if (!this.activeDB) { printOutput("No active database. Use 'start' to begin.", "error"); return { status: 'continue' }; }
            if (!params) { printOutput(`Usage: ${lowerCmd} <- "<SQL query>"`, "error"); return { status: 'continue' }; }
            await this.executeDbSession('sql-execute', this.activeDB, params);
            return { status: 'continue' };
        }
        
        printOutput(`Invalid DB command '${lowerCmd}'. Use 'q', 'start', 'quit', 'list db', etc.`, "error");
        return { status: 'continue' };
    },
    
    executeBackupDbCommand: async function(sourceDb, destDb) {
        const printOutput = window.printOutput;
        printOutput(`Backing up '${sourceDb}' to '${destDb}'...`);
        try {
            const response = await fetch('database_api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: 'backup-db', source_db: sourceDb, dest_db: destDb }) });
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Backup failed.'}`, 'error'); } 
            else { printOutput(result.data); }
        } catch (err) {
            printOutput("Client-side error while backing up database.", "error");
            console.error("Backup DB error:", err);
        }
    },

    executeDeleteDbCommand: async function(dbName) {
        const printOutput = window.printOutput;
        if (!confirm(`ARE YOU SURE you want to permanently delete the database '${dbName}'?\nThis action cannot be undone.`)) {
            printOutput("Delete operation cancelled by user.");
            return;
        }
        printOutput(`Attempting to delete '${dbName}'...`);
        try {
            const response = await fetch('database_api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: 'delete-db', database: dbName }) });
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Failed to delete database.'}`, 'error'); } 
            else {
                printOutput(result.data);
                if (this.activeDB === dbName) {
                    this.activeDB = null;
                    document.dispatchEvent(new CustomEvent('promptchange', { detail: { newPrompt: '$db>' } }));
                }
            }
        } catch (err) {
            printOutput("Client-side error while deleting database.", "error");
            console.error("Delete DB error:", err);
        }
    },

    executeListDbCommand: async function() {
        const printOutput = window.printOutput;
        const formatAndPrintData = window.formatAndPrintData;
        try {
            const response = await fetch('database_api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: 'list-db' }) });
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Failed to list databases.'}`, 'error'); } 
            else { formatAndPrintData(result.data); }
        } catch (err) {
            printOutput("Client-side error while listing databases.", "error");
            console.error("List DB error:", err);
        }
    },
    
    executeListTblCommand: async function() {
        const printOutput = window.printOutput;
        const formatAndPrintData = window.formatAndPrintData;
        if (!this.activeDB) { printOutput("No active database. Use 'start' to begin.", "error"); return; }
        try {
            const response = await fetch('database_api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: 'list-tbl', database: this.activeDB }) });
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Failed to list tables.'}`, 'error'); } 
            else {
                if (result.data.length === 0) { printOutput(`No tables found in '${this.activeDB}'.`); } 
                else { formatAndPrintData(result.data); }
            }
        } catch (err) {
            printOutput("Client-side error while listing tables.", "error");
            console.error("List Tbl error:", err);
        }
    },

    executeListViewsCommand: async function() {
        const printOutput = window.printOutput;
        const formatAndPrintData = window.formatAndPrintData;
        if (!this.activeDB) { printOutput("No active database. Use 'start' to begin.", "error"); return; }
        try {
            const response = await fetch('database_api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: 'list-views', database: this.activeDB }) });
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Failed to list views.'}`, 'error'); } 
            else {
                if (result.data.length === 0) { printOutput(`No views found in '${this.activeDB}'.`); } 
                else { formatAndPrintData(result.data); }
            }
        } catch (err) {
            printOutput("Client-side error while listing views.", "error");
            console.error("List Views error:", err);
        }
    },

    executeUploadSqlCommand: async function() {
        const printOutput = window.printOutput;
        if (!this.activeDB) { printOutput("No active database. Use 'start' to select a database first.", "error"); return; }
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.sql';
        fileInput.onchange = e => {
            const file = e.target.files[0];
            if (!file) { printOutput("File selection cancelled.", "error"); return; }
            printOutput(`Uploading and executing ${file.name}...`);
            const barId = 'progress-bar-' + Date.now();
            const progressHtml = `<div class="progress-container"><div id="${barId}" class="progress-bar">0%</div></div>`;
            printOutput(progressHtml, '', true);
            const progressBar = document.getElementById(barId);
            const formData = new FormData();
            formData.append('command', 'upload-sql');
            formData.append('database', this.activeDB);
            formData.append('sqlFile', file);
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'database_api.php', true);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    progressBar.style.width = percentComplete + '%';
                    progressBar.textContent = percentComplete + '%';
                }
            };
            xhr.onload = () => {
                progressBar.textContent = 'Upload Complete. Executing...';
                let result;
                try { result = JSON.parse(xhr.responseText); } catch (parseError) {
                    printOutput(`Error: Failed to parse server response.`, 'error');
                    progressBar.style.backgroundColor = '#ff4136';
                    progressBar.textContent = 'Error';
                    return;
                }
                if (xhr.status === 200 && result.data) {
                    printOutput("\n--- Execution Log ---");
                    let finalStatus = 'OK';
                    result.data.forEach(logEntry => {
                        const shortSql = logEntry.sql.length > 60 ? logEntry.sql.substring(0, 57) + '...' : logEntry.sql;
                        if (logEntry.status === 'success') { printOutput(`[OK] ${logEntry.message} :: ${shortSql}`); } 
                        else { printOutput(`[FAIL] ${logEntry.message} :: ${shortSql}`, 'error'); finalStatus = 'FAIL'; }
                    });
                    printOutput("--- End of Log ---");
                    if(finalStatus === 'FAIL') { printOutput("Script failed and was rolled back.", "error"); } 
                    else { printOutput("Script executed successfully."); }
                } else {
                    printOutput(`Error: ${result.error || 'Execution failed.'}`, 'error');
                }
                progressBar.parentElement.remove();
            };
            xhr.onerror = () => {
                printOutput("A network error occurred during the upload.", "error");
                progressBar.style.backgroundColor = '#ff4136';
                progressBar.textContent = 'Network Error';
            };
            xhr.send(formData);
        };
        fileInput.click();
    },

    executeDbSession: async function(command, dbName, query, formatOutput = true) {
        const printOutput = window.printOutput;
        const formatAndPrintData = window.formatAndPrintData;
        const payload = { command: command, database: dbName, query: query };
        try {
            const response = await fetch('database_api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (!response.ok) {
                printOutput(`SQL Error: ${result.error || 'Query failed.'}`, 'error');
                return false;
            } else {
                if (formatOutput) { formatAndPrintData(result.data); } 
                else { printOutput(JSON.stringify(result.data, null, 2)); }
                return true;
            }
        } catch (err) {
            printOutput("Client-side error during DB operation.", "error");
            console.error("DB error:", err);
            return false;
        }
    }
};