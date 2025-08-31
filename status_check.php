<?php
// Set the content type to JSON for the response
header('Content-Type: application/json');

// Define the path to the environment file
$env_path = __DIR__ . '/.env';

/**
 * Check if the .env file exists to determine the auth mode.
 * This allows the frontend to know whether to show a login screen
 * or load the terminal directly.
 */
if (file_exists($env_path)) {
    // If the file exists, authorization is required.
    echo json_encode(['auth_enabled' => true]);
} else {
    // If the file does not exist, the application runs without authorization.
    echo json_encode(['auth_enabled' => false]);
}