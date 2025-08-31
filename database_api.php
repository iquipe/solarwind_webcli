<?php
// Protect the API endpoint only if authorization is enabled
if (file_exists(__DIR__ . '/.env')) {
    session_start();
    if (empty($_SESSION['is_authenticated'])) {
        header('Content-Type: application/json');
        http_response_code(401); // Unauthorized
        echo json_encode(['error' => 'Authentication required.']);
        exit;
    }
}

// Set headers for JSON response
header('Content-Type: application/json');

// --- HELPER FUNCTION to send a JSON error response ---
function send_db_error(int $statusCode, string $message, ?string $sqlState = null): void {
    http_response_code($statusCode);
    $error = ['error' => $message];
    if ($sqlState) {
        $error['sqlstate'] = $sqlState;
    }
    echo json_encode($error);
    exit;
}

// --- PROCESS REQUEST (handles both JSON and multipart/form-data) ---
$input = [];
// Check for multipart form data first (used for uploads)
if (isset($_POST['command'])) {
    $input = $_POST;
} else {
    // Fallback to JSON body for other requests
    $json_input = json_decode(file_get_contents('php://input'), true);
    if (is_array($json_input)) {
        $input = $json_input;
    }
}

$command = $input['command'] ?? null;
$db_dir = __DIR__ . '/database/';

// --- COMMANDS THAT DON'T REQUIRE A DATABASE NAME ---
if ($command === 'list-db') {
    $files = glob($db_dir . '/*.sqlite');
    $db_details = [];
    foreach ($files as $file) {
        $db_details[] = [
            'dbname'    => basename($file),
            'size'      => filesize($file),
            'created'   => date("Y-m-d H:i:s", filectime($file)),
            'modified'  => date("Y-m-d H:i:s", filemtime($file))
        ];
    }
    echo json_encode(['data' => $db_details]);
    exit;
}

if ($command === 'backup-db') {
    if (!isset($input['source_db']) || !isset($input['dest_db'])) {
        send_db_error(400, 'Bad Request. "source_db" and "dest_db" are required.');
    }
    $source_filename = basename($input['source_db']);
    $dest_filename = basename($input['dest_db']);

    if (pathinfo($source_filename, PATHINFO_EXTENSION) !== 'sqlite' || pathinfo($dest_filename, PATHINFO_EXTENSION) !== 'sqlite') {
        send_db_error(400, 'Invalid file type. Both source and destination must be .sqlite files.');
    }

    $source_path = $db_dir . $source_filename;
    $dest_path = $db_dir . $dest_filename;

    if (!file_exists($source_path)) { send_db_error(404, "Source database '{$source_filename}' not found."); }
    if (file_exists($dest_path)) { send_db_error(409, "Conflict: Destination file '{$dest_filename}' already exists."); }

    if (copy($source_path, $dest_path)) {
        echo json_encode(['data' => "Successfully backed up '{$source_filename}' to '{$dest_filename}'."]);
    } else {
        send_db_error(500, "Failed to create backup. Check server permissions.");
    }
    exit;
}

// All subsequent commands require a database filename
if (!isset($input['database'])) {
    send_db_error(400, 'Bad Request. A "database" filename is required.');
}

// --- SECURITY: Sanitize the filename ---
$db_filename = basename($input['database']);
if (pathinfo($db_filename, PATHINFO_EXTENSION) !== 'sqlite') {
    send_db_error(400, 'Invalid database file. Only .sqlite files are permitted.');
}
$db_path = $db_dir . $db_filename;

// --- COMMANDS THAT REQUIRE A VALIDATED PATH BUT NOT A FULL CONNECTION ---
if ($command === 'delete-db') {
    if (!file_exists($db_path)) {
        send_db_error(404, "File not found: {$db_filename}");
    }
    if (unlink($db_path)) {
        echo json_encode(['data' => "Successfully deleted database '{$db_filename}'."]);
    } else {
        send_db_error(500, "Failed to delete database '{$db_filename}'. Check server permissions.");
    }
    exit;
}

// --- DATABASE CONNECTION (DYNAMIC) ---
try {
    $pdo = new PDO('sqlite:' . $db_path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    send_db_error(500, "Database connection failed for '{$db_filename}': " . $e->getMessage());
}

// --- COMMAND ROUTER (for commands requiring a connection) ---
try {
    if ($command === 'upload-sql') {
        if (!isset($_FILES['sqlFile']) || $_FILES['sqlFile']['error'] !== UPLOAD_ERR_OK) { send_db_error(400, 'File upload error. No .sql file received or upload failed.'); }
        $file = $_FILES['sqlFile'];
        if (pathinfo($file['name'], PATHINFO_EXTENSION) !== 'sql') { send_db_error(400, 'Invalid file type. Only .sql files are allowed.'); }
        $sql_content = file_get_contents($file['tmp_name']);
        if ($sql_content === false) { send_db_error(500, 'Could not read the uploaded SQL file.'); }
        
        $statements = array_filter(array_map('trim', explode(';', $sql_content)));
        $execution_log = [];
        $pdo->beginTransaction();

        foreach ($statements as $statement) {
            try {
                $affected_rows = $pdo->exec($statement);
                $execution_log[] = [ 'status' => 'success', 'sql' => $statement, 'message' => "{$affected_rows} row(s) affected." ];
            } catch (PDOException $e) {
                $execution_log[] = [ 'status' => 'error', 'sql' => $statement, 'message' => $e->getMessage() ];
                $pdo->rollBack();
                echo json_encode(['data' => $execution_log]);
                exit;
            }
        }
        $pdo->commit();
        echo json_encode(['data' => $execution_log]);
        exit;
    }

    if ($command === 'list-tbl') {
        $query = "SELECT name AS table_name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;";
        $stmt = $pdo->query($query);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['data' => $results]);
        exit;
    }

    if ($command === 'list-views') {
        $query = "SELECT name AS view_name FROM sqlite_master WHERE type='view' ORDER BY name;";
        $stmt = $pdo->query($query);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['data' => $results]);
        exit;
    }

    if ($command === 'start') {
        echo json_encode(['data' => "Database session started with '{$db_filename}'. File created if it did not exist."]);
        exit;
    }

    // Default to SQL execution
    if (!isset($input['query'])) { send_db_error(400, 'Bad Request. A "query" is required.'); }
    $query = trim($input['query']);
    $command_type = strtoupper(strtok($query, " \n\t"));

    if (in_array($command_type, ['SELECT', 'PRAGMA', 'EXPLAIN'])) {
        $stmt = $pdo->query($query);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['data' => $results]);
    } else {
        $affected_rows = $pdo->exec($query);
        echo json_encode(['data' => "Success. {$affected_rows} row(s) affected."]);
    }
} catch (PDOException $e) {
    send_db_error(400, $e->getMessage(), $e->getCode());
}