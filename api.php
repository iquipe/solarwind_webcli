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

// Set the content type for all valid responses
header('Content-Type: application/json');

// --- HELPER FUNCTION to send a JSON error response ---
function send_error(int $statusCode, string $message): void {
    http_response_code($statusCode);
    echo json_encode(['error' => $message]);
    exit;
}

// --- SETUP ---
$functionsDir = __DIR__ . '/functions';
$configFile = __DIR__ . '/config/config.php';

if (is_dir($functionsDir)) {
    // Include all existing function files
    foreach (glob($functionsDir . '/*.php') as $file) {
        require_once $file;
    }
}

// --- ROUTING ---
// Get the requested command from the URL path, e.g., "api.php/list" -> "list"
$path = trim($_SERVER['PATH_INFO'] ?? '', '/');
$parts = explode('/', $path);
$command = $parts[0] ?? null;

if (empty($command)) {
    send_error(400, 'No command specified. Try /list to see available functions.');
}

// --- CONTROLLER ---
try {
    // --- CONFIG FILE ENDPOINTS ---
    if ($command === 'read-config') {
        if (!file_exists($configFile)) { send_error(404, "Configuration file not found."); }
        echo json_encode(['data' => file_get_contents($configFile)]);
        exit;
    }

    if ($command === 'update-config') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { send_error(405, 'Method Not Allowed.'); }
        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['content'])) { send_error(400, 'Bad Request. "content" is required.'); }
        if (!is_writable($configFile)) { send_error(500, "Configuration file is not writable. Check permissions."); }
        if (file_put_contents($configFile, $input['content']) === false) { send_error(500, "Failed to update config file."); }
        echo json_encode(['data' => "Successfully updated config/config.php."]);
        exit;
    }

    // --- LIST (FUNCTIONS) ENDPOINT ---
    if ($command === 'list') {
        $defined = get_defined_functions();
        $userFunctions = array_filter($defined['user'], fn($fn) => $fn !== 'send_error');
        sort($userFunctions);
        
        $functionDetails = [];
        foreach ($userFunctions as $func) {
            try {
                $reflection = new ReflectionFunction($func);
                $functionDetails[] = [
                    'function' => $func,
                    'filename' => basename($reflection->getFileName())
                ];
            } catch (ReflectionException $e) { /* Ignore internal functions */ }
        }
        echo json_encode(['data' => $functionDetails]);
        exit;
    }

    // --- LISTDIR (FILES) ENDPOINT ---
    if ($command === 'listdir') {
        $files = glob($functionsDir . '/*.php');
        $fileDetails = [];
        foreach ($files as $file) {
            $fileDetails[] = [
                'filename' => basename($file),
                'size'     => filesize($file),
                'created'  => date("Y-m-d H:i:s", filectime($file)),
                'modified' => date("Y-m-d H:i:s", filemtime($file))
            ];
        }
        echo json_encode(['data' => $fileDetails]);
        exit;
    }

    // --- READ ENDPOINT ---
    if ($command === 'read') {
        $filename = basename($_GET['p0'] ?? '');
        if (empty($filename)) { send_error(400, 'No filename specified.'); }
        $filepath = $functionsDir . '/' . $filename;
        if (!file_exists($filepath)) { send_error(404, "File not found: {$filename}"); }
        echo json_encode(['data' => file_get_contents($filepath)]);
        exit;
    }

    // --- UPLOAD ENDPOINT ---
    if ($command === 'upload') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { send_error(405, 'Method Not Allowed. Uploads must be POST.'); }
        if (!isset($_FILES['uploadedFile']) || $_FILES['uploadedFile']['error'] !== UPLOAD_ERR_OK) { send_error(400, 'File upload error.'); }
        $file = $_FILES['uploadedFile'];
        $filename = basename($file['name']);
        if (pathinfo($filename, PATHINFO_EXTENSION) !== 'php') { send_error(400, 'Invalid file type. Only .php files are allowed.'); }
        $destination = $functionsDir . '/' . $filename;
        if (file_exists($destination)) { send_error(409, "Conflict: File named '{$filename}' already exists."); }
        if (move_uploaded_file($file['tmp_name'], $destination)) { echo json_encode(['data' => "Successfully uploaded {$filename}."]); } else { send_error(500, 'Failed to save uploaded file.'); }
        exit;
    }
    
    // --- WRITE ENDPOINT ---
    if ($command === 'write') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { send_error(405, 'Method Not Allowed. Write must be POST.'); }
        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['file']) || !isset($input['content'])) { send_error(400, 'Bad Request. "file" and "content" are required.'); }
        $filename = basename($input['file']);
        if (pathinfo($filename, PATHINFO_EXTENSION) !== 'php') { send_error(400, 'Invalid file type. Only .php files are allowed.'); }
        $functionNameToTest = pathinfo($filename, PATHINFO_FILENAME);
        $destination = $functionsDir . '/' . $filename;
        if (function_exists($functionNameToTest)) { send_error(409, "Conflict: A function named '{$functionNameToTest}' already exists."); }
        if (file_exists($destination)) { send_error(409, "Conflict: A file named '{$filename}' already exists."); }
        if (file_put_contents($destination, $input['content']) === false) { send_error(500, "Failed to write to file {$filename}."); }
        echo json_encode(['data' => "Wrote " . strlen($input['content']) . " bytes to {$filename}."]);
        exit;
    }

    // --- UPDATE ENDPOINT ---
    if ($command === 'update') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { send_error(405, 'Method Not Allowed.'); }
        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['file']) || !isset($input['content'])) { send_error(400, 'Bad Request. "file" and "content" are required.'); }
        $filename = basename($input['file']);
        $destination = $functionsDir . '/' . $filename;
        if (!file_exists($destination)) { send_error(404, "File not found: {$filename}. Cannot update a non-existent file."); }
        if (file_put_contents($destination, $input['content']) === false) { send_error(500, "Failed to update file {$filename}. Check server permissions."); }
        echo json_encode(['data' => "Successfully updated {$filename}."]);
        exit;
    }

    // --- APPEND ENDPOINT ---
    if ($command === 'append') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { send_error(405, 'Method Not Allowed. Append must be POST.'); }
        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['file']) || !isset($input['content'])) { send_error(400, 'Bad Request. "file" and "content" are required.'); }
        $filename = basename($input['file']);
        $destination = $functionsDir . '/' . $filename;
        if (!file_exists($destination)) { send_error(404, "File not found: {$filename}."); }
        $contentToAppend = "\n" . $input['content'];
        if (file_put_contents($destination, $contentToAppend, FILE_APPEND | LOCK_EX) === false) { send_error(500, "Failed to append to file {$filename}."); }
        echo json_encode(['data' => "Appended " . strlen($contentToAppend) . " bytes to {$filename}."]);
        exit;
    }

    // --- DELETE ENDPOINT ---
    if ($command === 'delete') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { send_error(405, 'Method Not Allowed. Delete must be POST.'); }
        $input = json_decode(file_get_contents('php://input'), true);
        if (!isset($input['file'])) { send_error(400, 'Bad Request. "file" is required.'); }
        $filename = basename($input['file']);
        $filepath = $functionsDir . '/' . $filename;
        if (!file_exists($filepath)) { send_error(404, "File not found: {$filename}"); }
        if (unlink($filepath)) { echo json_encode(['data' => "Successfully deleted {$filename}."]); } else { send_error(500, "Failed to delete file {$filename}."); }
        exit;
    }

    // --- DEFAULT: EXECUTE A DYNAMIC FUNCTION ---
    if (!function_exists($command)) {
        send_error(404, "Function or command '{$command}' not found.");
    }

    $params = $_GET;
    ksort($params);
    $args = array_values($params);
    $result = $command(...$args);
    echo json_encode(['data' => $result]);

} catch (ArgumentCountError $e) {
    send_error(400, "Incorrect number of arguments for function '{$command}'.");
} catch (Throwable $e) {
    send_error(500, "An internal server error occurred: " . $e->getMessage());
}