<?php
session_start();
header('Content-Type: application/json');

/**
 * A simple .env file parser.
 * @return array The parsed environment variables.
 */
function parseEnv(): array {
    $env_path = __DIR__ . '/.env';
    if (!file_exists($env_path)) {
        return [];
    }
    $lines = file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        list($key, $value) = explode('=', $line, 2);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        $env[trim($key)] = $value;
    }
    return $env;
}

if (!file_exists(__DIR__ . '/.env')) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Authorization is not enabled on this server.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['username']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Username and password are required.']);
    exit;
}

// Load all credentials from the .env file
$env = parseEnv();
$app_user = $env['APP_USER'] ?? null;
$app_hash = $env['APP_PASSWORD'] ?? null;
$master_user = $env['MASTER_USER'] ?? null;
$master_hash = $env['MASTER_PASSWORD'] ?? null;

if (!$app_user || !$app_hash) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server is not configured correctly. APP_USER or APP_PASSWORD missing.']);
    exit;
}

// --- MODIFIED: Verify credentials against both regular and master accounts ---
$login_successful = false;

// Check regular user
if ($input['username'] === $app_user && password_verify($input['password'], $app_hash)) {
    $login_successful = true;
}
// Check master user (if defined)
elseif ($master_user && $master_hash && $input['username'] === $master_user && password_verify($input['password'], $master_hash)) {
    $login_successful = true;
}

if ($login_successful) {
    // --- SUCCESS ---
    $_SESSION['is_authenticated'] = true;
    echo json_encode(['success' => true]);
} else {
    // --- FAILURE ---
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid credentials.']);
}