document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT REFERENCES & STATE ---
    const loginScreen = document.getElementById('login-screen');
    const loginOutput = document.getElementById('login-output');
    const loginInput = document.getElementById('login-input');
    
    const terminal = document.getElementById('terminal');
    const output = document.getElementById('output');
    const input = document.getElementById('input');
    const promptElement = document.querySelector('#terminal .prompt');

    let isAuthenticated = false;
    let savedSingleFiles = [];
    let savedArchives = {};
    let editorPopup = null;
    let terminalMode = 'normal';

    // --- GLOBALLY ACCESSIBLE HELPER FUNCTIONS (for extensions) ---

    /**
     * Prints a line of text to the terminal.
     * Attached to `window` so other scripts can use it.
     */
    window.printOutput = (message, className = '') => {
        const line = document.createElement('div');
        line.className = `output-line ${className}`;
        line.textContent = message;
        output.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
    };

    /**
     * Formats any JSON object or array into a text-based table.
     * Attached to `window` so other scripts can use it.
     */
    window.formatAndPrintData = (data) => {
        let table = '';
        if (Array.isArray(data)) {
            if (data.length === 0) { printOutput("[]"); return; }
            if (typeof data[0] === 'object' && data[0] !== null) { // Array of Objects
                const headers = Object.keys(data[0]);
                const widths = {};
                headers.forEach(h => widths[h] = h.length);
                data.forEach(row => { headers.forEach(h => { const len = String(row[h]).length; if (len > widths[h]) widths[h] = len; }); });
                table += headers.map(h => h.padEnd(widths[h])).join(' | ') + '\n';
                table += headers.map(h => '-'.repeat(widths[h])).join(' | ') + '\n';
                data.forEach(row => { table += headers.map(h => String(row[h]).padEnd(widths[h])).join(' | ') + '\n'; });
            } else { // Simple Array
                const headers = { index: 'Index', value: 'Value' };
                const widths = { index: headers.index.length, value: headers.value.length };
                data.forEach((item, index) => { if (String(index).length > widths.index) widths.index = String(index).length; if (String(item).length > widths.value) widths.value = String(item).length; });
                table += `${headers.index.padEnd(widths.index)} | ${headers.value.padEnd(widths.value)}\n`;
                table += `${'-'.repeat(widths.index)} | ${'-'.repeat(widths.value)}\n`;
                data.forEach((item, index) => { table += `${String(index).padEnd(widths.index)} | ${String(item).padEnd(widths.value)}\n`; });
            }
            printOutput(table);
        } else if (typeof data === 'object' && data !== null) { // Plain Object
            const headers = { key: 'Field', value: 'Value' };
            const dataRows = Object.entries(data);
            if (dataRows.length === 0) { printOutput("{}"); return; }
            const widths = { key: headers.key.length, value: headers.value.length };
            for (const [key, value] of dataRows) { if (String(key).length > widths.key) widths.key = String(key).length; const valueStr = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : String(value); if (valueStr.length > widths.value) widths.value = valueStr.length; }
            table += `${headers.key.padEnd(widths.key)} | ${headers.value.padEnd(widths.value)}\n`;
            table += `${'-'.repeat(widths.key)} | ${'-'.repeat(widths.value)}\n`;
            for (const [key, value] of dataRows) { const valueStr = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : String(value); table += `${String(key).padEnd(widths.key)} | ${valueStr.padEnd(widths.value)}\n`; }
            printOutput(table);
        } else { // Primitive
            printOutput(String(data));
        }
    };

    // --- EDITOR LOGIC ---

    window.handleEditorSave = async (filename, content) => {
        if (filename === 'config/config.php') {
            await executeUpdateConfig(content);
        } else {
            await executeUpdate(filename, content);
        }
    };

    const openEditorPopup = async (filename) => {
        if (editorPopup && !editorPopup.closed) {
            editorPopup.focus();
            printOutput("Editor is already open.", "error");
            return;
        }
        printOutput(`Opening ${filename} in editor...`);
        try {
            const response = await fetch(`api.php/read?p0=${filename}`);
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Cannot read file.'}`, 'error'); return; }
            editorPopup = window.open('editor.html', 'editorWindow', 'width=800,height=600,resizable=yes,scrollbars=no');
            editorPopup.onload = () => editorPopup.initializeEditor(filename, result.data);
        } catch (err) {
            printOutput("Client-side error: Could not fetch file for editing.", "error");
        }
    };
    
    const openConfigEditor = async () => {
        const filename = 'config/config.php';
        if (editorPopup && !editorPopup.closed) {
            editorPopup.focus();
            printOutput("Editor is already open.", "error");
            return;
        }
        printOutput(`Opening ${filename} in editor...`);
        try {
            const response = await fetch('api.php/read-config');
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Cannot read config file.'}`, 'error'); return; }
            editorPopup = window.open('editor.html', 'editorWindow', 'width=800,height=600,resizable=yes,scrollbars=no');
            editorPopup.onload = () => editorPopup.initializeEditor(filename, result.data);
        } catch (err) {
            printOutput("Client-side error: Could not fetch config for editing.", "error");
        }
    };

    // --- CORE HELPER FUNCTIONS ---

    const printWelcomeMessage = () => {
        const asciiArt = `
    __        __   _      ____ _ ___ _
    \\ \\      / /__| |__  / ___| | |_| |
     \\ \\ /\\ / / _ \\ '_ \\| |   | | | | |
      \\ V  V /  __/ |_) | |___| | | | |
       \\_/\\_/ \\___|_.__/ \\____|_|_| |_|
        `;
        const now = new Date();
        const dateTimeString = now.toLocaleString('en-GB', { timeZone: 'GMT' });
        printOutput(asciiArt);
        printOutput("Welcome to the Web Command-Line Interface!");
        printOutput("Developed by: iQuipe Digital (iqcloud@iquipedigital.com)");
        printOutput("License: GPL 3 License");
        printOutput("");
        printOutput(`Session started: ${dateTimeString} (GMT)`);
        printOutput(`Server Host: ${window.location.hostname}`);
        printOutput("-----------------------------------------------------------------");
        printOutput("Type 'help' to see a list of available commands.");
        printOutput("");
    };

    // --- COMMAND-SPECIFIC HELPER FUNCTIONS ---
    
    const executeCommand = async (command, args) => {
        let url = `api.php/${command}`;
        if (args.length > 0) { url += `?${new URLSearchParams(args.map((arg, i) => [`p${i}`, arg]))}`; }
        try {
            const response = await fetch(url);
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Unknown API Error'}`, 'error'); } 
            else { formatAndPrintData(result.data); }
        } catch (error) {
            printOutput(`Client-side error: Could not connect to API.`, 'error');
            console.error("Fetch Error:", error);
        }
    };

    const executeListDirCommand = async () => {
        try {
            const response = await fetch('api.php/listdir');
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Failed to list directory.'}`, 'error'); return; }
            const files = result.data;
            if (files.length === 0) { printOutput("The 'functions' directory is empty."); return; }
            const headers = { filename: 'Filename', size: 'Size (Bytes)', created: 'Created', modified: 'Modified' };
            const widths = { filename: 0, size: 0, created: 0, modified: 0 };
            for (const key of Object.keys(headers)) {
                widths[key] = headers[key].length;
                for (const file of files) {
                    const cellLength = String(file[key]).length;
                    if (cellLength > widths[key]) widths[key] = cellLength;
                }
            }
            let table = `${headers.filename.padEnd(widths.filename)} | ${headers.size.padEnd(widths.size)} | ${headers.created.padEnd(widths.created)} | ${headers.modified.padEnd(widths.modified)}\n`;
            table += `${'-'.repeat(widths.filename)} | ${'-'.repeat(widths.size)} | ${'-'.repeat(widths.created)} | ${'-'.repeat(widths.modified)}\n`;
            for (const file of files) {
                table += `${file.filename.padEnd(widths.filename)} | ${String(file.size).padEnd(widths.size)} | ${file.created.padEnd(widths.created)} | ${file.modified.padEnd(widths.modified)}\n`;
            }
            printOutput(table);
        } catch (error) {
            printOutput(`Client-side error: Could not connect to the API.`, 'error');
            console.error("Listdir Fetch Error:", error);
        }
    };
    
    const executeListCommand = async () => {
        try {
            const response = await fetch('api.php/list');
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Failed to list functions.'}`, 'error'); return; }
            const funcs = result.data;
            if (funcs.length === 0) { printOutput("No user-defined functions found."); return; }
            const headers = { function: 'Function', filename: 'Filename' };
            const widths = { function: headers.function.length, filename: headers.filename.length };
            for (const func of funcs) {
                if (func.function.length > widths.function) widths.function = func.function.length;
                if (func.filename.length > widths.filename) widths.filename = func.filename.length;
            }
            let table = `${headers.function.padEnd(widths.function)} | ${headers.filename.padEnd(widths.filename)}\n`;
            table += `${'-'.repeat(widths.function)} | ${'-'.repeat(widths.filename)}\n`;
            for (const func of funcs) {
                table += `${func.function.padEnd(widths.function)} | ${func.filename.padEnd(widths.filename)}\n`;
            }
            printOutput(table);
        } catch (error) {
            printOutput(`Client-side error: Could not connect to the API.`, 'error');
            console.error("List Fetch Error:", error);
        }
    };

    const executeWriteCommand = async (filename, content) => {
        printOutput(`Writing to ${filename}...`);
        try {
            const response = await fetch('api.php/write', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: filename, content: content }) });
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Write failed.'}`, 'error'); } 
            else { printOutput(result.data); printOutput("Reload the page to use the new function."); }
        } catch (err) { printOutput("Client-side error during write operation.", "error"); console.error("Write error:", err); }
    };

    const executeAppendCommand = async (filename, content) => {
        printOutput(`Appending to ${filename}...`);
        try {
            const response = await fetch('api.php/append', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: filename, content: content }) });
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Append failed.'}`, 'error'); } 
            else { printOutput(result.data); }
        } catch (err) { printOutput("A client-side error occurred during append operation.", "error"); console.error("Append error:", err); }
    };

    const executeDeleteCommand = async (filename) => {
        printOutput(`Deleting ${filename}...`);
        try {
            const response = await fetch('api.php/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: filename }) });
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Delete failed.'}`, 'error'); } 
            else { printOutput(result.data); printOutput("Reload the page to update the function list."); }
        } catch (err) { printOutput("A client-side error occurred during delete operation.", "error"); console.error("Delete error:", err); }
    };

    const executeUpdate = async (filename, content) => {
        printOutput(`Updating ${filename}...`);
        try {
            const response = await fetch('api.php/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: filename, content: content }) });
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Update failed.'}`, 'error'); } 
            else { printOutput(result.data); printOutput("Reload the page to see function changes."); }
        } catch (err) { printOutput("Client-side error during update operation.", "error"); console.error("Update error:", err); }
    };

    const executeUpdateConfig = async (content) => {
        printOutput(`Updating config/config.php...`);
        try {
            const response = await fetch('api.php/update-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: content }) });
            const result = await response.json();
            if (!response.ok) { printOutput(`Error: ${result.error || 'Config update failed.'}`, 'error'); } 
            else { printOutput(result.data); }
        } catch (err) { printOutput("Client-side error during config update.", "error"); console.error("Config update error:", err); }
    };

    // --- AUTHORIZATION & STARTUP ---
    
    const printToLogin = (message, className = '') => {
        const line = document.createElement('div');
        line.className = `output-line ${className}`;
        line.textContent = message;
        loginOutput.appendChild(line);
        loginScreen.scrollTop = loginScreen.scrollHeight;
    };

    const handleLoginAttempt = async (commandString) => {
        const parts = commandString.split('<-');
        const command = parts[0]?.trim().toLowerCase();
        printToLogin(`$> ${commandString.replace(/::.*/, '::********')}`, 'command');
        if (command !== 'author') {
            printToLogin("Invalid command. Please use: author <- username::password", "error");
            return;
        }
        const credentials = parts[1]?.split('::', 2);
        const username = credentials[0]?.trim();
        const password = credentials[1]?.trim();
        if (!username || !password) {
            printToLogin("Invalid format. Please use: author <- username::password", "error");
            return;
        }
        try {
            const response = await fetch('auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (response.ok) {
                isAuthenticated = true;
                loginScreen.classList.add('hidden');
                terminal.classList.remove('hidden');
                document.title = "Web CLI";
                input.focus();
                printWelcomeMessage();
            } else {
                const result = await response.json();
                printToLogin(`Authentication failed: ${result.error || response.statusText}`, "error");
            }
        } catch (err) {
            printToLogin("Client-side error: Could not connect to the authentication service.", "error");
        }
    };
    
    const showLoginScreen = () => {
        const loginArt = `
    _                _
   | |              (_)
   | |    ___   __ _ _ _ __
   | |   / _ \\ / _\` | | '_ \\
   | |__| (_) | (_| | | | | |
   |_____\\___/ \\__, |_|_| |_|
                __/ |
               |___/
        `;
        printToLogin(loginArt);
        printToLogin("Authentication required.");
        printToLogin("Please log in using the format: author <- username::password");
        printToLogin("");
    };

    const initializeApp = async () => {
        try {
            const response = await fetch('status_check.php');
            const status = await response.json();
            if (status.auth_enabled) {
                showLoginScreen();
            } else {
                isAuthenticated = true;
                loginScreen.classList.add('hidden');
                terminal.classList.remove('hidden');
                document.title = "Web CLI";
                input.focus();
                printWelcomeMessage();
            }
        } catch (error) {
            printToLogin("Error: Could not contact the server to check status.", 'error');
            console.error("Status check failed:", error);
        }
    };

    // --- MAIN COMMAND HANDLER ---
    const handleCommand = async (commandString) => {
        if (!isAuthenticated) {
            await handleLoginAttempt(commandString);
            return;
        }
        
        if (terminalMode === 'db') {
            const dbResult = await DBMode.handleCommand(commandString);
            if (dbResult.status === 'exit') {
                terminalMode = 'normal';
                promptElement.textContent = '$>';
                printOutput("Exited database mode.");
            } else if (dbResult.status === 'promptChange') {
                promptElement.textContent = dbResult.newPrompt;
            }
            return;
        }

        const writeMatch = commandString.trim().match(/^write\s*<-\s*([\w\.\-]+)\s*<-\s*(.*)$/i);
        if (writeMatch) { const [_, filename, content] = writeMatch; printOutput(`$> ${commandString}`, 'command'); await executeWriteCommand(filename, content); return; }

        const appendMatch = commandString.trim().match(/^append\s*<-\s*([\w\.\-]+)\s*<-\s*(.*)$/i);
        if (appendMatch) { const [_, filename, content] = appendMatch; printOutput(`$> ${commandString}`, 'command'); await executeAppendCommand(filename, content); return; }

        const changeMatch = commandString.trim().match(/^change\s*<-\s*author\s*<-\s*(.*)$/i);
        if (changeMatch) {
            const credentials = changeMatch[1]?.split('::', 2);
            const username = credentials[0]?.trim();
            const password = credentials[1]?.trim();
            printOutput(`$> ${commandString.replace(/::.*/, '::********')}`, 'command');
            if (!username || !password) { printOutput("Invalid format. Use: change <- author <- username::password", "error"); } 
            else { await executeChangeAuthorCommand(username, password); }
            return;
        }
        
        let command = '', args = [];
        if (commandString.includes('<-')) { const parts = commandString.split('<-', 2); command = parts[0].trim().toLowerCase(); args = parts[1].trim().split(/\s+/).filter(arg => arg !== ''); } 
        else { command = commandString.trim().toLowerCase(); args = []; }
        if (!command) return;

        printOutput(`$> ${commandString}`, 'command');

        switch (command) {
            case 'help':
                printOutput("Available commands:\n  change <- author <- u::p - Changes the master login credentials. 🔥\n  db                - Enter database interaction mode. 💿\n  sysconfig         - Opens the main configuration file for editing. 🔥\n  list              - Lists functions and their source files.\n  listdir           - Lists all .php files in the functions folder.\n  edit <- <file>    - Opens a file in a pop-up text editor. ✏️\n  read <- <file>    - Displays the content of a PHP file. 📄\n  write <- <file> <- <content> - Writes content to a new PHP file. ⚠️\n  append <- <file> <- <content> - Appends content to an existing PHP file. ⚠️\n  upload            - Uploads a new .php function file. ⚠️\n  delete <- <file>  - Deletes a PHP file from the server. ☠️\n  ls-saves <- [zip] - Lists saved files, or contents of a saved zip. 📁\n  load              - Opens a dialog to load a saved log file. 📂\n  <function> <- ...params - Calls a function with parameters.\n  copy              - Copies terminal output to clipboard. 📋\n  save <- [folder]  - Saves output. If folder is given, saves as a .zip file. 💾\n  clear             - Clears the terminal screen.\n  exit / close      - Closes the terminal session. 👋\n  help              - Shows this help message.");
                printOutput("\nIn DB Mode:\n  json <- read <- <table> - Read all data from a table as raw JSON.\n  read <- <table>   - Read all data from a table.\n  del <- <table>    - Deletes a table (delete, drop also work). ☠️\n  drop view <- <view> - Deletes a database view. ☠️\n  backup <- <old> -> <new> - Backs up a database file.\n  download <- <file> - Downloads a database file. 💾\n  upload sql        - Upload and execute a .sql script. ⚠️\n  list db           - List all available databases.\n  list tbl          - List tables in the active database.\n  list view         - List all database views.\n  start <- <file>   - Start a session.\n  quit              - End the current session.\n  q <- \"<SQL>\"      - Execute a SQL query (qry, query also work).\n  exit / close      - Exit DB mode entirely.");
                break;
            case 'db':
                terminalMode = 'db';
                promptElement.textContent = '$db>';
                printOutput("Entered database mode. Use 'start <- <file.sqlite>' to begin a session, or 'quit' to end one.");
                break;
            case 'sysconfig':
                await openConfigEditor();
                break;
            case 'list':
                await executeListCommand();
                break;
            case 'listdir':
                await executeListDirCommand();
                break;
            case 'edit':
                if (args.length === 0) { printOutput("Error: No filename specified.", "error"); break; }
                await openEditorPopup(args[0]);
                break;
            case 'read':
                if (args.length === 0) { printOutput("Error: No filename specified.", "error"); break; }
                await executeCommand('read', args);
                break;
            case 'delete':
                if (args.length === 0) { printOutput("Error: No filename specified.", "error"); break; }
                await executeDeleteCommand(args[0]);
                break;
            case 'upload':
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.php';
                fileInput.onchange = async e => {
                    const file = e.target.files[0];
                    if (!file) { printOutput("File selection cancelled.", "error"); return; }
                    printOutput(`Uploading ${file.name}...`);
                    const formData = new FormData();
                    formData.append('uploadedFile', file);
                    try {
                        const response = await fetch('api.php/upload', { method: 'POST', body: formData });
                        const result = await response.json();
                        if (!response.ok) { printOutput(`Error: ${result.error || 'Upload failed.'}`, 'error'); } 
                        else { printOutput(result.data); printOutput("Reload the page to use the new function."); }
                    } catch (err) { printOutput("A client-side error occurred during upload.", "error"); console.error("Upload error:", err); }
                };
                fileInput.click();
                break;
            case 'clear':
                output.innerHTML = '';
                break;
            case 'copy':
                if (!output.innerText) { printOutput("Nothing to copy.", "error"); break; }
                try {
                    await navigator.clipboard.writeText(output.innerText);
                    printOutput("Output copied!");
                } catch (err) {
                    printOutput("Error: Could not copy.", "error");
                    console.error('Copy failed: ', err);
                }
                break;
            case 'save':
                const textToSave = output.innerText;
                if (!textToSave) { printOutput("Nothing to save.", "error"); break; }
                const folderName = args[0];
                const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
                const markdownContent = "```bash\n" + textToSave + "\n```";
                const logFileName = `terminal-log_${timestamp}.md`;
                const a = document.createElement('a');
                let blob, downloadFileName;
                if (folderName) {
                    const zip = new JSZip();
                    const internalFilePath = `${folderName}/${logFileName}`;
                    zip.file(internalFilePath, markdownContent);
                    blob = await zip.generateAsync({ type: "blob" });
                    downloadFileName = `${folderName}.zip`;
                    if (!savedArchives[downloadFileName]) savedArchives[downloadFileName] = [];
                    savedArchives[downloadFileName].push(internalFilePath);
                } else {
                    blob = new Blob([markdownContent], { type: 'text/markdown' });
                    downloadFileName = logFileName;
                    savedSingleFiles.push(downloadFileName);
                }
                const url = URL.createObjectURL(blob);
                a.href = url;
                a.download = downloadFileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                printOutput(`Output saved to ${downloadFileName}`);
                break;
            case 'ls-saves':
                const archiveName = args[0];
                if (archiveName) {
                    if (savedArchives[archiveName]) {
                        printOutput(`Contents of ${archiveName}:\n` + savedArchives[archiveName].join('\n'));
                    } else {
                        printOutput(`Error: Archive '${archiveName}' not found in this session's history.`, "error");
                    }
                } else {
                    const allSaves = [...savedSingleFiles, ...Object.keys(savedArchives)];
                    if (allSaves.length === 0) { printOutput("No files have been saved in this session."); } 
                    else { printOutput("Files and archives saved in this session:\n" + allSaves.join('\n')); }
                }
                break;
            case 'load':
                const loadInput = document.createElement('input');
                loadInput.type = 'file';
                loadInput.accept = '.md,.txt';
                loadInput.onchange = e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = readerEvent => {
                        const content = readerEvent.target.result;
                        const cleanedContent = content.replace(/^```bash\n|```$/g, '');
                        printOutput(`\n--- Loading content from ${file.name} ---`);
                        printOutput(cleanedContent);
                        printOutput(`--- End of loaded file ---`);
                    };
                    reader.readAsText(file, 'UTF-8');
                };
                loadInput.click();
                break;
            case 'close':
            case 'exit':
                terminal.innerHTML = '<div class="exit-message">Session closed.</div>';
                break;
            default:
                await executeCommand(command, args);
                break;
        }
    };

    // --- EVENT LISTENERS ---
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const command = input.value.trim(); input.value = ''; if (command) handleCommand(command); } });
    loginInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const command = loginInput.value.trim(); loginInput.value = ''; if (command) handleCommand(command); } });
    terminal.addEventListener('click', () => { const currentInput = document.getElementById('input'); if (currentInput) { currentInput.focus(); } });
    document.addEventListener('promptchange', (e) => { promptElement.textContent = e.detail.newPrompt; });
    
    initializeApp();
});