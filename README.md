Of course. Here is a complete `README.md` file for the WebCLI project, including a detailed user command guideline.

-----

# WebCLI - A Browser-Based PHP & Database Terminal

### Introduction

WebCLI is a powerful, browser-based command-line interface designed for development environments. It provides a terminal in your web browser to directly interact with a PHP backend, allowing you to manage PHP function files and SQLite databases on the fly without needing SSH or a desktop client.

This tool is built with a vanilla JavaScript frontend, a modular RESTful PHP backend, and a dedicated PHP API for database interactions, making it a lightweight but feature-rich solution for server-side development and management.

-----

### ⚠️ Critical Security Warning

This application is designed as a powerful tool for **trusted local development environments only**. It provides direct, unauthenticated (by default) access to the server's file system (within specific folders) and allows for the execution of raw SQL queries.

**DO NOT deploy this application on a public or production server.** Doing so would create critical security vulnerabilities, allowing any user to:

  * Read, write, edit, and delete executable PHP files.
  * View and modify sensitive data in configuration files.
  * Read, write, backup, and delete entire databases.
  * Change the application's own login credentials.
  * Take full control of your server.

-----

### \#\# Key Features

  * **Conditional Authorization:** The application is open by default but can be secured by creating a `.env` file with hashed user and master credentials.
  * **PHP File Management:**
      * Dynamically lists all user-defined PHP functions and their source files (`list`).
      * Includes a full file manager to `listdir`, `read`, `write`, `append`, and `delete` `.php` files in the `/functions` directory.
      * `upload` new function files directly from your computer.
  * **Interactive Pop-up Editor:**
      * `edit` any file in the `/functions` directory using a clean, pop-up text editor with keyboard shortcuts.
      * `sysconfig` command provides a direct shortcut to edit the `config/config.php` file.
  * **Full Database Management (DB Mode):**
      * Connect to and create multiple SQLite databases on the fly.
      * Session-based interaction (`start`, `quit`) with a dynamic prompt showing the active database.
      * Full CRUD and DDL support via the `q` (`query`) command to execute any SQL.
      * Convenience commands like `list db`, `list tbl`, `list view`, `read <table>`, and `drop <table>`.
      * Manage database files with `backup`, `download`, and `delete` commands.
      * `upload sql` to execute `.sql` scripts with an upload progress bar and stage-by-stage execution log.
  * **Terminal Utilities:**
      * Comprehensive `help` command with mode-specific instructions.
      * `save`/`load` session history to and from local markdown files.
      * `copy` terminal output to the clipboard.
      * Standard `clear` and `exit` commands.

-----

### \#\# Installation & Setup

1.  **File Structure:** Ensure your project has the following directory structure. The `database` and `config` folders must be created manually.

    ```
    /web-terminal/
    ├── config/
    │   └── config.php         (Your system config)
    ├── database/              (SQLite databases will be stored here)
    ├── functions/
    │   ├── add.php            (Example function)
    │   └── sayHello.php       (Example function)
    ├── .env                   (Optional, for authentication)
    ├── .gitignore
    ├── api.php
    ├── auth.php
    ├── database_api.php
    ├── database.js
    ├── download_db.php
    ├── editor.html
    ├── editor.js
    ├── hash_password.php
    ├── index.html
    ├── script.js
    └── style.css
    ```

2.  **(Optional) Enable Authentication:**

      * To secure the terminal, first generate a hashed password by running `php hash_password.php 'your-password'` from your real command line.
      * Create a `.env` file in the project root and add your credentials:
        ```
        APP_USER="admin"
        APP_PASSWORD="your_generated_hash_here"
        MASTER_USER="master"
        MASTER_PASSWORD="your_master_hash_here"
        ```
      * If the `.env` file is not present, the application will run without any login screen.

3.  **Run the Server:**

      * Navigate to the project's root directory in your command line.
      * Start the PHP built-in web server:
        ```bash
        php -S localhost:8000
        ```
      * Open `http://localhost:8000` in your web browser.

-----

### \#\# User Command Guideline

The terminal operates using a `command <- arguments` syntax for most operations.

### Normal Mode Commands (`$>`)

| Command | Syntax | Description |
| :--- | :--- | :--- |
| **help** | `help` | Displays the list of all available commands. |
| **db** | `db` | Enters the dedicated database interaction mode. 💿 |
| **sysconfig**| `sysconfig` | Shortcut to edit the `config/config.php` file. 🔥 |
| **change**| `change <- author <- user::pass` | Changes the `APP_USER` credentials in the `.env` file. 🔥 |
| **list** | `list` | Displays a table of all active functions and their source files. |
| **listdir** | `listdir` | Displays a detailed table of all `.php` files in the `/functions` folder. |
| **read** | `read <- <file.php>` | Displays the content of a file from the `/functions` folder. |
| **write** | `write <- <file.php> <- <content>` | Creates a new file in `/functions`. Fails if the file or function already exists. ⚠️ |
| **append**| `append <- <file.php> <- <content>` | Appends content to an existing file in `/functions`. ⚠️ |
| **edit** | `edit <- <file.php>` | Opens a file from `/functions` in a pop-up text editor. ✏️ |
| **upload** | `upload` | Opens a file dialog to upload a new `.php` file to `/functions`. ⚠️ |
| **delete** | `delete <- <file.php>` | Deletes a file from the `/functions` folder. ☠️ |
| **save** | `save` or `save <- <folder>` | Saves terminal history to a `.md` file. With a folder name, saves as a `.zip`. |
| **load** | `load` | Opens a file dialog to load a saved log file into the view. |
| **ls-saves**| `ls-saves` or `ls-saves <- <archive>` | Lists saved files/archives from the session, or the contents of a saved archive. |
| **copy** | `copy` | Copies the entire terminal output to the clipboard. |
| **clear** | `clear` | Clears the terminal screen. |
| **exit** | `exit` or `close` | Closes the terminal session. 👋 |

### Database Mode Commands (`$db>`)

Enter this mode by typing `db`. Most commands require an active session started with `start`.

| Command | Syntax | Description |
| :--- | :--- | :--- |
| **start** | `start <- <database.sqlite>` | Starts a session with a database, creating it if it doesn't exist. Changes prompt. |
| **list db** | `list db` | Displays a detailed table of all `.sqlite` files in the `/database` folder. |
| **list tbl** | `list tbl` | Lists all tables in the active database. |
| **list view**| `list view` | Lists all views in the active database. |
| **q** | `q <- "<SQL query>"` | Executes any valid SQL query. `qry` and `query` are aliases. |
| **read** | `read <- <table_or_view>` | Shortcut for `q <- "SELECT * FROM <name>"`. |
| **json** | `json <- read <- <table>` | Reads a table and displays the raw JSON output instead of a formatted table. |
| **drop** | `drop <- <table>` | Deletes a table. Asks for confirmation. `del` and `delete` are aliases. ☠️ |
| **drop view**| `drop view <- <view>` | Deletes a database view. Asks for confirmation. ☠️ |
| **upload sql**|`upload sql` | Uploads and executes a `.sql` script with a progress bar. ⚠️ |
| **download**| `download <- <database.sqlite>` | Downloads the specified database file. 💾 |
| **backup** | `backup <- <old.sqlite> -> <new.sqlite>` | Creates a copy of a database file on the server. |
| **delete** | `delete <- <database.sqlite>` | Permanently deletes a database file. Asks for confirmation. `del` and `drop` are aliases. ☠️ |
| **quit** | `quit` | Ends the current database session and returns to the `$db>` prompt. |
| **exit** | `exit` or `close` | Exits database mode entirely and returns to the normal `$>` prompt. |